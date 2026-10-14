import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../useAuth'
import { useTurno } from '../turno'
import { etiquetaPago } from '../utils/pago'

const dinero = (n) => `$${Math.round(n).toLocaleString('es-AR')}`

function urlComandasDeHoy() {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)
  return `/comandas?desde=${hoy.toISOString()}&hasta=${manana.toISOString()}&limite=100`
}

// El resumen de ganancias es exclusivo del admin, así que va del 1° del mes
// hasta hoy: alcanza para el cartel del inicio y pesa poco.
const diaLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function urlGananciasDelMes() {
  const hoy = diaLocal(new Date())
  return `/gastos/resumen?desde=${hoy.slice(0, 7)}-01&hasta=${hoy}`
}

export default function Home({ onNavigate = () => {}, onVerEnCurso = () => {} }) {
  const esAdmin = useAuth((s) => s.usuario?.rol === 'admin')
  const cargarTurno = useTurno((s) => s.cargar)
  const [comandas, setComandas] = useState([])
  const [ganancias, setGanancias] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [anulando, setAnulando] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [aviso, setAviso] = useState(null)

  const fecha = useMemo(
    () =>
      new Date().toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    []
  )

  async function recargar() {
    try {
      setComandas(await api(urlComandasDeHoy()))
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const datos = await api(urlComandasDeHoy())
        if (vivo) setComandas(datos)
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

  // El turno abierto se refresca junto con la pantalla: si lo abre o cierra
  // otro desde el kiosco, el Inicio tiene que mostrarlo al toque
  useEffect(() => {
    cargarTurno()
    const cada = setInterval(cargarTurno, 30000)
    return () => clearInterval(cada)
  }, [cargarTurno])

  // El admin ve el resultado del mes apenas entra. Si falla, el resto de la
  // pantalla sigue funcionando: solo se omite ese cartel.
  useEffect(() => {
    if (!esAdmin) return
    let vivo = true
    ;(async () => {
      try {
        const datos = await api(urlGananciasDelMes())
        if (vivo) setGanancias(datos)
      } catch (e) {
        if (vivo) console.error('No se pudo cargar el resumen de ganancias:', e.message)
      }
    })()
    return () => {
      vivo = false
    }
  }, [esAdmin])

  // El último día del período es hoy: el rango del mes termina en el día de hoy
  const { mes, hoy } = useMemo(() => {
    if (!ganancias) return { mes: null, hoy: null }
    const ultimo = ganancias.dias?.at(-1) ?? null
    return { mes: ganancias.totales, hoy: ultimo }
  }, [ganancias])

  // Solo lo cobrado cuenta como venta: las que quedaron en curso todavía no
  // entró la plata. Las anuladas se informan aparte.
  const { ventas, anuladas, enCurso, vendido, ticket } = useMemo(() => {
    const buenas = comandas.filter((c) => c.estado === 'cobrada')
    const anuladas = comandas.filter((c) => c.estado === 'anulada')
    const enCurso = comandas.filter((c) => c.estado === 'pendiente')
    const suma = buenas.reduce((s, c) => s + c.total, 0)
    return {
      ventas: buenas,
      anuladas: anuladas.length,
      enCurso: enCurso.length,
      vendido: suma,
      ticket: buenas.length ? Math.round(suma / buenas.length) : 0,
    }
  }, [comandas])

  const top3 = useMemo(() => {
    const porProducto = new Map()
    for (const c of ventas) {
      for (const i of c.items ?? []) {
        const actual = porProducto.get(i.producto_id)
        if (actual) {
          actual.unidades += i.cantidad
          actual.total += i.subtotal
        } else {
          porProducto.set(i.producto_id, {
            nombre: i.opcion ? `${i.nombre} (${i.opcion})` : i.nombre,
            unidades: i.cantidad,
            total: i.subtotal,
          })
        }
      }
    }
    return [...porProducto.values()]
      .sort((a, b) => b.unidades - a.unidades || b.total - a.total)
      .slice(0, 3)
  }, [ventas])

  async function anular() {
    if (motivo.trim().length < 3) return
    try {
      await api(`/comandas/${anulando.id}/anular`, {
        metodo: 'POST',
        cuerpo: { motivo: motivo.trim() },
      })
      setAnulando(null)
      setMotivo('')
      setAviso({ tono: 'ok', texto: `Comanda #${anulando.id} anulada. El stock volvió.` })
      await recargar()
    } catch (e) {
      setAviso({ tono: 'error', texto: e.message })
    }
  }

  return (
    <div className="min-h-screen bg-hueso text-tinta">
      <header className="bg-espresso text-latte">
        <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl">Lattecito</h1>
              <p className="mt-1 pb-2 text-latte/70">
                Café al paso · <span className="capitalize">{fecha}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('nueva')}
              className="rounded-xl bg-latte px-5 py-3 font-semibold text-espresso transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-latte"
            >
              Nueva comanda
            </button>
          </div>
        </div>

        <dl
          className={`mx-auto mt-10 grid max-w-6xl border-t border-mocha ${
            esAdmin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
          }`}
        >
          {[
            { etiqueta: 'Vendido hoy', valor: dinero(vendido) },
            { etiqueta: 'Ticket promedio', valor: dinero(ticket) },
            { etiqueta: 'Comandas del día', valor: ventas.length },
            ...(esAdmin
              ? [
                  {
                    etiqueta: 'Ganado hoy',
                    valor: dinero(hoy?.resultado ?? 0),
                    tono:
                      (hoy?.resultado ?? 0) < 0 ? 'text-rose-300' : 'text-emerald-300',
                  },
                ]
              : []),
          ].map(({ etiqueta, valor, tono }, i) => (
            <div
              key={etiqueta}
              className={`px-3 py-4 sm:px-6 sm:py-5 ${i > 0 ? 'border-l border-mocha' : ''}`}
            >
              <dt className="text-xs text-latte/70 sm:text-sm">{etiqueta}</dt>
              <dd
                className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl md:text-3xl ${
                  tono ?? 'text-white'
                }`}
              >
                {valor}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
        {aviso && (
          <p
            role="status"
            className={`mb-6 rounded-xl px-4 py-3 ${
              aviso.tono === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {aviso.texto}
          </p>
        )}

        {error && (
          <p role="alert" className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-red-800">
            {error}
          </p>
        )}

        <TurnoAbierto onIr={() => onNavigate('turno')} />

        {enCurso > 0 && (
          <p className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-latte/40 px-4 py-3 text-mocha">
            <span>
              Hay <strong>{enCurso}</strong> comanda{enCurso > 1 ? 's' : ''} en curso, sin
              cobrar.
            </span>
            <button
              type="button"
              onClick={onVerEnCurso}
              className="rounded-lg bg-espresso px-3 py-1.5 text-sm font-semibold text-latte hover:bg-mocha"
            >
              Verlas
            </button>
          </p>
        )}

        {esAdmin && mes && (
          <section className="mb-8 rounded-2xl border border-linea bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-2xl font-bold text-mocha">Este mes</h2>
              <button
                type="button"
                onClick={() => onNavigate('ganancias')}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-mocha transition-colors hover:bg-latte/40 focus-visible:outline-2 focus-visible:outline-mocha"
              >
                Ver detalle
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-3">
              {[
                ['Ventas', dinero(mes.ingresos), 'text-tinta'],
                ['Gastos', dinero(mes.gastos), 'text-tinta'],
                [
                  'Ganado',
                  dinero(mes.resultado),
                  mes.resultado < 0 ? 'text-rose-700' : 'text-emerald-700',
                ],
              ].map(([etiqueta, valor, tono]) => (
                <div key={etiqueta} className="rounded-xl bg-hueso p-3">
                  <dt className="text-xs text-piedra">{etiqueta}</dt>
                  <dd className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${tono}`}>
                    {valor}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-3 text-xs text-piedra">
              Resultado = ventas menos gastos, sin descontar el costo de los productos. Cargá los
              gastos en Ganancias para que el número sea real.
            </p>
          </section>
        )}

        {top3.length > 0 && (
          <section className="mb-8 rounded-2xl border border-linea bg-white p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold text-mocha">Lo más vendido hoy</h2>
              <p className="text-sm text-piedra">
                {top3[0].unidades} unidad(es) el primero
              </p>
            </div>

            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
              {top3.map((p, pos) => (
                <li key={p.nombre} className="rounded-xl border border-linea bg-hueso p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                        pos === 0
                          ? 'bg-espresso text-latte'
                          : 'border border-linea bg-white text-piedra'
                      }`}
                    >
                      {pos + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-tinta">{p.nombre}</p>
                      <p className="text-sm text-piedra">{p.unidades} unidad(es)</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xl font-bold tabular-nums text-mocha">
                    {dinero(p.total)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-mocha">Comandas de hoy</h2>
          {anuladas > 0 && <p className="text-sm text-piedra">{anuladas} anulada(s)</p>}
        </div>

        {cargando ? (
          <p className="mt-6 text-piedra">Cargando...</p>
        ) : comandas.length === 0 ? (
          <p className="mt-6 text-piedra">
            Todavía no hay ventas hoy. Usá Nueva comanda para cargar la primera.
          </p>
        ) : (
          <ul className="mt-4">
            {comandas.map((c) => {
              const anulada = c.estado === 'anulada'
              const resumen = c.items
                .map((i) => `${i.cantidad} ${i.nombre}`)
                .join(', ')

              return (
                <li
                  key={c.id}
                  className={`border-b border-linea py-4 ${anulada ? 'opacity-60' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg font-semibold">
                      #{c.id} · {c.tipo === 'mesa' ? `Mesa ${c.mesa}` : 'Mostrador'}
                    </p>

                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-latte/50 px-3 py-0.5 text-sm text-mocha">
                        {etiquetaPago(c)}
                      </span>
                      <span className="text-xl font-bold tabular-nums">
                        {dinero(c.total)}
                      </span>
                    </div>
                  </div>

                  <p className="mt-1 text-piedra">{resumen}</p>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-piedra">
                    <span>
                      {new Date(c.created_at).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>Atendió {c.atendio}</span>

                    {anulada ? (
                      <span className="text-red-700">
                        Anulada · {c.motivo_anulacion}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAnulando(c)
                          setMotivo('')
                        }}
                        className="underline hover:text-mocha"
                      >
                        Anular
                      </button>
                    )}
                  </div>

                  {anulando?.id === c.id && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        autoFocus
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && anular()}
                        placeholder="Motivo de la anulación"
                        className="min-w-64 flex-1 rounded-lg border border-linea bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-mocha"
                      />
                      <button
                        type="button"
                        onClick={anular}
                        disabled={motivo.trim().length < 3}
                        className="rounded-lg bg-espresso px-4 py-2 font-semibold text-latte hover:bg-mocha disabled:opacity-40"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnulando(null)}
                        className="rounded-lg px-4 py-2 text-mocha hover:bg-latte/40"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}

// Quién está atendiendo ahora. Es lo primero que se ve al abrir la app en el
// mostrador: o hay que elegir perfil, o se ve el turno en curso y se cierra.
function TurnoAbierto({ onIr }) {
  const turno = useTurno((s) => s.turno)
  const cargando = useTurno((s) => s.cargando)

  if (!turno) {
    return (
      <section className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-mocha/40 bg-white p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-piedra">Caja</p>
          <h2 className="mt-0.5 text-2xl font-bold text-mocha">No hay nadie atendiendo</h2>
          <p className="mt-1 text-sm text-piedra">
            Elegí tu nombre para abrir el turno y marcar tu entrada.
          </p>
        </div>
        <button
          type="button"
          onClick={onIr}
          className="rounded-xl bg-espresso px-5 py-3 font-semibold text-latte transition-colors hover:bg-mocha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha"
        >
          Elegir perfil
        </button>
      </section>
    )
  }

  return (
    <section className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-emerald-800">Atendiendo ahora</p>
        <h2 className="mt-0.5 text-2xl font-bold text-emerald-900">{turno.usuario}</h2>
        <p className="mt-1 text-sm text-emerald-800">
          Desde las {new Date(turno.abierto_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
          {dinero(turno.vendido)} vendidos en el turno
        </p>
      </div>
      <button
        type="button"
        onClick={onIr}
        className="rounded-xl bg-espresso px-5 py-3 font-semibold text-latte transition-colors hover:bg-mocha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha"
      >
        {cargando ? 'Cerrar caja…' : 'Ir a la caja'}
      </button>
    </section>
  )
}
