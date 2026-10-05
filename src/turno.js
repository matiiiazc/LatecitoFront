import { create } from 'zustand'
import { api } from './api'
import { firmar, mensajeAsistencia, leerEquipo } from './equipo'

// El turno de caja es el corazón del mostrador: quién atiende, cuánto vendió y
// cómo cerró la gaveta. Vive en un store para que el Inicio, el menú lateral y la
// pantalla de caja muestren siempre lo mismo sin volver a pegarle a la API.
//
// Abrir y cerrar exigen la firma de la máquina del local, así que el teléfono de
// cualquiera no sirve para marcar.

const mensaje = (equipoId, usuarioId, nonce, tipo) =>
  mensajeAsistencia({ nonce, equipoId, usuarioId, tipo })

// El nonce se pide, se firma y se usa enseguida. Si algo falla hay que pedir
// uno nuevo, porque cada desafío se gasta al usarlo.
async function pedirFirma(equipoId, usuarioId, tipo) {
  const { nonce } = await api('/asistencia/desafio', { metodo: 'POST' })
  return { nonce, firma: await firmar(mensaje(equipoId, usuarioId, nonce, tipo)) }
}

export const useTurno = create((set, get) => ({
  turno: null,
  perfiles: [],
  cargando: true,
  cargado: false,

  async cargar() {
    try {
      const { turno } = await api('/turnos/actual')
      set({ turno, cargando: false, cargado: true })
    } catch {
      // Si el server no responde, no se pisa lo que ya se estaba mostrando
      set({ cargando: false, cargado: true })
    }
  },

  async cargarPerfiles() {
    if (get().perfiles.length > 0) return
    set({ perfiles: await api('/turnos/perfiles') })
  },

  async abrir(usuarioId, baseEfectivo) {
    const equipo = await leerEquipo()
    if (!equipo?.equipoId) throw new Error('Esta máquina todavía no está vinculada')
    const { nonce, firma } = await pedirFirma(equipo.equipoId, usuarioId, 'entrada')
    const r = await api('/turnos/abrir', {
      metodo: 'POST',
      cuerpo: {
        usuario_id: usuarioId,
        equipo_id: equipo.equipoId,
        base_efectivo: baseEfectivo,
        nonce,
        firma,
      },
    })
    set({ turno: r.turno })
    return r.turno
  },

  async cerrar(usuarioId, contadoEfectivo, nota) {
    const equipo = await leerEquipo()
    if (!equipo?.equipoId) throw new Error('Esta máquina todavía no está vinculada')
    const { nonce, firma } = await pedirFirma(equipo.equipoId, usuarioId, 'salida')
    const r = await api('/turnos/cerrar', {
      metodo: 'POST',
      cuerpo: {
        usuario_id: usuarioId,
        equipo_id: equipo.equipoId,
        contado_efectivo: contadoEfectivo,
        nota,
        nonce,
        firma,
      },
    })
    set({ turno: null })
    return r
  },
}))

// El nombre de quien atiende, o null si no hay turno abierto
export const nombreTurno = (turno) => turno?.usuario ?? null
