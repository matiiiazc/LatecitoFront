import { useState } from 'react'

const dinero = (n) => `$${Math.round(n).toLocaleString('es-AR')}`

const METODOS = [
  { id: 'efectivo', etiqueta: 'Efectivo' },
  { id: 'tarjeta', etiqueta: 'Tarjeta' },
  { id: 'transferencia', etiqueta: 'Transferencia' },
  { id: 'combinado', etiqueta: 'Combinado' },
]

const CAMPO =
  'w-full rounded-xl border border-linea bg-white px-4 py-3 text-lg tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha'

// Lee lo que se tipea en un campo de plata. En Argentina se escribe con punto
// para los miles y coma para los decimales: "20.000" son veinte mil.
function aNumeroPlata(txt) {
  let s = String(txt).trim().replace(/[^\d.,-]/g, '')
  if (s === '') return 0
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

// Cobro. En efectivo se pide cuánto recibió el cliente para sacar el vuelto.
// El pago combinado reparte la venta entre transferencia/tarjeta y el resto en
// efectivo (con vuelto), y se manda el detalle a la API.
export default function Cobrar({ total, enviando, error, onConfirmar, onCancelar }) {
  const [metodo, setMetodo] = useState('efectivo')
  const [recibido, setRecibido] = useState('')
  const [trans, setTrans] = useState('')
  const [tarjeta, setTarjeta] = useState('')

  const combinado = metodo === 'combinado'
  const transN = aNumeroPlata(trans)
  const tarjetaN = aNumeroPlata(tarjeta)
  // En combinado, lo que no va por transferencia ni tarjeta se cobra en efectivo
  const efectivo = combinado
    ? Math.round((total - (transN || 0) - (tarjetaN || 0)) * 100) / 100
    : total

  const recibidoN = aNumeroPlata(recibido)
  const vuelto = recibidoN - efectivo

  const partes = (efectivo > 0 ? 1 : 0) + (transN > 0 ? 1 : 0) + (tarjetaN > 0 ? 1 : 0)
  const montosValidos =
    Number.isFinite(transN) && Number.isFinite(tarjetaN) && transN >= 0 && tarjetaN >= 0 && efectivo >= 0

  const alcanza = combinado
    ? montosValidos && partes >= 2 && (efectivo <= 0 || recibidoN >= efectivo)
    : metodo === 'efectivo'
      ? recibidoN >= total
      : true

  function confirmar(e) {
    e.preventDefault()
    if (!alcanza) return
    if (combinado) {
      onConfirmar({
        metodo_pago: 'combinado',
        pago_efectivo: efectivo,
        pago_transferencia: transN || 0,
        pago_tarjeta: tarjetaN || 0,
      })
    } else {
      onConfirmar({ metodo_pago: metodo })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/60 p-4 sm:items-center">
      <form
        onSubmit={confirmar}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-hueso p-6 text-tinta shadow-xl"
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

        {combinado && (
          <div className="mt-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="trans" className="mb-1 block text-sm font-medium">
                  Transferencia
                </label>
                <input
                  id="trans"
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={trans}
                  onChange={(e) => setTrans(e.target.value)}
                  placeholder="0"
                  className={CAMPO}
                />
              </div>
              <div>
                <label htmlFor="tarjeta" className="mb-1 block text-sm font-medium">
                  Tarjeta
                </label>
                <input
                  id="tarjeta"
                  type="text"
                  inputMode="decimal"
                  value={tarjeta}
                  onChange={(e) => setTarjeta(e.target.value)}
                  placeholder="0"
                  className={CAMPO}
                />
              </div>
            </div>

            <p
              className={`rounded-xl px-4 py-3 font-semibold ${
                efectivo < 0 ? 'bg-red-50 text-red-800' : 'bg-latte/40 text-mocha'
              }`}
            >
              {efectivo < 0
                ? 'Los montos superan el total'
                : `Se cobra en efectivo: ${dinero(efectivo)}`}
            </p>
          </div>
        )}

        {(metodo === 'efectivo' || (combinado && efectivo > 0)) && (
          <div className="mt-4">
            <label htmlFor="recibido" className="mb-1 block font-medium">
              Efectivo recibido
            </label>
            <input
              id="recibido"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              autoFocus={metodo === 'efectivo'}
              value={recibido}
              onChange={(e) => setRecibido(e.target.value)}
              className={CAMPO}
            />
            {recibido !== '' && (
              <p
                className={`mt-2 rounded-xl px-4 py-3 font-semibold ${
                  vuelto >= 0 ? 'bg-latte/40 text-mocha' : 'bg-red-50 text-red-800'
                }`}
              >
                {vuelto >= 0 ? `Vuelto: ${dinero(vuelto)}` : 'Falta efectivo'}
              </p>
            )}
            {!alcanza && recibido !== '' && vuelto < 0 && (
              <p className="mt-2 text-sm text-piedra">Te falta {dinero(efectivo - recibidoN)}.</p>
            )}
          </div>
        )}

        {combinado && partes < 2 && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Cargá cuánto va por transferencia y/o tarjeta; el resto se cobra en efectivo.
          </p>
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
