import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Login from './pages/Login'
import CambiarPassword from './pages/CambiarPassword'
import NuevaComanda from './pages/NuevaComanda'
import Stock from './pages/Stock'
import Productos from './pages/Productos'
import Resumenes from './pages/Resumenes'
import Ganancias from './pages/Ganancias'
import Asistencia from './pages/Asistencia'
import { useAuth } from './useAuth'
import PantallaError from './components/PantallaError'

const VISTAS = [
  'inicio',
  'nueva',
  'stock',
  'productos',
  'resumenes',
  'ganancias',
  'asistencia',
  'password',
]

// En modo kiosco la app se abre con la ruta ya puesta (por ejemplo /asistencia),
// así la máquina del local arranca directo en la pantalla de marcar.
function vistaInicial() {
  const ruta = window.location.pathname.replace(/^\/+|\/+$/g, '')
  return VISTAS.includes(ruta) ? ruta : 'inicio'
}

export default function App() {
  const usuario = useAuth((s) => s.usuario)
  const debeCambiarPassword = useAuth((s) => s.debeCambiarPassword)
  const iniciando = useAuth((s) => s.iniciando)
  const logout = useAuth((s) => s.logout)

  const [vista, setVista] = useState(vistaInicial)
  // Sub-pestaña de NuevaComanda ("nueva" o "comandas"), para poder llegar
  // desde el inicio a las comandas en curso
  const [tabComanda, setTabComanda] = useState('nueva')

  // Al abrir la app, si hay un token en sessionStorage se confirma contra la API
  useEffect(() => {
    useAuth.getState().iniciar()
  }, [])

  // Sesión por verificar: el store arranca en "iniciando" si encontró un token
  if (iniciando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hueso">
        <p className="text-piedra">Cargando...</p>
      </div>
    )
  }

  // Sin sesión: login a pantalla completa, sin menú
  if (!usuario) return <Login />

  // La API responde 403 con codigo CAMBIAR_PASSWORD hasta que se cambie la temporal
  if (debeCambiarPassword) return <CambiarPassword obligatorio />

  return (
    <div className="flex h-dvh bg-hueso">
      <Sidebar
        activo={vista}
        onNavigate={setVista}
        cuenta={usuario}
        onCambiarCuenta={() => logout()}
        rol={usuario.rol}
      />

      {/* pb deja aire para la barra inferior del celular; en md+ la barra se oculta */}
      <div className="min-w-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-0">
        {vista === 'inicio' && (
          <Home
            onNavigate={setVista}
            onVerEnCurso={() => {
              setTabComanda('comandas')
              setVista('nueva')
            }}
          />
        )}
        {vista === 'nueva' && <NuevaComanda tab={tabComanda} onTab={setTabComanda} />}
        {vista === 'stock' && <Stock />}
        {vista === 'productos' && <Productos />}
        {vista === 'resumenes' && <Resumenes />}
        {vista === 'ganancias' && <Ganancias />}
        {vista === 'asistencia' && <Asistencia />}
        {vista === 'password' && <CambiarPassword />}
        {!VISTAS.includes(vista) && (
          <PantallaError
            titulo="No encontramos esa pantalla"
            mensaje="El enlace puede estar mal escrito o la pantalla todavía no existe."
            detalle={vista}
            accion={{ etiqueta: 'Ir al inicio', onClick: () => setVista('inicio') }}
            secundario={{ etiqueta: 'Cerrar sesión', onClick: () => logout() }}
          />
        )}
      </div>
    </div>
  )
}