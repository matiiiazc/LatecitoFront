import { useEffect, useState } from 'react'
import { useTurno } from '../turno'
import { imprimirResumenTurno } from '../utils/imprimirTurno'

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

const PAGINA = 'mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:p-8'

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

  return <TurnoAbierto turno={turno} />
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
    <div className={PAGINA}>
      <header className="mb-1">
        <p className="text-sm text-piedra">Caja del día</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-espresso">
          No hay nadie atendiendo
        </h1>
        <p className="mt-1 text-sm text-piedra">¿Quién abre el turno?</p>
      </header>

      <div className={TARJETA}>
        <div className="grid grid-cols-2 gap-3">
          {perfiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setElegido(p)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors ${
                elegido?.id === p.id
                  ? 'border-espresso bg-latte/60'
                  : 'border-linea bg-white hover:border-mocha'
              }`}
            >
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                  elegido?.id === p.id ? 'bg-espresso text-latte' : 'bg-hueso text-mocha'
                }`}
              >
                {p.nombre.slice(0, 1)}
              </span>
              <span>
                <span className="block font-bold text-tinta">{p.nombre}</span>
                <span className="block text-xs text-piedra">Abrir turno</span>
              </span>
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

// El turno abierto muestra lo más importante del mostrador en una sola pasada:
// quién atiende, hace cuánto, cuánto vendió y cómo se cobró. Lo de abajo es lo
// que la persona hace al final del día: cerrar y contar la caja.
function TurnoAbierto({ turno }) {
  const [cerrando, setCerrando] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)
  const traer = useTurno((s) => s.traer)

  const efectivo = turno.por_metodo.find((m) => m.metodo === 'efectivo')
  const transferencia = turno.por_metodo.find((m) => m.metodo === 'transferencia')
  const otros = turno.por_metodo.filter(
    (m) => m.metodo !== 'efectivo' && m.metodo !== 'transferencia',
  )

  // La pantalla puede tener rato abierta: antes de imprimir se le pide el turno
  // al servidor, así el resumen sale con lo vendido hasta este momento y no con
  // los totales viejos que quedaron en memoria (parecía que no se había vendido
  // nada). Si falla la consulta, se imprime lo que ya se tiene en pantalla.
  async function imprimir() {
    setImprimiendo(true)
    try {
      const fresco = await traer()
      await imprimirResumenTurno(fresco ?? turno)
    } catch {
      await imprimirResumenTurno(turno)
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <div className={PAGINA}>
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-piedra">Turno de caja</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-espresso">El mostrador está abierto</h1>
        </div>
        <p className="shrink-0 text-sm text-piedra">
          {turno.comandas} {turno.comandas === 1 ? 'venta' : 'ventas'}
        </p>
      </header>

      {/* Quién atiende */}
      <section className="overflow-hidden rounded-3xl bg-espresso text-latte">
        <div className="bg-gradient-to-br from-espresso via-[#3a2920] to-mocha p-6 md:p-8">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-latte text-xl font-extrabold text-espresso">
              {turno.usuario.slice(0, 1)}
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-latte/70">Atendiendo ahora</p>
              <p className="text-3xl font-extrabold leading-none">{turno.usuario}</p>
              <p className="mt-1.5 text-sm text-latte/70">
                Desde las <span className="font-semibold text-latte">{hora(turno.abierto_at)}</span> ·{' '}
                <EnTurnoDesde abiertoAt={turno.abierto_at} />
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-end justify-between gap-4 border-t border-mocha pt-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-latte/70">Vendido en este turno</p>
              <p className="mt-1 text-4xl font-extrabold tabular-nums md:text-5xl">
                {pesos(turno.vendido)}
              </p>
            </div>
            <p className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-sm text-latte/90">
              Base {pesos(turno.base_efectivo)}
            </p>
          </div>
        </div>
      </section>

      {/* Cómo se cobró */}
      <section className={TARJETA}>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold text-espresso">Cómo se cobró</h2>
          <p className="text-xs text-piedra">Efectivo y transferencia se cuentan al cerrar</p>
        </div>

        <ul className="flex flex-col divide-y divide-linea">
          <FilaCobro
            etiqueta="Efectivo"
            detalle="Va a la gaveta"
            total={efectivo?.total ?? 0}
            destacado="text-emerald-700"
          />
          <FilaCobro
            etiqueta="Transferencia"
            detalle="Se concilia aparte"
            total={transferencia?.total ?? 0}
            destacado="text-espresso"
          />
          {otros.map((m) => (
            <FilaCobro
              key={m.metodo}
              etiqueta={m.metodo}
              total={m.total}
              atenuado
            />
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={imprimir}
        disabled={imprimiendo}
        className="w-full rounded-2xl border border-linea bg-white px-6 py-4 text-base font-semibold text-mocha transition-colors hover:bg-latte/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha disabled:opacity-60"
      >
        {imprimiendo ? 'Buscando lo vendido...' : 'Imprimir resumen del turno'}
      </button>

      <button
        type="button"
        onClick={() => setCerrando(true)}
        className="w-full rounded-2xl bg-espresso px-6 py-5 text-xl font-bold text-latte shadow-lg shadow-espresso/20 transition-colors hover:bg-mocha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha"
      >
        Cerrar caja
      </button>

      {cerrando && <CerrarCaja turno={turno} onCancelar={() => setCerrando(false)} />}
    </div>
  )
}

function FilaCobro({ etiqueta, detalle, total, destacado = 'text-tinta', atenuado = false }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className={`font-medium ${atenuado ? 'text-piedra' : 'text-tinta'}`}>{etiqueta}</p>
        {detalle && <p className="text-xs text-piedra">{detalle}</p>}
      </div>
      <p
        className={`shrink-0 text-lg font-bold tabular-nums ${
          atenuado ? 'text-piedra' : destacado
        }`}
      >
        {pesos(total)}
      </p>
    </li>
  )
}

// "Desde hace cuánto" con un tick cada 30 segundos, sin apretar nada
function EnTurnoDesde({ abiertoAt }) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])
  const ms = Math.max(0, ahora - new Date(abiertoAt).getTime())
  const horas = Math.floor(ms / 3600000)
  const minutos = Math.floor((ms % 3600000) / 60000)
  return horas === 0 ? `${minutos} min` : `${horas} h ${minutos} min`
}

