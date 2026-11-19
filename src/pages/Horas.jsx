import { useEffect, useState } from 'react'
import { api } from '../api'
import { imprimirTexto, ANCHO, centrar, alineado } from '../utils/imprimir'

// Cotización de minutos de trabajo. Los minutos salen de los turnos de caja ya
// cerrados (de abrir a cerrar) y se pagan por minuto trabajado. Los turnos de
// menos de 5 minutos no cuentan: son aperturas y cierres accidentales.
// El precio del minuto se tipea a mano porque cambia según el día.

const TARJETA = 'rounded-2xl border border-linea bg-white p-5'
const CAMPOS =
  'w-full rounded-xl border border-linea bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha'

const pesos = (n) =>
  '$' + (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const minutosTexto = (n) => `${Math.round(Number(n) || 0).toLocaleString('es-AR')} min`

// La API nueva manda minutos; si todavía responde la vieja, se calculan
const minutosDe = (e) => (e.minutos != null ? e.minutos : Math.round((e.horas ?? 0) * 60))

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
  const minutosTotales = elegidos.reduce((n, e) => n + minutosDe(e), 0)
  const precioNum = aNumero(precio)
  const precioValido = precio.trim() !== '' && Number.isFinite(precioNum) && precioNum >= 0
  const total = precioValido ? minutosTotales * precioNum : null

  function alternar(id) {
    setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  // Arma el resumen como texto monoespaciado para la térmica
  function imprimirResumen() {
    const sep = '='.repeat(ANCHO)
    const lin = '-'.repeat(ANCHO)
    const lineas = []

    lineas.push(sep)
    lineas.push(centrar('LATTECITO'))
    lineas.push(centrar('MINUTOS DE TRABAJO'))
    lineas.push(sep)
    lineas.push(alineado('Fecha', new Date().toLocaleDateString('es-AR')))
    lineas.push(lin)
    if (elegidos.length === 0) {
      lineas.push('Sin empleados seleccionados')
    } else {
      for (const e of elegidos) {
        const mins = minutosDe(e)
        const detalle = precioValido ? `${mins} min x ${pesos(precioNum)}` : `${mins} min`
        const monto = precioValido ? pesos(mins * precioNum) : ''
        lineas.push(alineado(`${e.nombre}  ${detalle}`, monto))
      }
    }
    lineas.push(lin)
    lineas.push(
      alineado(`TOTAL ${minutosTotales} min`, precioValido ? pesos(total) : '(sin precio)')
    )
    lineas.push(sep)
    lineas.push('')
    lineas.push('')

    imprimirTexto(lineas.join('\n'))
  }

  if (cargando) return <p className="text-piedra">Cargando...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className={TARJETA}>
        <h2 className="text-xl font-extrabold text-espresso">Cotizar minutos de trabajo</h2>
        <p className="mt-1 text-sm text-piedra">
          Los minutos se suman desde que se abre la caja hasta que se cierra, y se pagan por minuto
          trabajado. Los turnos de menos de 5 minutos no cuentan.
        </p>

        <div className="mt-4">
          <label htmlFor="precio-minuto" className="mb-1 block text-sm font-medium text-piedra">
            Precio del minuto
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-piedra">
              $
            </span>
            <input
              id="precio-minuto"
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
                {minutosTexto(minutosDe(e))}{' '}
                <span className="text-xs">
                  ({e.turnos.length} turnos
                  {e.ignorados
                    ? `, ${e.ignorados} ${e.ignorados === 1 ? 'descartado' : 'descartados'}`
                    : ''}
                  )
                </span>
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
                  {minutosTexto(minutosDe(e))}
                  {precioValido && <span className="text-piedra"> × {pesos(precioNum)}</span>}
                  {precioValido && (
                    <span className="ml-2 font-semibold">
                      {pesos(minutosDe(e) * precioNum)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-linea pt-3 text-base font-bold">
            <span className="text-espresso">Total a abonar</span>
            <span className="tabular-nums text-espresso">
              {minutosTexto(minutosTotales)}{' '}
              {precioValido ? (
                <span className="ml-2">{pesos(total)}</span>
              ) : (
                <span className="font-normal text-piedra">(poné el precio)</span>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={imprimirResumen}
            className="mt-4 w-full rounded-xl bg-espresso px-4 py-3 font-semibold text-latte transition-colors hover:bg-mocha"
          >
            Imprimir resumen
          </button>
        </div>
      )}
    </div>
  )
}