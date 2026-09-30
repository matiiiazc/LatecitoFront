import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../useAuth'

const dinero = (n) => `$${Math.round(n).toLocaleString('es-AR')}`

const CAMPO =
  'w-full rounded-xl border border-linea bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha'

const ESTADOS = {
  abierta: { etiqueta: 'Abierta', tono: 'bg-amber-50 text-amber-800' },
  cobrada: { etiqueta: 'Cobrada', tono: 'bg-emerald-50 text-emerald-800' },
}

export default function Mesas() {
  const esAdmin = useAuth((s) => s.usuario?.rol === 'admin')

  const [mesas, setMesas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [editando, setEditando] = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const filas = await api('/mesas?todas=1')
        if (!vivo) return
        setMesas(filas)
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

  async function recargar() {
    try {
      setMesas(await api('/mesas?todas=1'))
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  function nueva() {
    setAviso(null)
    setEditando({ id: null, numero: '', activa: true })
  }

  function editar(m) {
    setAviso(null)
    setEditando({ id: m.id, numero: String(m.numero), activa: m.activa })
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setAviso(null)
    try {
      if (editando.id) {
        await api(`/mesas/${editando.id}`, {
          metodo: 'PATCH',
          cuerpo: { numero: Number(editando.numero), activa: editando.activa },
        })
        setAviso({ tono: 'ok', texto: `Guardaste la mesa ${editando.numero}.` })
      } else {
        await api('/mesas', { metodo: 'POST', cuerpo: { numero: Number(editando.numero) } })
        setAviso({ tono: 'ok', texto: `Creaste la mesa ${editando.numero}.` })
      }
      setEditando(null)
      await recargar()
    } catch (e2) {
      setAviso({ tono: 'error', texto: e2.message })
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    setGuardando(true)
    setAviso(null)
    try {
      await api(`/mesas/${eliminando.id}`, { metodo: 'DELETE' })
      setAviso({ tono: 'ok', texto: `Borraste la mesa ${eliminando.numero}.` })
      setEliminando(null)
      await recargar()
    } catch (e2) {
      setAviso({ tono: 'error', texto: e2.message })
      setEliminando(null)
    } finally {
      setGuardando(false)
    }
  }

  if (!esAdmin) {
    return (
      <p className="p-8 text-piedra">
        Las mesas las administra el administrador. Entrá con una cuenta de admin.
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-mocha">Mesas</h1>
          <p className="text-piedra">
            {mesas.filter((m) => m.activa).length} activas de {mesas.length}
          </p>
        </div>

        <button
          type="button"
          onClick={nueva}
          className="rounded-xl bg-espresso px-4 py-2.5 font-semibold text-latte hover:bg-mocha"
        >
          Nueva mesa
        </button>
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
            {mesas.length === 0 && (
              <p className="rounded-2xl border border-linea bg-white p-6 text-center text-piedra">
                No hay mesas.
              </p>
            )}
            <ul className="space-y-3">
              {mesas.map((m) => {
                const estado = ESTADOS[m.estado]
                return (
                  <li key={m.id} className="rounded-2xl border border-linea bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-mocha">
                        Mesa {m.numero}
                        {!m.activa && (
                          <span className="ml-2 rounded-full bg-piedra/10 px-2 py-0.5 text-xs text-piedra">
                            Inactiva
                          </span>
                        )}
                      </p>
                      {m.comanda_id ? (
                        estado ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs ${estado.tono}`}>
                            {estado.etiqueta}
                          </span>
                        ) : (
                          <span className="text-piedra">Con movimiento</span>
                        )
                      ) : (
                        <span className="text-piedra">Libre</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-sm text-piedra">Total</p>
                      <p className="text-xl font-bold tabular-nums text-tinta">
                        {m.total != null ? dinero(m.total) : '—'}
                      </p>
                    </div>
                    <div className="mt-2 flex gap-4 text-sm">
                      <button
                        type="button"
                        onClick={() => editar(m)}
                        className="font-semibold text-mocha underline hover:text-espresso"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAviso(null)
                          setEliminando(m)
                        }}
                        className="font-semibold text-red-700 underline hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Tabla: escritorio / tablets */}
          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-linea bg-white md:block">
          <table className="w-full text-left">
            <thead className="border-b border-linea text-sm text-piedra">
              <tr>
                <th className="px-4 py-3 font-medium">Mesa</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {mesas.map((m) => {
                const estado = ESTADOS[m.estado]
                return (
                  <tr key={m.id} className="border-b border-linea last:border-0">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-semibold text-mocha">
                        Mesa {m.numero}
                        {!m.activa && (
                          <span className="rounded-full bg-piedra/10 px-2 py-0.5 text-xs text-piedra">
                            Inactiva
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.comanda_id ? (
                        estado ? (
                          <span className={`rounded-full px-2 py-0.5 text-xs ${estado.tono}`}>
                            {estado.etiqueta}
                          </span>
                        ) : (
                          <span className="text-piedra">Con movimiento</span>
                        )
                      ) : (
                        <span className="text-piedra">Libre</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {m.total != null ? dinero(m.total) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => editar(m)}
                        className="mr-3 text-sm font-semibold text-mocha underline hover:text-espresso"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAviso(null)
                          setEliminando(m)
                        }}
                        className="text-sm font-semibold text-red-700 underline hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {mesas.length === 0 && <p className="p-6 text-center text-piedra">No hay mesas.</p>}
        </div>
        </>
      )}

      {/* Alta / edición */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-hueso p-6 text-tinta">
            <h2 className="text-xl font-bold text-mocha">
              {editando.id ? `Mesa ${editando.numero}` : 'Mesa nueva'}
            </h2>

            <form onSubmit={guardar} className="mt-4 space-y-4">
              <div>
                <label htmlFor="m-numero" className="mb-1 block text-sm font-medium text-piedra">
                  Número
                </label>
                <input
                  id="m-numero"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={editando.numero}
                  onChange={(e) => setEditando((v) => ({ ...v, numero: e.target.value }))}
                  required
                  autoFocus
                  className={CAMPO}
                />
              </div>

              {editando.id && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editando.activa}
                    onChange={(e) => setEditando((v) => ({ ...v, activa: e.target.checked }))}
                    className="size-4 accent-mocha"
                  />
                  <span>Activa (aparece en la venta)</span>
                </label>
              )}

              <div className="flex gap-3 pt-2">
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
          </div>
        </div>
      )}

      {/* Confirmación de borrado */}
      {eliminando && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-hueso p-6 text-tinta">
            <h2 className="text-xl font-bold text-mocha">¿Eliminar mesa {eliminando.numero}?</h2>
            <p className="mt-2 text-piedra">
              Esta acción no se puede deshacer. Si ya tiene comandas, el sistema no te va a dejar
              borrarla.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setEliminando(null)}
                disabled={guardando}
                className="flex-1 rounded-xl px-4 py-3 font-semibold text-mocha hover:bg-latte/40 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={eliminar}
                disabled={guardando}
                className="flex-1 rounded-xl bg-red-700 px-4 py-3 text-lg font-semibold text-latte hover:bg-red-800 disabled:opacity-40"
              >
                {guardando ? 'Borrando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}