// --- Cerrar caja: el conteo ---

// El cierre es una sola cosa con pasos: primero se muestra lo que se espera,
// después se carga lo que se contó y por último se confirma. Solo quien abrió
// el turno puede cerrarlo, así que no hay selector de persona.
function CerrarCaja({ turno, onCancelar }) {
  const { cerrar, cargar } = useTurno()
  const [contado, setContado] = useState('')
  const [contadoTrans, setContadoTrans] = useState('')
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [resumen, setResumen] = useState(null)

  const efectivo = turno.por_metodo.find((m) => m.metodo === 'efectivo')
  const transferencia = turno.por_metodo.find((m) => m.metodo === 'transferencia')
  const resto = turno.por_metodo.filter(
    (m) => m.metodo !== 'efectivo' && m.metodo !== 'transferencia',
  )

  // La gaveta debería tener la base más lo cobrado en efectivo. Las
  // transferencias se concilian aparte. El resto (tarjeta) se muestra pero no
  // se cuenta.
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
        turno.usuario_id,
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-espresso/50 backdrop-blur-sm">
      <div className="flex min-h-full items-end justify-center sm:items-center">
        <div className="w-full max-w-lg rounded-t-3xl bg-hueso pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl sm:rounded-3xl">
          {resumen ? (
            <CierreResultado
              resumen={resumen}
              turno={turno}
              onListo={() => {
                onCancelar()
                // El turno guardado ya quedó cerrado: al volver a la caja se
                // pide de nuevo para que muestre la pantalla de apertura.
                cargar()
              }}
            />
          ) : (
            <>
              {/* Cabecera del panel */}
              <div className="flex items-center justify-between border-b border-linea px-5 py-4">
                <div>
                  <h2 className="text-xl font-extrabold text-espresso">Cerrar caja</h2>
                  <p className="text-sm text-piedra">
                    Turno de <span className="font-semibold text-mocha">{turno.usuario}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCancelar}
                  aria-label="Cancelar el cierre"
                  className="rounded-xl p-2 text-piedra transition-colors hover:bg-latte/50 hover:text-tinta focus-visible:outline-2 focus-visible:outline-mocha"
                >
                  <IconoCerrar />
                </button>
              </div>

              <div className="flex flex-col gap-5 px-5 py-5">
                {/* 1. Lo que se espera */}
                <section>
                  <Paso n={1} titulo="Lo que se espera" />
                  <div className="mt-3 overflow-hidden rounded-2xl border border-linea bg-white">
                    <FilaEspera etiqueta="Base con la que arrancó" valor={pesos(turno.base_efectivo)} />
                    <FilaEspera etiqueta="Vendido en efectivo" valor={pesos(efectivo?.total ?? 0)} />
                    <div className="flex items-center justify-between gap-3 border-t-2 border-espresso bg-latte/30 px-4 py-3">
                      <p className="font-semibold text-espresso">Gaveta esperada</p>
                      <p className="text-xl font-extrabold tabular-nums text-espresso">
                        {pesos(esperado)}
                      </p>
                    </div>
                    <FilaEspera etiqueta="Transferencia esperada" valor={pesos(esperadoTrans)} />
                    <FilaEspera
                      etiqueta="Tarjeta y resto"
                      valor={pesos(resto.reduce((s, m) => s + m.total, 0))}
                      atenuado
                    />
                  </div>
                  <p className="mt-2 text-xs text-piedra">
                    Lo que entra por tarjeta no deja plata en el local, por eso no se cuenta.
                  </p>
                </section>

                {/* 2. El conteo */}
                <section>
                  <Paso n={2} titulo="Tu conteo" />
                  <div className="mt-3 flex flex-col gap-4">
                    <CampoConteo
                      id="contado"
                      etiqueta="Efectivo contado"
                      valor={contado}
                      onChange={setContado}
                      autoFocus
                      diferencia={contado.trim() !== '' && Number.isFinite(numeroContado) ? diferencia : null}
                    />
                    <CampoConteo
                      id="contado-trans"
                      etiqueta="Transferencia contada"
                      valor={contadoTrans}
                      onChange={setContadoTrans}
                      diferencia={
                        contadoTrans.trim() !== '' && Number.isFinite(numeroTrans)
                          ? diferenciaTrans
                          : null
                      }
                    />
                    <p className="-mt-1 text-xs text-piedra">
                      Transferencia puede quedar vacía si se pagó todo en efectivo.
                    </p>
                  </div>
                </section>

                {/* 3. Quién cierra */}
                <section>
                  <Paso n={3} titulo="Quién cierra" />
                  <div className="mt-3 flex items-center gap-3 rounded-2xl border border-linea bg-white px-4 py-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-espresso font-bold text-latte">
                      {turno.usuario.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-tinta">{turno.usuario}</p>
                      <p className="text-xs text-piedra">
                        Solo quien abrió el turno puede cerrarlo.
                      </p>
                    </div>
                  </div>
                </section>

                {descuadre && (
                  <section>
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
                  </section>
                )}

                {error && <p role="alert" className={ERROR}>{error}</p>}
              </div>

              {/* Acciones */}
              <div className="sticky bottom-0 flex gap-3 border-t border-linea bg-hueso px-5 pt-4 pb-2">
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
                    (descuadre && nota.trim().length < 3)
                  }
                  className={`${BOTON} flex-[2]`}
                >
                  {guardando ? 'Cerrando...' : 'Confirmar cierre'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Encabezado de cada paso del cierre
function Paso({ n, titulo }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-espresso text-sm font-bold text-latte">
        {n}
      </span>
      <h3 className="font-semibold text-tinta">{titulo}</h3>
    </div>
  )
}

function FilaEspera({ etiqueta, valor, atenuado = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-linea px-4 py-3 last:border-0 ${
        atenuado ? 'opacity-70' : ''
      }`}
    >
      <p className="text-sm text-piedra">{etiqueta}</p>
      <p className="tabular-nums font-semibold text-tinta">{valor}</p>
    </div>
  )
}

// Campo de plata con su estado en vivo: cuadra, faltan o sobran
function CampoConteo({ id, etiqueta, valor, onChange, diferencia, autoFocus = false }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-piedra">
        {etiqueta}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-piedra">
          $
        </span>
        <input
          id={id}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          autoFocus={autoFocus}
          className="w-full rounded-2xl border-2 border-linea bg-white py-4 pl-11 pr-4 text-3xl font-bold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha"
        />
        {diferencia !== null && (
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-sm font-bold ${
              diferencia === 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {diferencia === 0
              ? 'Cuadra'
              : diferencia > 0
                ? `Sobran ${pesos(Math.abs(diferencia))}`
                : `Faltan ${pesos(Math.abs(diferencia))}`}
          </span>
        )}
      </div>
    </div>
  )
}

// El resultado queda como está, sin pedir explicación: ya está guardado
function CierreResultado({ resumen, turno, onListo }) {
  return (
    <div className="flex flex-col gap-5 px-5 py-8">
      <div className="text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        <h2 className="mt-4 text-2xl font-extrabold text-emerald-900">Turno cerrado</h2>
        <p className="mt-1 text-sm text-piedra">
          Salida de {resumen.usuario} registrada a las {hora(resumen.cerrado_at)}.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-linea bg-white">
        <FilaEspera etiqueta="Base con la que arrancó" valor={pesos(resumen.base_efectivo)} />
        <FilaEspera etiqueta="Esperado en la gaveta" valor={pesos(resumen.esperado_efectivo)} />
        <FilaEspera etiqueta="Efectivo contado" valor={pesos(resumen.contado_efectivo)} />
        <div className="flex items-center justify-between gap-3 border-t-2 border-linea px-4 py-3">
          <p className="font-semibold text-tinta">Gaveta</p>
          <p
            className={`text-xl font-extrabold tabular-nums ${
              resumen.diferencia === 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {resumen.diferencia === 0 ? 'Cuadró' : pesos(resumen.diferencia)}
          </p>
        </div>
        <FilaEspera etiqueta="Transferencia esperada" valor={pesos(resumen.esperado_transferencia)} />
        <FilaEspera etiqueta="Transferencia contada" valor={pesos(resumen.contado_transferencia)} />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="font-semibold text-tinta">Transferencia</p>
          <p
            className={`text-lg font-extrabold tabular-nums ${
              resumen.diferencia_transferencia === 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {resumen.diferencia_transferencia === 0 ? 'Cuadró' : pesos(resumen.diferencia_transferencia)}
          </p>
        </div>
      </div>

      {resumen.nota && (
        <p className="rounded-xl bg-latte/50 p-3 text-sm text-tinta">
          <span className="font-semibold">Explicación:</span> {resumen.nota}
        </p>
      )}

      <button
        type="button"
        onClick={() => imprimirResumenTurno({ ...turno, ...resumen })}
        className="w-full rounded-2xl border border-linea bg-white px-6 py-4 text-base font-semibold text-mocha transition-colors hover:bg-latte/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha"
      >
        Imprimir resumen del turno
      </button>

      <button
        type="button"
        onClick={onListo}
        className={`${BOTON} w-full py-4 text-lg`}
      >
        Volver a la caja
      </button>
    </div>
  )
}

function IconoCerrar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function conteoInvalido(contado) {
  if (String(contado).trim() === '') return true
  const n = aNumeroPlata(contado)
  return !Number.isFinite(n) || n < 0
}