import { useState } from 'react'
import { useAuth } from '../useAuth'

const CAMPO =
  'w-full rounded-xl border border-linea bg-white px-4 py-3 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha'

export default function Login() {
  const login = useAuth((s) => s.login)
  const aviso = useAuth((s) => s.aviso)

  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      await login(usuario.trim(), password)
    } catch (err) {
      setError(err.message)
      setPassword('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-hueso md:grid-cols-2">
      <div className="flex min-h-48 flex-col justify-end bg-espresso p-8 text-latte md:p-14">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-8xl">Lattecito</h1>
        <p className="mt-3 text-latte/70">Café al paso</p>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={enviar} className="w-full max-w-sm space-y-5">
          <h2 className="text-2xl font-bold text-mocha">Ingresar</h2>

          {aviso && !error && (
            <p className="rounded-xl bg-latte/40 px-4 py-3 text-mocha">{aviso}</p>
          )}

          <div>
            <label htmlFor="usuario" className="mb-1 block font-medium">
              Usuario
            </label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className={CAMPO}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block font-medium">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={verPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${CAMPO} pr-24`}
              />
              <button
                type="button"
                onClick={() => setVerPassword(!verPassword)}
                className="absolute inset-y-0 right-2 my-2 rounded-lg px-3 text-sm text-mocha hover:bg-latte/40 focus-visible:outline-2 focus-visible:outline-mocha"
              >
                {verPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-800">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl bg-espresso px-4 py-3 text-lg font-semibold text-latte transition-colors hover:bg-mocha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha disabled:opacity-60"
          >
            {enviando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
