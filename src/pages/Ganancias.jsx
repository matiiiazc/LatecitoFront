import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../useAuth'
import { imprimirTexto, ANCHO, centrar, alineado } from '../utils/imprimir'

const dinero = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-AR')}`

const METODO = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

const CATEGORIAS = [
  { id: 'luz', etiqueta: 'Luz' },
  { id: 'agua', etiqueta: 'Agua' },
  { id: 'gas', etiqueta: 'Gas' },
  { id: 'internet', etiqueta: 'Internet / teléfono' },
  { id: 'alquiler', etiqueta: 'Alquiler' },
  { id: 'sueldos', etiqueta: 'Sueldos' },
  { id: 'insumos', etiqueta: 'Insumos' },
  { id: 'mantenimiento', etiqueta: 'Mantenimiento' },
  { id: 'impuestos', etiqueta: 'Impuestos' },
  { id: 'otros', etiqueta: 'Otros' },
]
const ETIQUETA_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.etiqueta]))

const aYMD = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const CAMPOS = 'w-full rounded-xl border border-linea bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha'

export default function Ganancias() {
  const esAdmin = useAuth((s) => s.usuario?.rol === 'admin')

  // Arranca en el mes en curso
  const [periodo, setPeriodo] = useState(() => {
    const hoy = aYMD(new Date())
    return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy }
  })
  const { desde, hasta } = periodo

  const [resumen, setResumen] = useState(null)
  const [gastos, setGastos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] = useState('luz')
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState(() => aYMD(new Date()))
  const [guardando, setGuardando] = useState(false)
  const [errorGasto, setErrorGasto] = useState('')
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const params = new URLSearchParams({ desde, hasta })
        const [r, g] = await Promise.all([
          api(`/gastos/resumen?${params}`),
          api(`/gastos?${params}`),
        ])
        if (!vivo) return
        setResumen(r)
        setGastos(g)
        setCargando(false)
        setError('')
      } catch (e) {
        if (vivo) {
          setError(e.message)
          setCargando(false)
        }
      }
    })()
    return () => {
      vivo = false
    }
  }, [desde, hasta])

  function atajo(rango) {
    const anio = Number(hasta.slice(0, 4))
    const mes = Number(hasta.slice(5, 7))

    if (rango === 'hoy') {
      setPeriodo({ desde: hasta, hasta })
    } else if (rango === '30') {
      const dia = Number(hasta.slice(8, 10)) - 29
      if (dia > 0) {
        setPeriodo({ desde: `${hasta.slice(0, 8)}${String(dia).padStart(2, '0')}`, hasta })
      } else {
        const mesPrevio = mes === 1 ? 12 : mes - 1
        const anioPrevio = mesPrevio === 12 ? anio - 1 : anio
        setPeriodo({
          desde: `${anioPrevio}-${String(mesPrevio).padStart(2, '0')}-01`,
          hasta,
        })
      }
    } else if (rango === 'mes') {
      setPeriodo({ desde: `${hasta.slice(0, 7)}-01`, hasta })
    } else if (rango === 'mesAnterior') {
      if (mes === 1) {
        setPeriodo({ desde: `${anio - 1}-12-01`, hasta: `${anio - 1}-12-31` })
      } else {
        const previo = String(mes - 1).padStart(2, '0')
        const ultimo = new Date(anio, mes, 0).getDate()
        setPeriodo({
          desde: `${anio}-${previo}-01`,
          hasta: `${anio}-${previo}-${String(ultimo).padStart(2, '0')}`,
        })
      }
    }
  }

  async function guardarGasto(e) {
    e.preventDefault()
    if (guardando) return
    setGuardando(true)
    setErrorGasto('')
    try {
      await api('/gastos', {
        metodo: 'POST',
        cuerpo: { monto: Number(monto), categoria, motivo: motivo.trim(), fecha },
      })
      setMonto('')
      setMotivo('')
      setAviso({ tono: 'ok', texto: 'Gasto cargado.' })
      const params = new URLSearchParams({ desde, hasta })
      const [r, g] = await Promise.all([
        api(`/gastos/resumen?${params}`),
        api(`/gastos?${params}`),
      ])
      setResumen(r)
      setGastos(g)
    } catch (e2) {
      setErrorGasto(e2.message)
    } finally {
      setGuardando(false)
    }
  }

  async function borrar(id) {
    if (!window.confirm('¿Borrar ese gasto?')) return
    try {
      await api(`/gastos/${id}`, { metodo: 'DELETE' })
      const params = new URLSearchParams({ desde, hasta })
      const [r, g] = await Promise.all([
        api(`/gastos/resumen?${params}`),
        api(`/gastos?${params}`),
      ])
      setResumen(r)
      setGastos(g)
    } catch (e) {
      setError(e.message)
    }
  }

  if (!esAdmin) {
    return (
      <p className="p-8 text-piedra">
        Solo la cuenta de administrador puede ver las ganancias y los gastos.
      </p>
    )
  }

  const t = resumen?.totales
  // La barra más larga del gráfico marca el 100% de cada lado
  const maxIng = Math.max(1, ...(resumen?.dias ?? []).map((d) => d.ingresos))
  const maxGas = Math.max(1, ...(resumen?.dias ?? []).map((d) => d.gastos))

  // Arma el resumen como texto monoespaciado para la térmica
  function imprimirResumen() {
    if (!resumen) return
    const sep = '='.repeat(ANCHO)
    const lin = '-'.repeat(ANCHO)
    const lineas = []

    lineas.push(sep)
    lineas.push(centrar('LATTECITO'))
    lineas.push(centrar('GANANCIAS Y GASTOS'))
    lineas.push(sep)
    lineas.push(`Desde: ${resumen.desde}  Hasta: ${resumen.hasta}`)
    lineas.push(lin)
    lineas.push(alineado('Ingresos', dinero(t.ingresos)))
    lineas.push(alineado('Gastos', dinero(t.gastos)))
    lineas.push(alineado('Resultado', dinero(t.resultado)))
    lineas.push(lin)
    lineas.push(alineado(`${t.comandas} comandas`, `Ticket prom ${dinero(t.ticket_promedio)}`))
    lineas.push(alineado(`${t.anuladas} anuladas`, `${t.cantidad_gastos} gastos`))
    if (resumen.desde !== resumen.hasta) {
      lineas.push(alineado('Margen por dia', dinero(t.margen_diario)))
    }

    lineas.push(sep)
    lineas.push(centrar('INGRESOS POR FORMA DE PAGO'))
    lineas.push(lin)
    if (resumen.por_metodo.length === 0) {
      lineas.push('Sin ventas cobradas')
    } else {
      for (const m of resumen.por_metodo) {
        lineas.push(alineado(`${METODO[m.metodo] ?? m.metodo} (${m.comandas})`, dinero(m.ingresos)))
      }
    }

    lineas.push(sep)
    lineas.push(centrar('GASTOS POR CATEGORIA'))
    lineas.push(lin)
    if (resumen.por_categoria.length === 0) {
      lineas.push('Sin gastos cargados')
    } else {
      for (const g of resumen.por_categoria) {
        lineas.push(
          alineado(`${ETIQUETA_CATEGORIA[g.categoria] ?? g.categoria} (${g.cantidad})`, dinero(g.gastos))
        )
      }
    }

    const conMovimiento = resumen.dias.filter((d) => d.ingresos > 0 || d.gastos > 0)
    lineas.push(sep)
    lineas.push(centrar('DETALLE POR DIA'))
    lineas.push(lin)
    if (conMovimiento.length === 0) {
      lineas.push('Sin movimientos en el periodo')
    } else {
      for (const d of conMovimiento) {
        const etiqueta = new Date(`${d.dia}T12:00:00`).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
        })
        lineas.push(
          `${etiqueta}  +${dinero(d.ingresos)}  -${dinero(d.gastos)}  =${dinero(d.resultado)}`
        )
      }
    }

    lineas.push(sep)
    lineas.push('')
    lineas.push('')

    imprimirTexto(lineas.join('\n'))
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-10">
      <h1 className="text-3xl font-bold text-mocha">Ganancias y gastos</h1>
      <p className="mt-1 text-piedra">
        Ingresos por ventas cobradas, menos los gastos que cargas vos.
      </p>

      {/* Período */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-linea bg-white p-4">
        <div>
          <label htmlFor="g-desde" className="mb-1 block text-sm font-medium text-piedra">
            Desde
          </label>
          <input
            id="g-desde"
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => setPeriodo({ ...periodo, desde: e.target.value })}
            className={CAMPOS}
          />
        </div>
        <div>
          <label htmlFor="g-hasta" className="mb-1 block text-sm font-medium text-piedra">
            Hasta
          </label>
          <input
            id="g-hasta"
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => setPeriodo({ ...periodo, hasta: e.target.value })}
            className={CAMPOS}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['hoy', 'Hoy'],
            ['30', 'Últimos 30 días'],
            ['mes', 'Este mes'],
            ['mesAnterior', 'Mes anterior'],
          ].map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => atajo(id)}
              className="rounded-xl border border-linea px-3 py-2 text-sm text-mocha hover:bg-latte/40"
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={imprimirResumen}
          disabled={!t}
          className="rounded-xl bg-espresso px-3 py-2 text-sm font-semibold text-latte hover:bg-mocha disabled:opacity-40"
        >
          Imprimir resumen
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}

      {cargando && !resumen && <p className="mt-6 text-piedra">Calculando...</p>}

      {t && (
        <>
          {/* Tres números grandes: ingresos, gastos y lo que queda */}
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ['Ingresos', t.ingresos, 'text-mocha', 'bg-white'],
              ['Gastos', t.gastos, 'text-red-800', 'bg-white'],
              [
                'Resultado',
                t.resultado,
                t.resultado >= 0 ? 'text-emerald-800' : 'text-red-800',
                t.resultado >= 0 ? 'bg-emerald-50' : 'bg-red-50',
              ],
            ].map(([etiqueta, valor, color, fondo]) => (
              <div key={etiqueta} className={`rounded-2xl border border-linea p-5 ${fondo}`}>
                <dt className="text-sm text-piedra">{etiqueta}</dt>
                <dd className={`mt-1 text-3xl font-extrabold tabular-nums ${color}`}>
                  {dinero(valor)}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 text-sm text-piedra">
            {t.comandas} comandas cobradas · ticket promedio {dinero(t.ticket_promedio)} ·{' '}
            {t.anuladas} anuladas · {t.cantidad_gastos} gastos cargados
            {resumen.desde === resumen.hasta
              ? ''
              : ` · ${dinero(t.margen_diario)} por día`}
          </p>

          {/* Cargar un gasto */}
          <section className="mt-8 rounded-2xl border border-linea bg-white p-5">
            <h2 className="text-xl font-bold text-mocha">Cargar un gasto</h2>
            <form onSubmit={guardarGasto} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="g-monto" className="mb-1 block text-sm font-medium text-piedra">
                  Monto
                </label>
                <input
                  id="g-monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  required
                  className={CAMPOS}
                />
              </div>
              <div>
                <label htmlFor="g-cat" className="mb-1 block text-sm font-medium text-piedra">
                  Categoría
                </label>
                <select
                  id="g-cat"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className={CAMPOS}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="g-motivo" className="mb-1 block text-sm font-medium text-piedra">
                  Motivo
                </label>
                <input
                  id="g-motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder="Factura de la luz de septiembre"
                  className={CAMPOS}
                />
              </div>
              <div>
                <label htmlFor="g-fecha" className="mb-1 block text-sm font-medium text-piedra">
                  Fecha
                </label>
                <input
                  id="g-fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className={CAMPOS}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={guardando || !monto || motivo.trim().length < 3}
                  className="w-full rounded-xl bg-espresso px-4 py-3 font-semibold text-latte transition-colors hover:bg-mocha disabled:opacity-40 sm:w-auto"
                >
                  {guardando ? 'Guardando...' : 'Cargar gasto'}
                </button>
                {errorGasto && (
                  <p role="alert" className="mt-2 rounded-xl bg-red-50 px-4 py-2 text-red-800">
                    {errorGasto}
                  </p>
                )}
              </div>
            </form>
          </section>

          {/* Día por día */}
          <section className="mt-8">
            <h2 className="text-xl font-bold text-mocha">Día por día</h2>
            <p className="mt-1 text-sm text-piedra">
              Sólo aparecen los días con movimiento.
            </p>
            <ul className="mt-4 space-y-2">
              {resumen.dias.filter((d) => d.ingresos > 0 || d.gastos > 0).length === 0 && (
                <li className="rounded-xl border border-linea bg-white p-6 text-center text-piedra">
                  En este período no hubo ventas ni gastos cargados.
                </li>
              )}
              {resumen.dias
                .filter((d) => d.ingresos > 0 || d.gastos > 0)
                .reverse()
                .map((d) => (
                  <li
                    key={d.dia}
                    className="grid items-center gap-2 rounded-xl border border-linea bg-white p-3 sm:grid-cols-[7rem_1fr_9rem]"
                  >
                    <span className="text-sm font-medium text-mocha">
                      {new Date(`${d.dia}T12:00:00`).toLocaleDateString('es-AR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="space-y-1">
                      <span className="block h-2.5 rounded-full bg-latte/40">
                        <span
                          className="block h-2.5 rounded-full bg-espresso"
                          style={{ width: `${(d.ingresos / maxIng) * 100}%` }}
                        />
                      </span>
                      <span className="block h-2.5 rounded-full bg-red-100">
                        <span
                          className="block h-2.5 rounded-full bg-red-500"
                          style={{ width: `${(d.gastos / maxGas) * 100}%` }}
                        />
                      </span>
                    </span>
                    <span className="text-right text-sm">
                      <span className="block tabular-nums text-mocha">+{dinero(d.ingresos)}</span>
                      <span className="block tabular-nums text-red-700">-{dinero(d.gastos)}</span>
                      <span
                        className={`block font-semibold tabular-nums ${
                          d.resultado >= 0 ? 'text-emerald-800' : 'text-red-800'
                        }`}
                      >
                        {dinero(d.resultado)}
                      </span>
                    </span>
                  </li>
                ))}
            </ul>
          </section>

          {/* De dónde vino y a dónde fue */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-linea bg-white p-5">
              <h2 className="text-xl font-bold text-mocha">Ingresos por forma de pago</h2>
              {resumen.por_metodo.length === 0 ? (
                <p className="mt-3 text-piedra">No hubo ventas cobradas en el período.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {resumen.por_metodo.map((m) => (
                    <li
                      key={m.metodo}
                      className="flex items-baseline justify-between gap-4 border-b border-linea pb-2 last:border-0"
                    >
                      <span className="text-piedra">
                        {METODO[m.metodo] ?? m.metodo}
                        <span className="text-sm"> · {m.comandas} comandas</span>
                      </span>
                      <span className="font-semibold tabular-nums text-mocha">
                        {dinero(m.ingresos)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-linea bg-white p-5">
              <h2 className="text-xl font-bold text-mocha">Gastos por categoría</h2>
              {resumen.por_categoria.length === 0 ? (
                <p className="mt-3 text-piedra">Todavía no cargaste gastos en este período.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {resumen.por_categoria.map((g) => (
                    <li
                      key={g.categoria}
                      className="flex items-baseline justify-between gap-4 border-b border-linea pb-2 last:border-0"
                    >
                      <span className="text-piedra">
                        {ETIQUETA_CATEGORIA[g.categoria] ?? g.categoria}
                        <span className="text-sm"> · {g.cantidad}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-red-800">
                        {dinero(g.gastos)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Gastos cargados */}
          <section className="mt-8">
            <h2 className="text-xl font-bold text-mocha">Gastos cargados</h2>
            {aviso && (
              <p
                role="status"
                className={`mt-3 rounded-xl px-4 py-3 ${
                  aviso.tono === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                }`}
              >
                {aviso.texto}
              </p>
            )}
            {gastos.length === 0 ? (
              <p className="mt-3 rounded-xl border border-linea bg-white p-6 text-center text-piedra">
                No hay gastos en este período.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-linea rounded-2xl border border-linea bg-white">
                {gastos.map((g) => (
                  <li key={g.id} className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-tinta">{g.motivo}</p>
                      <p className="text-sm text-piedra">
                        {ETIQUETA_CATEGORIA[g.categoria] ?? g.categoria} ·{' '}
                        {new Date(`${g.fecha}T12:00:00`).toLocaleDateString('es-AR')} · {g.usuario}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-red-800">
                      -{dinero(g.monto)}
                    </span>
                    <button
                      type="button"
                      onClick={() => borrar(g.id)}
                      aria-label={`Borrar el gasto ${g.motivo}`}
                      className="shrink-0 rounded-lg px-2 py-1 text-sm text-piedra hover:bg-red-50 hover:text-red-800"
                    >
                      Borrar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
