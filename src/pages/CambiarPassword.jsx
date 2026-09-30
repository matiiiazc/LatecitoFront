import { useState } from 'react'
import { useAuth } from '../useAuth'

const CAMPO =
  'w-full rounded-xl border border-linea bg-white px-4 py-3 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha'

// Mismos mínimos que valida la API
const MINIMO = { admin: 10, caja: 6 }

export default function CambiarPassword({ obligatorio = false }) {
  const usuario = useAuth((s) => s.usuario)
  const cambiarPassword = useAuth((s) => s.cambiarPassword)
  const logout = useAuth((s) => s.logout)

  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const minimo = MINIMO[usuario.rol]

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setListo(false)

    if (nueva.length < minimo) {
      return setError(`La nueva contraseña tiene que tener al menos ${minimo} caracteres`)
    }
    if (nueva !== repetida) {
      return setError('Las contraseñas nuevas no coinciden')
    }

    setEnviando(true)
    try {
      await cambiarPassword(actual, nueva)
      setListo(true)
      setActual('')
      setNueva('')
      setRepetida('')
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  const formulario = (
    <form onSubmit={enviar} className="w-full max-w-sm space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-mocha">
          {obligatorio ? 'Elegí tu contraseña' : 'Cambiar contraseña'}
        </h1>
        {obligatorio && (
          <p className="mt-2 text-piedra">
            La contraseña que te dieron es temporal. Elegí una que solo sepas vos.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="actual" className="mb-1 block font-medium">
          {obligatorio ? 'Contraseña temporal' : 'Contraseña actual'}
        </label>
        <input
          id="actual"
          type="password"
          autoComplete="current-password"
          required
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          className={CAMPO}
        />
      </div>

      <div>
        <label htmlFor="nueva" className="mb-1 block font-medium">
          Contraseña nueva
        </label>
        <input
          id="nueva"
          type="password"
          autoComplete="new-password"
          required
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          className={CAMPO}
        />
        <p className="mt-1 text-sm text-piedra">Mínimo {minimo} caracteres.</p>
      </div>

      <div>
        <label htmlFor="repetida" className="mb-1 block font-medium">
          Repetí la contraseña nueva
        </label>
        <input
          id="repetida"
          type="password"
          autoComplete="new-password"
          required
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          className={CAMPO}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-800">
          {error}
        </p>
      )}
      {listo && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800">
          Contraseña cambiada. Ya quedó guardada.
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-xl bg-espresso px-4 py-3 text-lg font-semibold text-latte transition-colors hover:bg-mocha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha disabled:opacity-60"
      >
        {enviando ? 'Guardando...' : 'Guardar contraseña'}
      </button>

      {obligatorio && (
        <button
          type="button"
          onClick={() => logout()}
          className="w-full rounded-xl px-4 py-3 text-mocha hover:bg-latte/40 focus-visible:outline-2 focus-visible:outline-mocha"
        >
          Salir
        </button>
      )}
    </form>
  )

  if (obligatorio) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hueso p-6 text-tinta">
        {formulario}
      </div>
    )
  }
  return <div className="p-8 text-tinta">{formulario}</div>
}
