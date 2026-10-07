import { useEffect, useState } from 'react'
import { useTurno } from '../turno'

// Pantalla del mostrador. Dos estados: no hay turno abierto y se elige perfil,
// o hay turno abierto y se ve quién atiende y cuánto va.
//
// Elegir perfil no pide contraseña: es una declaración de la persona, no una
// prueba de identidad. Solo la computadora del mostrador (con su sesión
// abierta) llega a esta pantalla.

const ZONA = 'America/Argentina/Buenos_Aires'
const ar = (opciones) => new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, ...opciones })
const hora = (iso) => ar({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const pesos = (n) =>
  '$' + (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

// Lee lo que se tipea en un campo de plata. En Argentina se escribe con punto
// para los miles y coma para los decimales, y el teclado del celular manda
// cualquiera de los dos: "20.000" son veinte mil y "20,5" son veinte con cinco.
// Number() no entiende eso, por eso a "20.000" le daba NaN y el cierre se
// quedaba sin botón de confirmar.
function aNumeroPlata(txt) {
  let s = String(txt).trim().replace(/[^\d.,-]/g, '')
  if (s === '') return NaN
  if (s.includes(',')) {
    // Si hay coma es el separador decimal y los puntos son de miles
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // Solo puntos, y todos grupos de tres: son miles, no decimales
    s = s.replace(/\./g, '')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

const CAMPOS =
  'w-full rounded-xl border border-linea bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha'
const BOTON =
  'rounded-xl bg-espresso px-4 py-3 font-semibold text-latte transition-colors hover:bg-mocha disabled:cursor-not-allowed disabled:opacity-50'
const TARJETA = 'rounded-2xl border border-linea bg-white p-5'
const ERROR = 'rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800'

// --- Pantalla principal ---

export default function TurnoCaja() {
  const { turno, perfiles, cargando, cargado, cargar, cargarPerfiles } = useTurno()

  useEffect(() => {
    cargar()
    cargarPerfiles()
  }, [cargar, cargarPerfiles])

  // Se refresca el turno al volver a esta pantalla, para que muestre lo que
  // pasó mientras el usuario estaba en otra parte
  useEffect(() => {
    if (cargado) cargar()
  }, [cargado, cargar])

  if (!turno) return <AbrirTurno perfiles={perfiles} cargando={cargando} />

  return <TurnoAbierto turno={turno} perfiles={perfiles} />
}

// --- Abrir el turno: elegir perfil y contar la base ---

function AbrirTurno({ perfiles, cargando }) {
  const abrir = useTurno((s) => s.abrir)
  const [elegido, setElegido] = useState(null)
  const [base, setBase] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function confirmar() {
    setGuardando(true)
    setError('')
    try {
      // Lo que se typea viene con puntos o comas; se manda en pesos planos
      const limpio = aNumeroPlata(base)
      if (!Number.isFinite(limpio) || limpio < 0) throw new Error('Poné un importe válido')
      await abrir(elegido.id, limpio)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={TARJETA}>
        <p className="text-sm text-piedra">Ahora mismo</p>
        <h2 className="text-2xl font-extrabold text-espresso">No hay nadie atendiendo</h2>
        <p className="mt-1 text-sm text-piedra">¿Quién abre el turno?</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {perfiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setElegido(p)}
              className={`rounded-2xl border-2 px-3 py-5 text-lg font-bold transition-colors ${
                elegido?.id === p.id
                  ? 'border-espresso bg-latte/60 text-espresso'
                  : 'border-linea bg-white text-tinta hover:border-mocha'
              }`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      </div>

      {elegido && (
        <div className={TARJETA}>
          <h3 className="font-semibold text-espresso">Abrir el turno de {elegido.nombre}</h3>
          <p className="mt-1 text-sm text-piedra">
            Contá cuánta plata hay en la gaveta ahora. Es el cambio para dar vuelto: al cerrar, el
            sistema lo suma a lo que se cobre en efectivo.
          </p>
          <div className="mt-4">
            <label htmlFor="base" className="mb-1 block text-sm font-medium text-piedra">
              Base en efectivo
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-piedra">
                $
              </span>
              <input
                id="base"
                value={base}
                onChange={(e) => setBase(e.target.value)}
                inputMode="decimal"
                autoFocus
                placeholder="0"
                className={`${CAMPOS} pl-7 text-lg font-semibold tabular-nums`}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className={`${ERROR} mt-4`}>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={confirmar}
            disabled={guardando}
            className={`${BOTON} mt-5 w-full py-4 text-lg`}
          >
            {guardando ? 'Abriendo...' : 'Abrir turno'}
          </button>
        </div>
      )}

      {cargando && <p className="text-center text-xs text-piedra">Actualizando...</p>}
    </div>
  )
}

// --- Turno abierto ---

function TurnoAbierto({ turno, perfiles }) {
  const [cerrando, setCerrando] = useState(false)

  const efectivo = turno.por_metodo.find((m) => m.metodo === 'efectivo')
  const mp = turno.por_metodo.find((m) => m.metodo === 'mercadopago')
  const transferencia = turno.por_metodo.find((m) => m.metodo === 'transferencia')
  const otros = turno.por_metodo.filter(
    (m) => m.metodo !== 'efectivo' && m.metodo !== 'mercadopago' && m.metodo !== 'transferencia',
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-green-300 bg-green-50 p-5">
        <p className="text-sm text-green-900">Atendiendo</p>
        <p className="text-2xl font-extrabold text-green-900">{turno.usuario}</p>
        <p className="mt-1 text-sm text-green-900">Desde las {hora(turno.abierto_at)}</p>
      </div>

      <div className={TARJETA}>
        <p className="text-sm text-piedra">Vendido en este turno</p>
        <p className="text-3xl font-extrabold tabular-nums text-espresso">{pesos(turno.vendido)}</p>
        <p className="mt-1 text-sm text-piedra">
          {turno.comandas} {turno.comandas === 1 ? 'venta' : 'ventas'}
        </p>

        <ul className="mt-4 flex flex-col gap-1 border-t border-linea pt-3 text-sm">
          <li className="flex justify-between">
            <span className="text-piedra">Efectivo (va a la gaveta)</span>
            <span className="font-semibold tabular-nums text-tinta">
              {pesos(efectivo?.total ?? 0)}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-piedra">Transferencia</span>
            <span className="font-semibold tabular-nums text-tinta">
              {pesos(transferencia?.total ?? 0)}
            </span>
          </li>
          <li className="flex justify-between rounded-lg bg-mocha/10 px-2 py-1">
            <span className="font-medium text-mocha">Mercado Pago</span>
            <span className="font-semibold tabular-nums text-mocha">
              {pesos(mp?.total ?? 0)}
            </span>
          </li>
          {otros.map((m) => (
            <li key={m.metodo} className="flex justify-between">
              <span className="text-piedra capitalize">{m.metodo}</span>
              <span className="tabular-nums text-tinta">{pesos(m.total)}</span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-piedra">
          Base con la que arrancó el turno: {pesos(turno.base_efectivo)}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setCerrando(true)}
        className={`${BOTON} w-full py-5 text-xl`}
      >
        Cerrar caja
      </button>

      {cerrando && <CerrarCaja turno={turno} perfiles={perfiles} onCancelar={() => setCerrando(false)} />}
    </div>
  )
}

// --- Cerrar caja: el conteo ---

function CerrarCaja({ turno, perfiles, onCancelar }) {
  const { cerrar } = useTurno()
  // El turno lo abrió un perfil concreto: ese queda elegido de entrada
  const [elegido, setElegido] = useState(
    perfiles.find((p) => p.id === turno.usuario_id) ?? null,
  )
  const [contado, setContado] = useState('')
  const [contadoTrans, setContadoTrans] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [resumen, setResumen] = useState(null)

  const efectivo = turno.por_metodo.find((m) => m.metodo === 'efectivo')
  const transferencia = turno.por_metodo.find((m) => m.metodo === 'transferencia')
  const mp = turno.por_metodo.find((m) => m.metodo === 'mercadopago')
  const resto = turno.por_metodo.filter(
    (m) => m.metodo !== 'efectivo' && m.metodo !== 'transferencia' && m.metodo !== 'mercadopago',
  )

  // La gaveta debería tener la base más lo cobrado en efectivo. Las
  // transferencias se concilian aparte. El resto (tarjeta, Mercado Pago) se
  // muestra pero no se cuenta.
  const esperado = turno.base_efectivo + (efectivo?.total ?? 0)
  const esperadoTrans = transferencia?.total ?? 0
  const numeroContado = aNumeroPlata(contado)
  const numeroTrans = aNumeroPlata(contadoTrans)
  const diferencia = Math.round((numeroContado - esperado) * 100) / 100
  const diferenciaTrans = Math.round((numeroTrans - esperadoTrans) * 100) / 100
  // La explicación se pide cuando lo que se tipeó no da con lo esperado
  const descuadre =
    (contado.trim() !== '' && Number.isFinite(numeroContado) && diferencia !== 0) ||
    (contadoTrans.trim() !== '' && Number.isFinite(numeroTrans) && diferenciaTrans !== 0)

  async function confirmar() {
    if (!Number.isFinite(numeroContado)) {
      setError('Poné un importe de efectivo válido, por ejemplo 33000 o 33.000')
      return
    }
    if (contadoTrans.trim() !== '' && (!Number.isFinite(numeroTrans) || numeroTrans < 0)) {
      setError('Poné un importe de transferencia válido')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const r = await cerrar(
        elegido.id,
        numeroContado,
        contadoTrans.trim() === '' ? 0 : numeroTrans,
        nota.trim() || undefined,
      )
      setResumen(r)
    } catch (e) {
      setError(e.message)
      // El servidor avisa cuando la diferencia necesita explicación
      if (e.datos?.requiere_nota) document.getElementById('nota')?.focus()
    } finally {
      setGuardando(false)
    }
  }

  if (resumen) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-green-300 bg-green-50 p-5 text-center">
          <p className="text-3xl">✓</p>
          <h2 className="mt-1 text-xl font-extrabold text-green-900">Turno cerrado</h2>
          <p className="mt-1 text-sm text-green-900">Salida registrada a las {hora(resumen.cerrado_at)}</p>
        </div>
        <div className={TARJETA}>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-piedra">Base con la que arrancó</dt>
              <dd className="tabular-nums text-tinta">{pesos(resumen.base_efectivo)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-piedra">Esperado en la gaveta</dt>
              <dd className="font-semibold tabular-nums text-tinta">{pesos(resumen.esperado_efectivo)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-piedra">Efectivo contado</dt>
              <dd className="font-semibold tabular-nums text-tinta">{pesos(resumen.contado_efectivo)}</dd>
            </div>
            <div className="flex justify-between border-t border-linea pt-2">
              <dt className="text-piedra">Gaveta</dt>
              <dd
                className={`font-bold tabular-nums ${
                  resumen.diferencia === 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {resumen.diferencia === 0 ? 'Cuadró' : pesos(resumen.diferencia)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-linea pt-2">
              <dt className="text-piedra">Transferencia</dt>
              <dd
                className={`font-bold tabular-nums ${
                  resumen.diferencia_transferencia === 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {resumen.diferencia_transferencia === 0
                  ? 'Cuadró'
                  : pesos(resumen.diferencia_transferencia)}{' '}
                <span className="font-normal text-piedra">
                  ({pesos(resumen.contado_transferencia)} contado vs {pesos(resumen.esperado_transferencia)})
                </span>
              </dd>
            </div>
          </dl>
          {resumen.nota && (
            <p className="mt-3 rounded-xl bg-latte/40 p-3 text-sm text-tinta">
              <span className="font-semibold">Explicación:</span> {resumen.nota}
            </p>
          )}
        </div>
        <p className="text-center text-sm text-piedra">
          Ya puede abrir su turno la próxima persona.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={TARJETA}>
        <h2 className="text-lg font-bold text-espresso">Cerrar caja</h2>
        <p className="mt-1 text-sm text-piedra">
          Contá el efectivo que queda en la gaveta y lo que entró por transferencia. Si algún
          conteo no da con lo esperado, hay que explicarlo.
        </p>

        <dl className="mt-4 rounded-xl bg-latte/40 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-piedra">Base con la que arrancó</dt>
            <dd className="tabular-nums text-tinta">{pesos(turno.base_efectivo)}</dd>
          </div>
          <div className="mt-1 flex justify-between">
            <dt className="text-piedra">Efectivo cobrado en el turno</dt>
            <dd className="tabular-nums text-tinta">{pesos(efectivo?.total ?? 0)}</dd>
          </div>
          <div className="mt-1 flex justify-between">
            <dt className="text-piedra">Debería haber en la gaveta</dt>
            <dd className="tabular-nums text-tinta">{pesos(esperado)}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-latte pt-2">
            <dt className="text-piedra">Transferencia cobrada</dt>
            <dd className="tabular-nums text-tinta">{pesos(esperadoTrans)}</dd>
          </div>
          <div className="mt-1 flex justify-between">
            <dt className="text-piedra">Debería haber en transferencia</dt>
            <dd className="tabular-nums text-tinta">{pesos(esperadoTrans)}</dd>
          </div>
        </dl>

        <dl className="mt-2 rounded-xl border border-dashed border-linea p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-piedra">
            No se cuenta (no deja plata en el local)
          </p>
          <div className="mt-2 flex justify-between">
            <dt className="font-medium text-tinta">Mercado Pago</dt>
            <dd className="tabular-nums text-tinta">{pesos(mp?.total ?? 0)}</dd>
          </div>
          {resto.map((m) => (
            <div key={m.metodo} className="mt-1 flex justify-between">
              <dt className="text-piedra capitalize">{m.metodo}</dt>
              <dd className="tabular-nums text-piedra">{pesos(m.total)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4">
          <label htmlFor="perfil-cierre" className="mb-1 block text-sm font-medium text-piedra">
            ¿Quién cierra?
          </label>
          <select
            id="perfil-cierre"
            value={elegido?.id ?? ''}
            onChange={(e) =>
              setElegido(perfiles.find((p) => String(p.id) === e.target.value))
            }
            className={CAMPOS}
          >
            {perfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          {elegido?.id !== turno.usuario_id && (
            <p className="mt-1 text-xs text-amber-800">
              El turno abierto es de {turno.usuario}. Solo {turno.usuario} puede cerrarlo.
            </p>
          )}
        </div>

        <div className="mt-4">
          <label htmlFor="contado" className="mb-1 block text-sm font-medium text-piedra">
            Efectivo contado
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-piedra">
              $
            </span>
            <input
              id="contado"
              value={contado}
              onChange={(e) => setContado(e.target.value)}
              inputMode="decimal"
              autoFocus
              placeholder="33000"
              className={`${CAMPOS} pl-7 text-2xl font-bold tabular-nums`}
            />
          </div>
          <p className="mt-1 text-xs text-piedra">
            Puede ir con punto de miles o con coma: 33.000 y 33,000 valen lo mismo.
          </p>
          {contado.trim() !== '' && Number.isFinite(numeroContado) && (
            <p
              className={`mt-2 text-sm font-semibold ${
                diferencia === 0 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {diferencia === 0
                ? 'Cuadra con lo esperado'
                : `Diferencia: ${diferencia > 0 ? 'sobran' : 'faltan'} ${pesos(Math.abs(diferencia))}`}
            </p>
          )}
        </div>

        <div className="mt-4">
          <label htmlFor="contado-trans" className="mb-1 block text-sm font-medium text-piedra">
            Transferencia contada
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-piedra">
              $
            </span>
            <input
              id="contado-trans"
              value={contadoTrans}
              onChange={(e) => setContadoTrans(e.target.value)}
              inputMode="decimal"
              placeholder={pesos(esperadoTrans)}
              className={`${CAMPOS} pl-7 text-2xl font-bold tabular-nums`}
            />
          </div>
          <p className="mt-1 text-xs text-piedra">
            Puede quedar vacío si se pagó todo en efectivo.
          </p>
          {contadoTrans.trim() !== '' && Number.isFinite(numeroTrans) && (
            <p
              className={`mt-2 text-sm font-semibold ${
                diferenciaTrans === 0 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {diferenciaTrans === 0
                ? 'Cuadra con lo esperado'
                : `Diferencia: ${diferenciaTrans > 0 ? 'sobran' : 'faltan'} ${pesos(Math.abs(diferenciaTrans))}`}
            </p>
          )}
        </div>

        {descuadre && (
          <div className="mt-4">
            <label htmlFor="nota" className="mb-1 block text-sm font-medium text-red-800">
              Contá por qué no da el conteo <span className="text-red-700">(obligatorio)</span>
            </label>
            <textarea
              id="nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder="Por ejemplo: se tomó un café sin cobrar"
              className={CAMPOS}
            />
          </div>
        )}

        {error && <p role="alert" className={`${ERROR} mt-4`}>{error}</p>}

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancelar} className={`${BOTON} flex-1 bg-piedra`}>
            Volver
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={
              guardando ||
              conteoInvalido(contado) ||
              (contadoTrans.trim() !== '' &&
                (!Number.isFinite(numeroTrans) || numeroTrans < 0)) ||
              elegido?.id !== turno.usuario_id ||
              (descuadre && nota.trim().length < 3)
            }
            className={`${BOTON} flex-1`}
          >
            {guardando ? 'Cerrando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function conteoInvalido(contado) {
  if (String(contado).trim() === '') return true
  const n = aNumeroPlata(contado)
  return !Number.isFinite(n) || n < 0
}
