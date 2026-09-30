import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../useAuth'

const ESTILO_ESTADO = {
  ok: 'bg-latte/50 text-mocha',
  bajo: 'bg-amber-100 text-amber-900',
  sinStock: 'bg-red-100 text-red-800',
  sinControl: 'bg-linea/40 text-piedra',
}

const ETIQUETA_ESTADO = {
  ok: 'ok',
  bajo: 'bajo',
  sinStock: 'sin stock',
  sinControl: 'sin control',
}

const TIPOS = [
  { id: 'compra', etiqueta: 'Compra', ayuda: 'Entró mercadería' },
  { id: 'merma', etiqueta: 'Merma', ayuda: 'Se perdió o se tiró' },
  { id: 'ajuste', etiqueta: 'Ajuste', ayuda: 'Corregir un conteo' },
]

const MOVIMIENTOS = {
  venta: 'Venta',
  compra: 'Compra',
  ajuste: 'Ajuste',
  merma: 'Merma',
  anulacion: 'Anulación',
}

const CAMPO =
  'w-full rounded-xl border border-linea bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha'

export default function Stock() {
  const esAdmin = useAuth((s) => s.usuario?.rol === 'admin')

  const [inventario, setInventario] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [soloProblemas, setSoloProblemas] = useState(false)

  const [productoId, setProductoId] = useState('')
  const [tipo, setTipo] = useState('compra')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)

  const rutas = `/stock?todos=1${soloProblemas ? '&problemas=1' : ''}`

  async function recargar() {
    try {
      const [inv, movs] = await Promise.all([api(rutas), api('/stock/movimientos?limite=25')])
      setInventario(inv)
      setMovimientos(movs)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const [inv, movs] = await Promise.all([
          api(`/stock?todos=1${soloProblemas ? '&problemas=1' : ''}`),
          api('/stock/movimientos?limite=25'),
        ])
        if (!vivo) return
        setInventario(inv)
        setMovimientos(movs)
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
  }, [soloProblemas])

  async function registrar(e) {
    e.preventDefault()
    setGuardando(true)
    setAviso(null)
    try {
      const r = await api('/stock/entrada', {
        metodo: 'POST',
        cuerpo: {
          producto_id: Number(productoId),
          tipo,
          cantidad: Number(cantidad),
          motivo,
        },
      })
      const signo = r.delta > 0 ? '+' : ''
      setAviso({
        tono: 'ok',
        texto: `${r.producto}: ${signo}${r.delta}. Quedó en ${r.stock_actual}.`,
      })
      setCantidad('')
      setMotivo('')
      await recargar()
    } catch (e2) {
      setAviso({ tono: 'error', texto: e2.message })
    } finally {
      setGuardando(false)
    }
  }

  const conStock = inventario.filter((p) => p.controla_stock)
  const problemas = conStock.filter((p) => p.estado !== 'ok')

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-mocha">Stock</h1>
          <p className="text-piedra">
            {conStock.length} productos con control de stock
            {problemas.length > 0 && ` · ${problemas.length} para reponer`}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-mocha">
          <input
            type="checkbox"
            checked={soloProblemas}
            onChange={(e) => setSoloProblemas(e.target.checked)}
            className="size-4 accent-mocha"
          />
          Solo los que necesitan atención
        </label>
      </div>

      {aviso && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 ${
            aviso.tono === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}

      {/* Cargar stock: solo el admin */}
      {esAdmin && (
        <form onSubmit={registrar} className="mt-6 rounded-2xl border border-linea bg-white p-5">
          <h2 className="text-lg font-bold text-mocha">Cargar o corregir stock</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <label htmlFor="prod" className="mb-1 block text-sm font-medium text-piedra">
                Producto
              </label>
              <select
                id="prod"
                value={productoId}
                onChange={(e) => setProductoId(e.target.value)}
                required
                className={CAMPO}
              >
                <option value="">Elegí un producto</option>
                {conStock.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.stock_actual})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tipo" className="mb-1 block text-sm font-medium text-piedra">
                Tipo
              </label>
              <select
                id="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className={CAMPO}
              >
                {TIPOS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cant" className="mb-1 block text-sm font-medium text-piedra">
                Cantidad
              </label>
              <input
                id="cant"
                type="number"
                inputMode="numeric"
                step="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder={tipo === 'ajuste' ? '-5 o 10' : '10'}
                required
                className={CAMPO}
              />
            </div>
          </div>

          <p className="mt-2 text-sm text-piedra">
            {TIPOS.find((t) => t.id === tipo)?.ayuda}. En ajustes, un número negativo saca stock.
          </p>

          <div className="mt-3">
            <label htmlFor="motivo" className="mb-1 block text-sm font-medium text-piedra">
              Motivo
            </label>
            <input
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Pedido del lunes, se tiró, conté mal..."
              required
              maxLength={200}
              className={CAMPO}
            />
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="mt-4 rounded-xl bg-espresso px-5 py-3 font-semibold text-latte transition-colors hover:bg-mocha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha disabled:opacity-40"
          >
            {guardando ? 'Guardando...' : 'Registrar movimiento'}
          </button>
        </form>
      )}

      {/* Inventario */}
      <h2 className="mt-8 text-xl font-bold text-mocha">Inventario</h2>
      {cargando ? (
        <p className="mt-4 text-piedra">Cargando...</p>
      ) : (
        <>
          {/* Tarjetas: celulares */}
          <div className="mt-3 md:hidden">
            {inventario.length === 0 && (
              <p className="rounded-2xl border border-linea bg-white p-6 text-center text-piedra">
                No hay nada para mostrar.
              </p>
            )}
            <ul className="space-y-3">
              {inventario.map((p) => (
                <li
                  key={p.id}
                  className={`rounded-2xl border border-linea bg-white p-4 ${
                    p.estado === 'sinControl' ? 'text-piedra' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-tinta">{p.nombre}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm ${ESTILO_ESTADO[p.estado]}`}
                    >
                      {ETIQUETA_ESTADO[p.estado]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-piedra">{p.categoria}</p>
                  <div className="mt-3 flex gap-6">
                    <div>
                      <p className="text-xs text-piedra">Stock</p>
                      <p className="text-xl font-bold tabular-nums text-tinta">
                        {p.controla_stock ? p.stock_actual : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-piedra">Mínimo</p>
                      <p className="text-xl font-bold tabular-nums text-mocha">
                        {p.controla_stock ? p.stock_minimo : '—'}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Tabla: escritorio / tablets */}
          <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-linea bg-white md:block">
          <table className="w-full text-left">
            <thead className="border-b border-linea text-sm text-piedra">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 text-right font-medium">Mínimo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {inventario.map((p) => (
                <tr key={p.id} className={p.estado === 'sinControl' ? 'text-piedra' : ''}>
                  <td className="px-4 py-3 font-medium">{p.nombre}</td>
                  <td className="px-4 py-3 text-piedra">{p.categoria}</td>
                  <td className="px-4 py-3 text-right text-lg font-bold tabular-nums">
                    {p.controla_stock ? p.stock_actual : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-piedra">
                    {p.controla_stock ? p.stock_minimo : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-sm ${ESTILO_ESTADO[p.estado]}`}
                    >
                      {ETIQUETA_ESTADO[p.estado]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {inventario.length === 0 && (
            <p className="p-6 text-center text-piedra">No hay nada para mostrar.</p>
          )}
        </div>
        </>
      )}

      {/* Movimientos */}
      <h2 className="mt-8 text-xl font-bold text-mocha">Movimientos</h2>
      <ul className="mt-3 divide-y divide-linea rounded-2xl border border-linea bg-white">
        {movimientos.map((m) => (
          <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
            <span
              className={`rounded-full px-2.5 py-0.5 text-sm ${
                m.cantidad < 0 ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'
              }`}
            >
              {MOVIMIENTOS[m.tipo] ?? m.tipo}
            </span>
            <span className="font-semibold tabular-nums">
              {m.cantidad > 0 ? '+' : ''}
              {m.cantidad}
            </span>
            <span className="font-medium">{m.producto}</span>
            <span className="text-sm text-piedra">
              {m.usuario}
              {m.comanda_id && ` · comanda #${m.comanda_id}`}
              {m.motivo && ` · ${m.motivo}`}
            </span>
            <span className="ml-auto text-sm text-piedra tabular-nums">
              {new Date(m.created_at).toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </li>
        ))}
        {movimientos.length === 0 && (
          <li className="p-6 text-center text-piedra">Todavía no hay movimientos.</li>
        )}
      </ul>
    </div>
  )
}
