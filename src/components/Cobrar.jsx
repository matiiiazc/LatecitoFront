import { useState } from 'react'

const dinero = (n) => `$${Math.round(n).toLocaleString('es-AR')}`

const METODOS = [
  { id: 'efectivo', etiqueta: 'Efectivo' },
  { id: 'tarjeta', etiqueta: 'Tarjeta' },
  { id: 'transferencia', etiqueta: 'Transferencia' },
  { id: 'mercadopago', etiqueta: 'MercadoPago' },
]

const CAMPO =
  'w-full rounded-xl border border-linea bg-white px-4 py-3 text-lg tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha'

// Cobro. En efectivo se pide cuánto recibió el cliente para sacar el vuelto
export default function Cobrar({ total, enviando, error, onConfirmar, onCancelar }) {
  const [metodo, setMetodo] = useState('efectivo')
  const [recibido, setRecibido] = useState('')

  const recibidoN = Number(String(recibido).replace(',', '.')) || 0
  const vuelto = recibidoN - total
  const alcanza = metodo !== 'efectivo' || recibidoN >= total

  function confirmar(e) {
    e.preventDefault()
    if (!alcanza) return
    onConfirmar(metodo)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/60 p-4 sm:items-center">
      <form
        onSubmit={confirmar}
        className="w-full max-w-md rounded-2xl bg-hueso p-6 text-tinta shadow-xl"
      >
        <h2 className="text-2xl font-bold text-mocha">Cobrar</h2>
        <p className="mt-1 text-3xl font-extrabold tabular-nums text-espresso">{dinero(total)}</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {METODOS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetodo(m.id)}
              aria-pressed={metodo === m.id}
              className={`rounded-xl px-4 py-3 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha ${
                metodo === m.id
                  ? 'bg-espresso text-latte'
                  : 'border border-linea bg-white text-mocha hover:bg-latte/40'
              }`}
            >
              {m.etiqueta}
            </button>
          ))}
        </div>

        {metodo === 'efectivo' && (
          <div className="mt-5">
            <label htmlFor="recibido" className="mb-1 block font-medium">
              Efectivo recibido
            </label>
            <input
              id="recibido"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              autoFocus
              value={recibido}
              onChange={(e) => setRecibido(e.target.value)}
              placeholder={String(Math.ceil(total))}
              className={CAMPO}
            />
            {recibido !== '' && (
              <p
                className={`mt-2 rounded-xl px-4 py-3 font-semibold ${
                  vuelto >= 0
                    ? 'bg-latte/40 text-mocha'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {vuelto >= 0 ? `Vuelto: ${dinero(vuelto)}` : 'Falta efectivo'}
              </p>
            )}
            {!alcanza && recibido !== '' && (
              <p className="mt-2 text-sm text-piedra">
                Te falta {dinero(total - recibidoN)}.
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-red-800">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 rounded-xl px-4 py-3 font-semibold text-mocha hover:bg-latte/40 focus-visible:outline-2 focus-visible:outline-mocha"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={enviando || !alcanza}
            className="flex-1 rounded-xl bg-espresso px-4 py-3 text-lg font-semibold text-latte transition-colors hover:bg-mocha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha disabled:opacity-60"
          >
            {enviando ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  )
}
