import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import Cobrar from '../components/Cobrar'

const dinero = (n) => `$${Math.round(n).toLocaleString('es-AR')}`

// Identifica una línea del carrito: el mismo producto con distinta opción son dos líneas
const clave = (productoId, opcionId) => `${productoId}-${opcionId ?? ''}`

export default function NuevaComanda() {
  const [productos, setProductos] = useState([])
  const [mesas, setMesas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState(0)
  const [tipo, setTipo] = useState('mostrador')
  const [mesaId, setMesaId] = useState(null)
  const [lineas, setLineas] = useState([])
  const [conNota, setConNota] = useState(null)

  const [eligiendo, setEligiendo] = useState(null)
  const [cobrando, setCobrando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorCobro, setErrorCobro] = useState('')
  const [hecha, setHecha] = useState(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const [prods, listaMesas] = await Promise.all([api('/productos'), api('/mesas')])
        if (!vivo) return
        setProductos(prods)
        setMesas(listaMesas)
      } catch (e) {
        if (vivo) setErrorCarga(e.message)
      } finally {
        if (vivo) setCargando(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [])

  const categorias = useMemo(() => {
    const mapa = new Map()
    for (const p of productos) mapa.set(p.categoria_id, p.categoria)
    return [...mapa].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [productos])

  const libres = mesas.filter((m) => m.activa && m.comanda_id === null)

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter((p) => {
      if (categoria && p.categoria_id !== categoria) return false
      if (!q) return true
      return p.nombre.toLowerCase().includes(q)
    })
  }, [productos, busqueda, categoria])

  // Agrega una línea. Si ya está la misma combinación, le suma la cantidad
  function agregar(producto, opcion, cantidad = 1) {
    const extra = opcion?.precio_extra ?? 0
    setLineas((previas) => {
      const k = clave(producto.id, opcion?.id ?? null)
      const existe = previas.find((l) => l.k === k)
      if (existe) {
        return previas.map((l) =>
          l.k === k ? { ...l, cantidad: Math.min(l.cantidad + cantidad, 99) } : l
        )
      }
      return [
        ...previas,
        {
          k,
          producto_id: producto.id,
          nombre: producto.nombre,
          opcion_id: opcion?.id ?? null,
          opcion: opcion?.nombre ?? null,
          precio_unitario: producto.precio + extra,
          cantidad: Math.min(cantidad, 99),
          nota: '',
        },
      ]
    })
  }

  // Un producto con opciones abre el selector; el resto entra directo
  function elegir(producto) {
    if (producto.opciones.length > 0) setEligiendo({ producto, cantidad: 1, opcion: producto.opciones[0], nota: '' })
    else agregar(producto, null, 1)
  }

  function cambiarCantidad(k, delta) {
    setLineas((previas) =>
      previas
        .map((l) => (l.k === k ? { ...l, cantidad: l.cantidad + delta } : l))
        .filter((l) => l.cantidad > 0)
    )
  }

  function cambiarNota(k, nota) {
    setLineas((previas) => previas.map((l) => (l.k === k ? { ...l, nota } : l)))
  }

  const total = lineas.reduce((s, l) => s + l.precio_unitario * l.cantidad, 0)

  function limpiar() {
    setLineas([])
    setHecha(null)
    setMesaId(null)
    setTipo('mostrador')
    setBusqueda('')
    setCategoria(0)
  }

  async function cobrar(metodo) {
    setEnviando(true)
    setErrorCobro('')
    try {
      const comanda = await api('/comandas', {
        metodo: 'POST',
        cuerpo: {
          tipo,
          mesa_id: tipo === 'mesa' ? mesaId : null,
          metodo_pago: metodo,
          items: lineas.map((l) => ({
            producto_id: l.producto_id,
            opcion_id: l.opcion_id,
            cantidad: l.cantidad,
            nota: l.nota || undefined,
          })),
        },
      })
      setCobrando(false)
      setHecha(comanda)
      setLineas([])
    } catch (e) {
      setErrorCobro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) {
    return <p className="p-8 text-piedra">Cargando el catálogo...</p>
  }

  if (errorCarga) {
    return (
      <p role="alert" className="m-8 rounded-xl bg-red-50 px-4 py-3 text-red-800">
        {errorCarga}
      </p>
    )
  }

  // Comanda recién cobrada
  if (hecha) {
    return (
      <div className="mx-auto max-w-2xl p-6 md:p-10">
        <div className="rounded-2xl border border-linea bg-white p-6">
          <h1 className="text-2xl font-bold text-espresso">
            Comanda #{hecha.id} cobrada
          </h1>
          <p className="mt-1 text-piedra">
            {hecha.tipo === 'mesa' ? `Mesa ${hecha.mesa}` : 'Mostrador'} · {hecha.metodo_pago}
          </p>

          <p className="mt-6 text-4xl font-extrabold tabular-nums text-mocha">
            {dinero(hecha.total)}
          </p>

          <ul className="mt-6 border-t border-linea">
            {hecha.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 border-b border-linea py-2">
                <span>
                  {i.cantidad} x {i.nombre}
                  {i.opcion && <span className="text-piedra"> ({i.opcion})</span>}
                </span>
                <span className="tabular-nums">{dinero(i.subtotal)}</span>
              </li>
            ))}
          </ul>

          {hecha.alertas?.map((a, i) => (
            <p
              key={i}
              role="alert"
              className={`mt-4 rounded-xl px-4 py-3 ${
                a.nivel === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'
              }`}
            >
              {a.mensaje}
            </p>
          ))}

          <button
            type="button"
            onClick={limpiar}
            className="mt-6 w-full rounded-xl bg-espresso px-4 py-3 text-lg font-semibold text-latte transition-colors hover:bg-mocha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha"
          >
            Cargar otra comanda
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Elegir productos */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-linea bg-white px-4 py-4">
          <h1 className="text-2xl font-bold text-mocha">Nueva comanda</h1>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full rounded-xl border border-linea bg-hueso px-4 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha"
            />
            <select
              value={categoria}
              onChange={(e) => setCategoria(Number(e.target.value))}
              className="rounded-xl border border-linea bg-hueso px-4 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha"
            >
              <option value={0}>Todo</option>
              {categorias.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {visibles.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => elegir(p)}
                  className="flex min-h-24 w-full flex-col justify-between rounded-xl border border-linea bg-white p-3 text-left transition-colors hover:border-mocha hover:bg-latte/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha"
                >
                  <span className="font-semibold leading-tight">{p.nombre}</span>
                  <span className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-bold tabular-nums text-mocha">{dinero(p.precio)}</span>
                    {p.controla_stock && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          p.sin_stock
                            ? 'bg-red-100 text-red-800'
                            : p.bajo_stock
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-latte/50 text-piedra'
                        }`}
                      >
                        {p.stock_actual}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {visibles.length === 0 && (
            <p className="p-6 text-center text-piedra">No hay productos que coincidan.</p>
          )}
        </div>
      </div>

      {/* La comanda */}
      <aside className="flex w-full shrink-0 flex-col border-t border-linea bg-white lg:w-96 lg:border-l lg:border-t-0">
        <div className="border-b border-linea p-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTipo('mostrador')}
              aria-pressed={tipo === 'mostrador'}
              className={`flex-1 rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                tipo === 'mostrador' ? 'bg-espresso text-latte' : 'border border-linea text-mocha'
              }`}
            >
              Mostrador
            </button>
            <button
              type="button"
              onClick={() => setTipo('mesa')}
              aria-pressed={tipo === 'mesa'}
              className={`flex-1 rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                tipo === 'mesa' ? 'bg-espresso text-latte' : 'border border-linea text-mocha'
              }`}
            >
              Mesa
            </button>
          </div>

          {tipo === 'mesa' && (
            <div className="mt-3">
              <label htmlFor="mesa" className="mb-1 block text-sm font-medium text-piedra">
                Mesa
              </label>
              <select
                id="mesa"
                value={mesaId ?? ''}
                onChange={(e) => setMesaId(Number(e.target.value) || null)}
                className="w-full rounded-xl border border-linea bg-hueso px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha"
              >
                <option value="">Elegí una mesa</option>
                {libres.map((m) => (
                  <option key={m.id} value={m.id}>
                    Mesa {m.numero}
                  </option>
                ))}
              </select>
              {libres.length === 0 && (
                <p className="mt-1 text-sm text-piedra">No hay mesas libres.</p>
              )}
            </div>
          )}
        </div>

        <ul className="flex-1 divide-y divide-linea overflow-y-auto">
          {lineas.length === 0 && (
            <li className="p-6 text-center text-piedra">
              Todavía no cargaste nada. Tocá un producto para empezar.
            </li>
          )}
          {lineas.map((l) => (
            <li key={l.k} className="p-3">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">
                  {l.nombre}
                  {l.opcion && <span className="font-normal text-piedra"> · {l.opcion}</span>}
                </span>
                <span className="shrink-0 font-bold tabular-nums">{dinero(l.precio_unitario * l.cantidad)}</span>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-linea">
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(l.k, -1)}
                    aria-label={`Quitar uno de ${l.nombre}`}
                    className="px-3 py-1.5 font-bold text-mocha hover:bg-latte/40"
                  >
                    −
                  </button>
                  <span className="w-8 text-center tabular-nums">{l.cantidad}</span>
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(l.k, 1)}
                    aria-label={`Sumar uno de ${l.nombre}`}
                    disabled={l.cantidad >= 99}
                    className="px-3 py-1.5 font-bold text-mocha hover:bg-latte/40 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <span className="text-sm text-piedra tabular-nums">
                  {dinero(l.precio_unitario)} c/u
                </span>

                <button
                  type="button"
                  onClick={() => cambiarCantidad(l.k, -l.cantidad)}
                  className="ml-auto text-sm text-piedra underline hover:text-mocha"
                >
                  Quitar
                </button>
              </div>

              <div className="mt-1.5">
                <button
                  type="button"
                  onClick={() => setConNota(conNota === l.k ? null : l.k)}
                  className="text-sm text-piedra underline hover:text-mocha"
                >
                  {l.nota ? l.nota : 'Agregar nota'}
                </button>
                {conNota === l.k && (
                  <input
                    autoFocus
                    value={l.nota}
                    onChange={(e) => cambiarNota(l.k, e.target.value)}
                    onBlur={() => setConNota(null)}
                    placeholder="Sin azúcar, para llevar..."
                    maxLength={200}
                    className="mt-1 w-full rounded-lg border border-linea bg-hueso px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-mocha"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-linea p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-piedra">Total</span>
            <span className="text-3xl font-extrabold tabular-nums text-espresso">
              {dinero(total)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setErrorCobro('')
              setCobrando(true)
            }}
            disabled={lineas.length === 0 || (tipo === 'mesa' && !mesaId)}
            className="mt-3 w-full rounded-xl bg-espresso px-4 py-3.5 text-lg font-semibold text-latte transition-colors hover:bg-mocha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha disabled:opacity-40"
          >
            {tipo === 'mesa' && !mesaId ? 'Elegí una mesa' : 'Cobrar'}
          </button>
        </div>
      </aside>

      {/* Selector de opción */}
      {eligiendo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-hueso p-6 text-tinta">
            <h2 className="text-xl font-bold text-mocha">{eligiendo.producto.nombre}</h2>
            <p className="text-piedra">Base: {dinero(eligiendo.producto.precio)}</p>

            <ul className="mt-4 space-y-2">
              {eligiendo.producto.opciones.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setEligiendo({ ...eligiendo, opcion: o })}
                    aria-pressed={eligiendo.opcion?.id === o.id}
                    className={`flex w-full items-center justify-between rounded-xl px-4 py-3 font-semibold transition-colors ${
                      eligiendo.opcion?.id === o.id
                        ? 'bg-espresso text-latte'
                        : 'border border-linea bg-white text-mocha hover:bg-latte/30'
                    }`}
                  >
                    <span>{o.nombre}</span>
                    {o.precio_extra > 0 && (
                      <span className="text-sm opacity-80">+{dinero(o.precio_extra)}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <label htmlFor="nota-opcion" className="mb-1 block text-sm font-medium text-piedra">
                Nota
              </label>
              <input
                id="nota-opcion"
                value={eligiendo.nota}
                onChange={(e) => setEligiendo({ ...eligiendo, nota: e.target.value })}
                placeholder="Opcional"
                maxLength={200}
                className="w-full rounded-xl border border-linea bg-white px-4 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha"
              />
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setEligiendo(null)}
                className="flex-1 rounded-xl px-4 py-3 font-semibold text-mocha hover:bg-latte/40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  agregar(eligiendo.producto, eligiendo.opcion, eligiendo.cantidad)
                  if (eligiendo.nota) {
                    setLineas((previas) =>
                      previas.map((l) =>
                        l.producto_id === eligiendo.producto.id &&
                        (l.opcion_id ?? null) === (eligiendo.opcion?.id ?? null)
                          ? { ...l, nota: eligiendo.nota }
                          : l
                      )
                    )
                  }
                  setEligiendo(null)
                }}
                className="flex-1 rounded-xl bg-espresso px-4 py-3 text-lg font-semibold text-latte hover:bg-mocha"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {cobrando && (
        <Cobrar
          total={total}
          enviando={enviando}
          error={errorCobro}
          onConfirmar={cobrar}
          onCancelar={() => {
            setCobrando(false)
            setErrorCobro('')
          }}
        />
      )}
    </div>
  )
}
