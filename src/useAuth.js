import { create } from 'zustand'
import { api, getToken, setToken, onSesionVencida } from './api'

// La máquina del mostrador tiene que quedar abierta siempre: cada 6 horas se
// renueva el token para que nunca venza mientras la app esté prendida, y el
// token de la caja dura un año igualmente.
const RENOVAR_CADA_MS = 6 * 60 * 60 * 1000

export const useAuth = create((set) => ({
  usuario: null,
  debeCambiarPassword: false,
  // true mientras se valida con la API una sesión guardada
  iniciando: Boolean(getToken()),
  aviso: '',

  // Se llama al abrir la app: si hay un token guardado, confirma que sigue siendo válido
  async iniciar() {
    if (!getToken()) return set({ iniciando: false })
    try {
      const { usuario, debeCambiarPassword } = await api('/auth/me')
      set({ usuario, debeCambiarPassword, iniciando: false })
      renovarAhora()
    } catch {
      setToken(null)
      set({ usuario: null, iniciando: false })
    }
  },

  async login(usuario, password) {
    const datos = await api('/auth/login', {
      metodo: 'POST',
      cuerpo: { usuario, password },
      sinToken: true,
    })
    setToken(datos.token)
    set({
      usuario: datos.usuario,
      debeCambiarPassword: datos.debeCambiarPassword,
      aviso: '',
    })
    renovarAhora()
  },

  async cambiarPassword(actual, nueva) {
    const datos = await api('/auth/cambiar-password', {
      metodo: 'POST',
      cuerpo: { actual, nueva },
    })
    // La API devuelve un token nuevo porque el anterior queda anulado
    setToken(datos.token)
    set({ debeCambiarPassword: false })
  },

  // También es lo que hace el botón "Cambiar de cuenta"
  logout(aviso = '') {
    setToken(null)
    clearInterval(timer)
    set({ usuario: null, debeCambiarPassword: false, iniciando: false, aviso })
  },
}))

let timer = 0

// Pide un token nuevo con la misma sesión. Si el servidor no responde no pasa
// nada: el token actual sigue sirviendo hasta que venza.
async function renovarAhora() {
  clearInterval(timer)
  try {
    const { token } = await api('/auth/renovar', { metodo: 'POST' })
    setToken(token)
  } catch {
    /* se reintenta en la próxima vuelta */
  }
  timer = setInterval(() => {
    renovarAhora()
  }, RENOVAR_CADA_MS)
}

onSesionVencida(() => useAuth.getState().logout('Tu sesión venció. Ingresá de nuevo.'))
