// Clave del equipo del local. Se genera una sola vez en la máquina y queda
// guardada en IndexedDB. La privada se guarda como clave no exportable, así no
// se puede leer desde JavaScript ni copiar a mano. El servidor solo conoce la
// pública, y con eso verifica que cada marca de asistencia salga de este equipo.

const NOMBRE_DB = 'lattecito-equipo'
const ALMACEN = 'claves'
const CLAVE = 'equipo'

let cache = null

function abrir() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(NOMBRE_DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(ALMACEN)) req.result.createObjectStore(ALMACEN)
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

function conAlmacen(modo, fn) {
  return abrir().then(
    (db) =>
      new Promise((res, rej) => {
        const tx = db.transaction(ALMACEN, modo)
        const pedido = fn(tx.objectStore(ALMACEN))
        tx.oncomplete = () => res(pedido?.result)
        tx.onerror = () => rej(tx.error)
        tx.onabort = () => rej(tx.error)
      })
  )
}

const aBase64 = (buf) => {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

// WebCrypto exige contexto seguro (https o localhost). En la máquina del local
// con la app en localhost, o en el front en https, funciona.
export const disponible = () =>
  typeof indexedDB !== 'undefined' && Boolean(globalThis.crypto?.subtle)

export async function leerEquipo() {
  if (cache) return cache
  try {
    cache = (await conAlmacen('readonly', (s) => s.get(CLAVE))) ?? null
  } catch {
    cache = null
  }
  return cache
}

export const hayEquipo = async () => Boolean(await leerEquipo())

async function guardarEquipo(datos) {
  cache = datos
  await conAlmacen('readwrite', (s) => s.put(datos, CLAVE))
}

// Genera el par de claves. Se exporta una vez para re-importar la privada como
// no exportable, así después no se puede volcar el secreto.
export async function crearClaves() {
  const temporal = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )
  const spki = await crypto.subtle.exportKey('spki', temporal.publicKey)
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', temporal.privateKey)
  const clavePrivada = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  return { clavePrivada, publicaB64: aBase64(spki) }
}

export async function vincularEquipo({ equipoId, nombre, clavePrivada, publicaB64 }) {
  await guardarEquipo({ equipoId, nombre, clavePrivada, publicaB64 })
}

// El texto tiene que ser idéntico al que arma el servidor
export function mensajeAsistencia({ nonce, equipoId, usuarioId, tipo }) {
  return ['lattecito-asistencia-v1', nonce, String(equipoId), String(usuarioId), tipo].join('|')
}

export async function firmar(mensaje) {
  const equipo = await leerEquipo()
  if (!equipo?.clavePrivada) throw new Error('Este equipo no está vinculado')
  const firma = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    equipo.clavePrivada,
    new TextEncoder().encode(mensaje)
  )
  return aBase64(firma)
}

export async function olvidarEquipo() {
  cache = null
  await conAlmacen('readwrite', (s) => s.delete(CLAVE))
}
