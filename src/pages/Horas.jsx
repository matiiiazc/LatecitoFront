import { useEffect, useState } from 'react'
import { api } from '../api'

// Cotización de horas de trabajo. Las horas salen de los turnos de caja ya
// cerrados (de abrir a cerrar) y cada turno se redondea SIEMPRE para arriba a
// la hora completa: cuatro horas y media se pagan como cinco, nunca a medias.
// El precio de la hora se tipea a mano porque cambia según el día.

const TARJETA = 'rounded-2xl border border-linea bg-white p-5'
const CAMPOS =
  'w-full rounded-xl border border-linea bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha'

const pesos = (n) =>
  '$' + (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

// Igual que en la caja: en Argentina se escribe 20.000 o 20,5 y Number() no entiende eso
function aNumero(txt) {
  let s = String(txt).trim().replace(/[^\d.,-]/g, '')
  if (s === '') return NaN
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

export default function Horas() {
  const [empleados, setEmpleados] = useState([])
  const [seleccion, setSeleccion] = useState([])
  const [precio, setPrecio] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const d = await api('/turnos/horas')
        if (!vivo) return
        setEmpleados(d.empleados)
        setSeleccion(d.empleados.map((e) => e.id))
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

  const elegidos = empleados.filter((e) => seleccion.includes(e.id))
  const horasTotales = elegidos.reduce((n, e) => n + e.horas, 0)
  const precioNum = aNumero(precio)
  const precioValido = precio.trim() !== '' && Number.isFinite(precioNum) && precioNum >= 0
  const total = precioValido ? horasTotales * precioNum : null

  function alternar(id) {
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  if (cargando) return <p className="text-piedra">Cargando...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className={TARJETA}>
        <h2 className="text-xl font-extrabold text-espresso">Cotizar horas de trabajo</h2>
        <p className="mt-1 text-sm text-piedra">
          Las horas se suman desde que se abre la caja hasta que se cierra, y cada turno se paga
          como hora completa: nunca a medias.
        </p>

        <div className="mt-4">
          <label htmlFor="precio-hora" className="mb-1 block text-sm font-medium text-piedra">
            Precio de la hora
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-piedra">
              $
            </span>
            <input
              id="precio-hora"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              inputMode="decimal"
              className={`${CAMPOS} pl-7 text-lg font-bold tabular-nums`}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-800">{error}</p>}
      </div>

      <div className={TARJETA}>
        <p className="text-sm font-semibold text-piedra">¿A quién se le paga?</p>
        <div className="mt-3 flex flex-col gap-2">
          {empleados.map((e) => (
            <label
              key={e.id}
              className={`flex cursor-pointer items-center justify-between rounded-xl border-2 px-4 py-3 transition-colors ${
                seleccion.includes(e.id)
                  ? 'border-espresso bg-latte/50'
                  : 'border-linea bg-white hover:border-mocha'
              }`}
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={seleccion.includes(e.id)}
                  onChange={() => alternar(e.id)}
                  className="h-5 w-5 accent-espresso"
                />
                <span className="font-semibold text-tinta">{e.nombre}</span>
              </span>
              <span className="tabular-nums text-piedra">
                {e.horas} h <span className="text-xs">({e.turnos.length} turnos)</span>
              </span>
            </label>
          ))}
          {empleados.length === 0 && (
            <p className="text-sm text-piedra">Todavía no hay ningún turno cerrado.</p>
          )}
        </div>
      </div>

      {elegidos.length > 0 && (
        <div className={TARJETA}>
          <p className="text-sm text-piedra">Resumen</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {elegidos.map((e) => (
              <li key={e.id} className="flex justify-between">
                <span className="text-tinta">{e.nombre}</span>
                <span className="tabular-nums text-tinta">
                  {e.horas} h
                  {precioValido && <span className="text-piedra"> × {pesos(precioNum)}</span>}
                  {precioValido && (
                    <span className="ml-2 font-semibold">{pesos(e.horas * precioNum)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-linea pt-3 text-base font-bold">
            <span className="text-espresso">Total a abonar</span>
            <span className="tabular-nums text-espresso">
              {horasTotales} h{' '}
              {precioValido ? (
                <span className="ml-2">{pesos(total)}</span>
              ) : (
                <span className="font-normal text-piedra">(poné el precio)</span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}