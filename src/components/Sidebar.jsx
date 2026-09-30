import { useState } from 'react'

const ICONOS = {
  inicio: ['M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'],
  nueva: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 8v8M8 12h8'],
  stock: ['M21 8l-9-5-9 5v8l9 5 9-5z', 'M3 8l9 5 9-5', 'M12 13v8'],
  resumenes: ['M3 21h18', 'M6 21V11', 'M12 21V4', 'M18 21v-7'],
  productos: ['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12'],
  mesas: ['M5 5h6v6H5z', 'M13 5h6v6h-6z', 'M5 13h6v6H5z', 'M13 13h6v6h-6z'],
  cuenta: ['M16 3l4 4-4 4', 'M20 7H9a5 5 0 0 0-5 5', 'M8 21l-4-4 4-4', 'M4 17h11a5 5 0 0 0 5-5'],
  password: ['M21 2l-2 2', 'M11.4 11.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8z', 'M11.4 11.6L15.5 7.5', 'M15.5 7.5l3 3L22 7l-3-3', 'M18.5 4.5L19 4'],
  plegar: ['M15 6l-6 6 6 6'],
}

function Icono({ nombre, className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {ICONOS[nombre].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

const NAV = [
  { id: 'inicio', etiqueta: 'Inicio' },
  { id: 'nueva', etiqueta: 'Nueva comanda' },
  { id: 'stock', etiqueta: 'Stock' },
  { id: 'resumenes', etiqueta: 'Resúmenes', soloAdmin: true },
  { id: 'productos', etiqueta: 'Productos', soloAdmin: true },
  { id: 'mesas', etiqueta: 'Mesas', soloAdmin: true },
]

export default function Sidebar({
  activo = 'inicio',
  onNavigate = () => {},
  cuenta = { nombre: 'Caja' },
  onCambiarCuenta = () => {},
  rol = 'caja',
}) {
  // En pantallas chicas arranca plegada
  const [abierto, setAbierto] = useState(() => window.innerWidth >= 768)

  const items = NAV.filter((i) => !i.soloAdmin || rol === 'admin')

  const base =
    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-latte'
  const centrado = abierto ? '' : 'justify-center'

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col bg-espresso text-latte transition-[width] duration-200 motion-reduce:transition-none ${
        abierto ? 'w-64' : 'w-[76px]'
      }`}
    >
      {/* Cabecera */}
      <div className={`flex items-center px-3 py-5 ${abierto ? 'justify-between' : 'justify-center'}`}>
        {abierto && (
          <span className="pl-2 text-2xl font-extrabold tracking-tight">Lattecito</span>
        )}
        <button
          type="button"
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
          aria-label={abierto ? 'Plegar menú' : 'Desplegar menú'}
          title={abierto ? 'Plegar menú' : 'Desplegar menú'}
          className="rounded-xl p-2 text-latte transition-colors hover:bg-mocha/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-latte"
        >
          <Icono
            nombre="plegar"
            className={`transition-transform motion-reduce:transition-none ${abierto ? '' : 'rotate-180'}`}
          />
        </button>
      </div>

      {/* Navegación */}
      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3">
        {items.map((item) => {
          const esActivo = activo === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={esActivo ? 'page' : undefined}
              aria-label={abierto ? undefined : item.etiqueta}
              title={abierto ? undefined : item.etiqueta}
              className={`${base} ${centrado} ${
                esActivo ? 'bg-latte font-semibold text-espresso' : 'hover:bg-mocha/40'
              }`}
            >
              <Icono nombre={item.id} />
              {abierto && <span>{item.etiqueta}</span>}
            </button>
          )
        })}
      </nav>

      {/* Cuenta */}
      <div className="flex flex-col gap-1.5 border-t border-mocha px-3 py-4">
        {abierto && (
          <p className="mb-1.5 px-3 text-sm text-latte/70">
            Sesión de <span className="font-semibold text-latte">{cuenta.nombre}</span>
          </p>
        )}
        <button
          type="button"
          onClick={() => onNavigate('password')}
          aria-label={abierto ? undefined : 'Cambiar contraseña'}
          title={abierto ? undefined : 'Cambiar contraseña'}
          className={`${base} ${centrado} py-2 text-sm opacity-80 hover:bg-mocha/40 hover:opacity-100`}
        >
          <Icono nombre="password" className="[&>path]:stroke-[1.6]" />
          {abierto && <span>Cambiar contraseña</span>}
        </button>
        <button
          type="button"
          onClick={onCambiarCuenta}
          aria-label={abierto ? undefined : 'Cambiar de cuenta'}
          title={abierto ? undefined : 'Cambiar de cuenta'}
          className={`${base} ${centrado} border border-mocha hover:bg-mocha/40`}
        >
          <Icono nombre="cuenta" />
          {abierto && <span>Cambiar de cuenta</span>}
        </button>
      </div>
    </aside>
  )
}
