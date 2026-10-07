import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../useAuth'

const dinero = (n) => `$${Math.round(n).toLocaleString('es-AR')}`

const CAMPO =
  'w-full rounded-xl border border-linea bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha'

const VACIO = {
  id: null,
  nombre: '',
  categoria_id: '',
  precio: '',
  descripcion: '',
  activo: true,
  controla_stock: false,
  stock_actual: 0,
  stock_minimo: 0,
}

export default function Productos() {
  const esAdmin = useAuth((s) => s.usuario?.rol === 'admin')

  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [opcionesDe, setOpcionesDe] = useState(null)

  async function cargar() {
    try {
      const [prods, cats] = await Promise.all([
        api('/productos?todos=1'),
        api('/productos/categorias'),
      ])
      setProductos(prods)
      setCategorias(cats)
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const [prods, cats] = await Promise.all([
          api('/productos?todos=1'),
          api('/productos/categorias'),
        ])
        if (!vivo) return
        setProductos(prods)
        setCategorias(cats)
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

  function editar(p) {
    setAviso(null)
    setOpcionesDe(null)
    setEditando({
      ...VACIO,
      ...p,
      categoria_id: String(p.categoria_id),
      precio: String(p.precio),
      stock_actual: String(p.stock_actual),
      stock_minimo: String(p.stock_minimo),
    })
  }

  function campo(nombre, valor) {
    setEditando((v) => ({ ...v, [nombre]: valor }))
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setAviso(null)
    try {
      const cuerpo = {
        nombre: editando.nombre,
        categoria_id: Number(editando.categoria_id),
        precio: Number(editando.precio),
        descripcion: editando.descripcion || null,
        activo: editando.activo,
        controla_stock: editando.controla_stock,
        stock_actual: Number(editando.stock_actual),
        stock_minimo: Number(editando.stock_minimo),
      }

      if (editando.id) {
        await api(`/productos/${editando.id}`, { metodo: 'PATCH', cuerpo })
        setAviso({ tono: 'ok', texto: `Guardaste ${editando.nombre}.` })
      } else {
        await api('/productos', { metodo: 'POST', cuerpo })
        setAviso({ tono: 'ok', texto: `Creaste ${editando.nombre}.` })
      }
      setEditando(null)
      await cargar()
    } catch (e2) {
      setAviso({ tono: 'error', texto: e2.message })
    } finally {
      setGuardando(false)
    }
  }

  async function agregarOpcion(e) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const nombre = String(form.get('nombre') ?? '').trim()
    const extra = Number(form.get('extra') ?? 0)
    if (!nombre) return
    try {
      await api(`/productos/${opcionesDe.id}/opciones`, {
        metodo: 'POST',
        cuerpo: { nombre, precio_extra: extra },
      })
      e.currentTarget.reset()
      await cargar()
    } catch (e2) {
      setAviso({ tono: 'error', texto: e2.message })
    }
  }

  async function quitarOpcion(productoId, opcionId) {
    try {
      await api(`/productos/${productoId}/opciones/${opcionId}`, { metodo: 'DELETE' })
      await cargar()
    } catch (e2) {
      setAviso({ tono: 'error', texto: e2.message })
    }
  }

  const visibles = productos.filter((p) =>
    busqueda.trim() ? p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()) : true
  )

  if (!esAdmin) {
    return (
      <p className="p-8 text-piedra">
        Los productos los carga el administrador. Entrá con una cuenta de admin.
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-mocha">Productos</h1>
          <p className="text-piedra">
            {productos.filter((p) => p.activo).length} activos de {productos.length}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-xl border border-linea bg-white px-4 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha sm:w-60"
          />
          <button
            type="button"
            onClick={() => {
              setAviso(null)
              setOpcionesDe(null)
              setEditando({ ...VACIO, categoria_id: categorias[0] ? String(categorias[0].id) : '' })
            }}
            className="rounded-xl bg-espresso px-4 py-2.5 font-semibold text-latte hover:bg-mocha"
          >
            Producto nuevo
          </button>
        </div>
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

      {cargando ? (
        <p className="mt-6 text-piedra">Cargando...</p>
      ) : (
        <>
          {/* Tarjetas: celulares */}
          <div className="mt-5 md:hidden">
            {visibles.length === 0 && (
              <p className="rounded-2xl border border-linea bg-white p-6 text-center text-piedra">
                No hay productos que coincidan.
              </p>
            )}
            <ul className="space-y-3">
              {visibles.map((p) => (
                <li
                  key={p.id}
                  className={`rounded-2xl border border-linea bg-white p-4 ${
                    p.activo ? '' : 'text-piedra'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-tinta">{p.nombre}</p>
                      {p.opciones.length > 0 && (
                        <p className="mt-0.5 truncate text-sm text-piedra">
                          {p.opciones.map((o) => o.nombre).join(', ')}
                        </p>
                      )}
                      <p className="mt-0.5 text-sm text-piedra">{p.categoria}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm ${
                        p.activo ? 'bg-emerald-50 text-emerald-800' : 'bg-linea/40 text-piedra'
                      }`}
                    >
                      {p.activo ? 'activo' : 'inactivo'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xl font-bold tabular-nums text-mocha">{dinero(p.precio)}</p>
                    <div className="flex items-center gap-4">
                      {p.controla_stock && (
                        <p className="text-sm text-piedra tabular-nums">Stock: {p.stock_actual}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => editar(p)}
                        className="text-sm font-semibold text-mocha underline hover:text-espresso"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Tabla: escritorio / tablets */}
          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-linea bg-white md:block">
          <table className="w-full text-left">
            <thead className="border-b border-linea text-sm text-piedra">
              <tr>
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 text-right font-medium">Precio</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {visibles.map((p) => (
                <tr key={p.id} className={p.activo ? '' : 'text-piedra'}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.nombre}</p>
                    {p.opciones.length > 0 && (
                      <p className="text-sm text-piedra">
                        {p.opciones.map((o) => o.nombre).join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-piedra">{p.categoria}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {dinero(p.precio)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.controla_stock ? p.stock_actual : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-sm ${
                        p.activo
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-linea/40 text-piedra'
                      }`}
                    >
                      {p.activo ? 'activo' : 'inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => editar(p)}
                      className="text-sm font-semibold text-mocha underline hover:text-espresso"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibles.length === 0 && (
            <p className="p-6 text-center text-piedra">No hay productos que coincidan.</p>
          )}
        </div>
        </>
      )}

      {/* Alta / edición */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-espresso/60 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-hueso p-6 text-tinta">
            <form onSubmit={guardar}>
            <h2 className="text-xl font-bold text-mocha">
              {editando.id ? 'Editar producto' : 'Producto nuevo'}
            </h2>

            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="f-nombre" className="mb-1 block text-sm font-medium text-piedra">
                  Nombre
                </label>
                <input
                  id="f-nombre"
                  value={editando.nombre}
                  onChange={(e) => campo('nombre', e.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                  className={CAMPO}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="f-cat" className="mb-1 block text-sm font-medium text-piedra">
                    Categoría
                  </label>
                  <select
                    id="f-cat"
                    value={editando.categoria_id}
                    onChange={(e) => campo('categoria_id', e.target.value)}
                    required
                    className={CAMPO}
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="f-precio" className="mb-1 block text-sm font-medium text-piedra">
                    Precio
                  </label>
                  <input
                    id="f-precio"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={editando.precio}
                    onChange={(e) => campo('precio', e.target.value)}
                    required
                    className={CAMPO}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="f-desc"
                  className="mb-1 block text-sm font-medium text-piedra"
                >
                  Descripción
                </label>
                <input
                  id="f-desc"
                  value={editando.descripcion}
                  onChange={(e) => campo('descripcion', e.target.value)}
                  placeholder="Opcional"
                  className={CAMPO}
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editando.activo}
                  onChange={(e) => campo('activo', e.target.checked)}
                  className="size-4 accent-mocha"
                />
                <span>Activo (aparece en el comandero)</span>
              </label>

              {Number(editando.precio) === 0 && editando.activo && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Con precio 0 no se puede activar. La base no lo permite.
                </p>
              )}

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editando.controla_stock}
                  onChange={(e) => campo('controla_stock', e.target.checked)}
                  className="size-4 accent-mocha"
                />
                <span>Controla stock (se descuenta al vender)</span>
              </label>

              {editando.controla_stock && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="f-stock"
                      className="mb-1 block text-sm font-medium text-piedra"
                    >
                      Stock actual
                    </label>
                    <input
                      id="f-stock"
                      type="number"
                      step="1"
                      value={editando.stock_actual}
                      onChange={(e) => campo('stock_actual', e.target.value)}
                      className={CAMPO}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="f-min"
                      className="mb-1 block text-sm font-medium text-piedra"
                    >
                      Stock mínimo (avisa)
                    </label>
                    <input
                      id="f-min"
                      type="number"
                      step="1"
                      min="0"
                      value={editando.stock_minimo}
                      onChange={(e) => campo('stock_minimo', e.target.value)}
                      className={CAMPO}
                    />
                  </div>
                </div>
              )}
            </div>

            {editando.id && (
              <p className="mt-4 text-sm text-piedra">
                Opciones: {editando.opciones.length ? editando.opciones.map((o) => o.nombre).join(', ') : 'ninguna'}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="flex-1 rounded-xl px-4 py-3 font-semibold text-mocha hover:bg-latte/40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 rounded-xl bg-espresso px-4 py-3 text-lg font-semibold text-latte hover:bg-mocha disabled:opacity-40"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>

          {/* Las opciones van aparte: no se puede anidar un form adentro del de arriba */}
          {editando.id && (
            <div className="mt-5 border-t border-linea pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-mocha">Opciones de {editando.nombre}</h3>
                <button
                  type="button"
                  onClick={() => setOpcionesDe(opcionesDe?.id === editando.id ? null : editando)}
                  className="text-sm text-mocha underline"
                >
                  {opcionesDe?.id === editando.id ? 'Ocultar' : 'Administrar'}
                </button>
              </div>

              {opcionesDe?.id === editando.id && (
                <form onSubmit={agregarOpcion} className="mt-3 space-y-3">
                  <ul className="space-y-1">
                    {editando.opciones.map((o) => (
                      <li key={o.id} className="flex items-center justify-between text-sm">
                        <span>
                          {o.nombre}{' '}
                          <span className="text-piedra">
                            {o.precio_extra > 0 && `+${dinero(o.precio_extra)}`}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => quitarOpcion(editando.id, o.id)}
                          className="text-piedra underline hover:text-red-700"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                    {editando.opciones.length === 0 && (
                      <li className="text-sm text-piedra">No tiene opciones.</li>
                    )}
                  </ul>

                  <div className="flex gap-2">
                    <input name="nombre" placeholder="Nombre de la opción" className={CAMPO} />
                    <input
                      name="extra"
                      type="number"
                      min="0"
                      step="0.01"
                      className={`${CAMPO} w-28`}
                    />
                    <button
                      type="submit"
                      className="rounded-xl border border-linea px-4 py-2.5 font-semibold text-mocha hover:bg-latte/40"
                    >
                      Agregar
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
