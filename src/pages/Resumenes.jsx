import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../useAuth'

const TIPOS = {
  comanda_cobrada: { etiqueta: 'Venta', tono: 'bg-emerald-100 text-emerald-900' },
  comanda_abierta: { etiqueta: 'Comanda abierta', tono: 'bg-sky-100 text-sky-900' },
  comanda_anulada: { etiqueta: 'Anulación', tono: 'bg-red-100 text-red-900' },
  compra: { etiqueta: 'Compra', tono: 'bg-sky-100 text-sky-900' },
  merma: { etiqueta: 'Merma', tono: 'bg-amber-100 text-amber-900' },
  ajuste: { etiqueta: 'Ajuste', tono: 'bg-slate-200 text-slate-900' },
  print_job: { etiqueta: 'Impresión', tono: 'bg-indigo-100 text-indigo-900' },
  login: { etiqueta: 'Ingreso', tono: 'bg-lime-100 text-lime-900' },
  cambio_password: { etiqueta: 'Cambio de clave', tono: 'bg-purple-100 text-purple-900' },
  producto_creado: { etiqueta: 'Producto creado', tono: 'bg-pink-100 text-pink-900' },
  producto_editado: { etiqueta: 'Producto editado', tono: 'bg-pink-100 text-pink-900' },
  producto_borrado: { etiqueta: 'Producto borrado', tono: 'bg-pink-100 text-pink-900' },
  opcion_creada: { etiqueta: 'Opción agregada', tono: 'bg-pink-100 text-pink-900' },
  opcion_quitada: { etiqueta: 'Opción quitada', tono: 'bg-pink-100 text-pink-900' },
  mesa_creada: { etiqueta: 'Mesa creada', tono: 'bg-orange-100 text-orange-900' },
  mesa_editada: { etiqueta: 'Mesa editada', tono: 'bg-orange-100 text-orange-900' },
  mesa_eliminada: { etiqueta: 'Mesa eliminada', tono: 'bg-orange-100 text-orange-900' },
  gasto_creado: { etiqueta: 'Gasto cargado', tono: 'bg-rose-100 text-rose-900' },
  gasto_borrado: { etiqueta: 'Gasto borrado', tono: 'bg-rose-100 text-rose-900' },
  turno_abierto: { etiqueta: 'Caja abierta', tono: 'bg-amber-100 text-amber-900' },
  turno_cerrado: { etiqueta: 'Caja cerrada', tono: 'bg-teal-100 text-teal-900' },
}

const LIMITE = 200

const aYMD = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const diaClave = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const aHora = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const aFechaLarga = (clave) => {
  const [a, m, d] = clave.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const CAMPO =
  'w-full rounded-xl border border-linea bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha'

export default function Resumenes() {
  const esAdmin = useAuth((s) => s.usuario?.rol === 'admin')

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [tipo, setTipo] = useState('')
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  function hoy() {
    return aYMD(new Date())
  }

  function haceSieteDias() {
    return aYMD(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))
  }

  useEffect(() => {
    let vivo = true
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    if (tipo) params.set('tipo', tipo)
    params.set('limite', String(LIMITE))
    ;(async () => {
      const filas = await api(`/actividad?${params}`).catch((e) => {
        if (vivo) setError(e.message)
        return null
      })
      if (vivo) setCargando(false)
      if (!vivo || !filas) return
      setEventos(filas)
      setError('')
    })()
    return () => {
      vivo = false
    }
  }, [desde, hasta, tipo])

  if (!esAdmin) {
    return (
      <p className="p-8 text-piedra">
        Solo la cuenta de administrador puede ver toda la actividad del local.
      </p>
    )
  }

  const grupos = []
  for (const e of eventos) {
    const clave = diaClave(e.created_at)
    const ultimo = grupos[grupos.length - 1]
    if (!ultimo || ultimo.clave !== clave) grupos.push({ clave, items: [e] })
    else ultimo.items.push(e)
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-10">
      <div>
        <h1 className="text-3xl font-bold text-mocha">Actividad</h1>
        <p className="text-piedra">Todo lo que pasó en el local, con su fecha y usuario.</p>
      </div>

      <div className="mt-5 rounded-2xl border border-linea bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="act-desde" className="mb-1 block text-sm font-medium text-piedra">
              Desde
            </label>
            <input
              id="act-desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className={CAMPO}
            />
          </div>
          <div>
            <label htmlFor="act-hasta" className="mb-1 block text-sm font-medium text-piedra">
              Hasta
            </label>
            <input
              id="act-hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className={CAMPO}
            />
          </div>
          <div>
            <label htmlFor="act-tipo" className="mb-1 block text-sm font-medium text-piedra">
              Tipo
            </label>
            <select
              id="act-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className={CAMPO}
            >
              <option value="">Todos</option>
              {Object.entries(TIPOS).map(([id, t]) => (
                <option key={id} value={id}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              const s = haceSieteDias()
              const h = hoy()
              setDesde(s)
              setHasta(h)
            }}
            className="rounded-full border border-linea px-3 py-1 font-medium text-mocha hover:bg-latte/40"
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => {
              const h = hoy()
              setDesde(h)
              setHasta(h)
            }}
            className="rounded-full border border-linea px-3 py-1 font-medium text-mocha hover:bg-latte/40"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => {
              setDesde('')
              setHasta('')
            }}
            className="rounded-full border border-linea px-3 py-1 font-medium text-mocha hover:bg-latte/40"
          >
            Todo
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-piedra">
        <p>
          {cargando ? 'Consultando...' : `${eventos.length} eventos`}
          {eventos.length === LIMITE && ' (se muestran los últimos 200)'}
        </p>
        {desde && hasta && desde > hasta && (
          <p className="rounded-full bg-red-50 px-3 py-1 font-medium text-red-800">
            La fecha "desde" es posterior a "hasta"
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="mt-6 text-piedra">Cargando...</p>
      ) : grupos.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-linea bg-white p-6 text-center text-piedra">
          No hay actividad para ese período.
        </p>
      ) : (
        <div className="mt-5 space-y-8">
          {grupos.map((g) => (
            <section key={g.clave}>
              <h2 className="mb-2 flex items-baseline justify-between gap-3">
                <span className="font-semibold text-mocha capitalize">{aFechaLarga(g.clave)}</span>
                <span className="text-sm text-piedra">{g.items.length}</span>
              </h2>
              <ul className="space-y-2">
                {g.items.map((e) => {
                  const t = TIPOS[e.tipo] ?? { etiqueta: e.tipo, tono: 'bg-latte text-tinta' }
                  return (
                    <li key={e.id} className="rounded-2xl border border-linea bg-white p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm tabular-nums text-piedra">{aHora(e.created_at)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.tono}`}>
                          {t.etiqueta}
                        </span>
                        <span className="text-sm font-medium text-mocha">{e.usuario_nombre}</span>
                      </div>
                      <p className="mt-1 text-tinta">{e.descripcion}</p>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}