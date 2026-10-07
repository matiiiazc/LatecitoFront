const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const CLAVE_TOKEN = 'lattecito_token'

// La sesión queda guardada aunque se cierre el navegador: en el mostrador la
// máquina tiene que amanecer abierta. El botón de cambiar de cuenta la borra.
export const getToken = () => localStorage.getItem(CLAVE_TOKEN)
export const setToken = (token) =>
  token ? localStorage.setItem(CLAVE_TOKEN, token) : localStorage.removeItem(CLAVE_TOKEN)

let alVencerSesion = () => {}
export const onSesionVencida = (fn) => {
  alVencerSesion = fn
}

export class ApiError extends Error {
  constructor(mensaje, estado, codigo, datos) {
    super(mensaje)
    this.estado = estado
    this.codigo = codigo
    // El cuerpo completo, para cuando el servidor manda detalles del error
    // (por ejemplo, cuánto se esperaba en la gaveta al cerrarla)
    this.datos = datos
  }
}

export async function api(ruta, { metodo = 'GET', cuerpo, sinToken = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = sinToken ? null : getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let respuesta
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0)
  }

  const datos = await respuesta.json().catch(() => ({}))

  if (!respuesta.ok) {
    // 401 con un token guardado = la sesión venció o dejó de ser válida
    if (respuesta.status === 401 && token) alVencerSesion()
    throw new ApiError(datos.error ?? 'Ocurrió un error', respuesta.status, datos.codigo, datos)
  }
  return datos
}
