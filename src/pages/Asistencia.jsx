import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../useAuth'

// Lo que el admin necesita ver: los turnos de caja y los minutos de cada
// empleado. Los minutos se sacan de los turnos de caja, no de un fichaje
// aparte, así que abrir y cerrar caja ya es marcar la entrada y la salida.

const ZONA = 'America/Argentina/Buenos_Aires'
const ar = (opciones) => new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, ...opciones })
const diaHora = (iso) =>
  ar({ day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const enCa = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(d)
const minutosTexto = (n) =>
  `${Math.round(Number(n) || 0).toLocaleString('es-AR')} min`

const motivoTexto = (m) => (m === 'largo' ? 'cierre olvidado' : 'apertura accidental')

// La API nueva manda minutos; si todavía responde la vieja, se calculan
const minutosDe = (e) => (e.minutos != null ? e.minutos : Math.round((e.horas ?? 0) * 60))
const pesos = (n) =>
  '$' + (Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })

const CAMPOS =
  'w-full rounded-xl border border-linea bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha'
const TARJETA = 'rounded-2xl border border-linea bg-white p-5'
const ERROR = 'rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800'

export default function Asistencia() {
  const esAdmin = useAuth((s) => s.usuario?.rol === 'admin')
  const [tab, setTab] = useState('historial')

  if (!esAdmin) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
        <p className="text-piedra">No tenés acceso a esta pantalla.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-espresso">Caja y asistencia</h1>
        <p className="text-sm text-piedra">
          Los turnos de caja son las marcas de entrada y salida de cada empleado.
        </p>
      </header>

      <div className="mb-5 flex gap-1 rounded-xl bg-latte/40 p-1">
        {[
          { id: 'historial', etiqueta: 'Turnos' },
          { id: 'minutos', etiqueta: 'Minutos' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-white text-espresso shadow-sm' : 'text-mocha hover:bg-white/60'
            }`}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>

      {tab === 'historial' && <Historial />}
      {tab === 'minutos' && <Minutos />}
    </div>
  )
}

// --- Historial de turnos ---

function Historial() {
  const [turnos, setTurnos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const lista = await api('/turnos/historial?limite=60')
        if (!vivo) return
        setTurnos(lista)
        setError('')
      } catch (e) {
        if (vivo) setError(e.message)
      } finally {
        if (vivo) setCargando(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [])

  if (cargando) return <p className="text-sm text-piedra">Cargando...</p>

  return (
    <div className="flex flex-col gap-4">
      {error && <p role="alert" className={ERROR}>{error}</p>}

      <div className={TARJETA}>
        <h2 className="mb-3 font-semibold text-espresso">Turnos recientes</h2>
        {turnos.length === 0 ? (
          <p className="text-sm text-piedra">Todavía no se abrió ningún turno.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-linea">
            {turnos.map((t) => (
              <li key={t.id} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-tinta">
                    {t.usuario}
                    {t.abierto && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        sin cerrar
                      </span>
                    )}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-espresso">
                    {pesos(t.vendido)}
                  </p>
                </div>

                <p className="mt-0.5 text-xs text-piedra">
                  {diaHora(t.abierto_at)} → {t.cerrado_at ? diaHora(t.cerrado_at) : 'abierto'}
                </p>

                {t.cerrado_at && (
                  <p className="mt-1 text-xs">
                    <span className="text-piedra">
                      Gaveta: base {pesos(t.base_efectivo)} · esperado {pesos(t.esperado_efectivo)} ·
                      contado {pesos(t.contado_efectivo)}
                    </span>{' '}
                    {t.diferencia !== 0 && (
                      <span
                        className={`font-semibold ${
                          t.diferencia > 0 ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        ({t.diferencia > 0 ? '+' : ''}
                        {pesos(t.diferencia)})
                      </span>
                    )}
                  </p>
                )}

                {t.nota && (
                  <p className="mt-1 rounded-lg bg-latte/40 px-2 py-1 text-xs text-tinta">
                    {t.nota}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// --- Minutos por empleado ---

function Minutos() {
  const [periodo, setPeriodo] = useState(() => {
    const hoy = enCa(new Date())
    return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy }
  })
  const { desde, hasta } = periodo
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      setCargando(true)
      try {
        const r = await api(`/asistencia/resumen?${new URLSearchParams({ desde, hasta })}`)
        if (!vivo) return
        setDatos(r)
        setError('')
      } catch (e) {
        if (vivo) setError(e.message)
      } finally {
        if (vivo) setCargando(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [desde, hasta])

  return (
    <div className="flex flex-col gap-4">
      <div className={`${TARJETA} grid gap-3 sm:grid-cols-2`}>
        <div>
          <label htmlFor="h-desde" className="mb-1 block text-sm font-medium text-piedra">
            Desde
          </label>
          <input
            id="h-desde"
            type="date"
            value={desde}
            onChange={(e) => setPeriodo({ ...periodo, desde: e.target.value })}
            className={CAMPOS}
          />
        </div>
        <div>
          <label htmlFor="h-hasta" className="mb-1 block text-sm font-medium text-piedra">
            Hasta
          </label>
          <input
            id="h-hasta"
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => setPeriodo({ ...periodo, hasta: e.target.value })}
            className={CAMPOS}
          />
        </div>
      </div>

      {error && <p role="alert" className={ERROR}>{error}</p>}

      {datos && (
        <div className={TARJETA}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold text-espresso">Minutos por empleado</h2>
            <p className="text-sm text-piedra">
              Total:{' '}
              {minutosTexto(
                datos.total_minutos != null
                  ? datos.total_minutos
                  : Math.round((datos.total_horas ?? 0) * 60),
              )}
            </p>
          </div>

          {datos.minimo_minutos > 0 && (
            <p className="mb-3 text-xs text-piedra">
              No se cuentan los turnos de menos de {datos.minimo_minutos} minutos
              {datos.maximo_minutos
                ? ` ni los de más de ${Math.round(datos.maximo_minutos / 60)} horas (cierre olvidado)`
                : ''}
              .
            </p>
          )}

          {cargando ? (
            <p className="text-sm text-piedra">Cargando...</p>
          ) : datos.empleados.length === 0 ? (
            <p className="text-sm text-piedra">No hay turnos en este período.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-linea">
              {datos.empleados.map((emp) => (
                <li key={emp.usuario_id} className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-tinta">
                      {emp.usuario}
                      {emp.abierto && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          turno sin cerrar
                        </span>
                      )}
                    </p>
                    <p className="font-semibold tabular-nums text-espresso">
                      {minutosTexto(minutosDe(emp))}
                    </p>
                  </div>
                  <p className="text-xs text-piedra">
                    {emp.dias} {emp.dias === 1 ? 'día trabajado' : 'días trabajados'}
                    {emp.ignorados > 0 &&
                      ` · ${emp.ignorados} ${
                        emp.ignorados === 1 ? 'turno descartado' : 'turnos descartados'
                      }`}
                  </p>
                  {emp.tramos.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 text-xs text-piedra">
                      {emp.tramos.map((t, i) => (
                        <li key={i} className="tabular-nums">
                          {diaHora(t.entrada)} → {t.salida ? diaHora(t.salida) : 'sin cerrar'}
                          <span className="ml-2 text-tinta">{minutosTexto(t.minutos)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(emp.descartados ?? []).length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 text-xs text-amber-900">
                      {emp.descartados.map((d) => (
                        <li key={d.id} className="tabular-nums">
                          {diaHora(d.abierto_at)} · {minutosTexto(d.minutos)} ·{' '}
                          {motivoTexto(d.motivo)} (no contado)
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
