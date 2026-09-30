import { create } from 'zustand'
import { api, getToken, setToken, onSesionVencida } from './api'

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
    set({ usuario: null, debeCambiarPassword: false, iniciando: false, aviso })
  },
}))

onSesionVencida(() => useAuth.getState().logout('Tu sesión venció. Ingresá de nuevo.'))
