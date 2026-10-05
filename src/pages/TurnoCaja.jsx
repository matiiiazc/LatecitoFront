import { useEffect, useState } from 'react'
import { api } from '../api'
import { useTurno } from '../turno'
import { disponible, crearClaves, leerEquipo, vincularEquipo } from '../equipo'

// Pantalla del mostrador. Dos estados: no hay turno abierto y se elige perfil,
// o hay turno abierto y se ve quién atiende y cuánto va.
//
// Elegir perfil no pide contraseña. La máquina ya está autorizada por el
// administrador, así que el nombre es una declaración de la persona, no una
// prueba de identidad. Para que el nombre no se pueda cambiar desde cualquier
// otra computadora, abrir y cerrar exigen la firma de esta máquina.

const ZONA = 'America/Argentina/Buenos_Aires'
const ar = (opciones) => new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, ...opciones })
const hora = (iso) => ar({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const pesos = (n) =>
  '$' + (Number(n) || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const CAMPOS =
  'w-full rounded-xl border border-linea bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha'
const BOTON =
  'rounded-xl bg-espresso px-4 py-3 font-semibold text-latte transition-colors hover:bg-mocha disabled:cursor-not-allowed disabled:opacity-50'
const TARJETA = 'rounded-2xl border border-linea bg-white p-5'
const ERROR = 'rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800'

// --- Pantalla principal ---

export default function TurnoCaja() {
  const { turno, perfiles, cargando, cargado, cargar, cargarPerfiles } = useTurno()
  const [equipo, setEquipo] = useState(null)
  const [revisando, setRevisando] = useState(true)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      if (!disponible()) {
        if (vivo) setRevisando(false)
        return
      }
      const guardado = await leerEquipo()
      if (!vivo) return
      setEquipo(guardado)
      setRevisando(false)
      if (guardado) {
        await cargar()
        await cargarPerfiles()
      }
    })()
    return () => {
      vivo = false
    }
  }, [cargar, cargarPerfiles])

  // Se refresca el turno al volver a esta pantalla, para que muestre lo que
  // pasó mientras el usuario estaba en otra parte
  useEffect(() => {
    if (cargado) cargar()
  }, [cargado, cargar])

  if (revisando) return <p className="text-piedra">Revisando la máquina...</p>

  if (!disponible()) {
    return (
      <div className={`${TARJETA} border-amber-300 bg-amber-50 text-amber-900`}>
        <p className="font-semibold">Este navegador no sirve para el mostrador</p>
        <p className="mt-1 text-sm">
          La firma de la máquina necesita WebCrypto y una dirección segura (localhost o https).
        </p>
      </div>
    )
  }

  if (!equipo) return <VincularEquipo onListo={setEquipo} />

  if (!turno) return <AbrirTurno perfiles={perfiles} cargando={cargando} equipo={equipo} />

  return <TurnoAbierto turno={turno} perfiles={perfiles} />
}

// --- Abrir el turno: elegir perfil y contar la base ---

function AbrirTurno({ perfiles, cargando, equipo }) {
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
      const limpio = Number(String(base).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
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
      <p className="text-center text-xs text-piedra">Máquina: {equipo.nombre}</p>
    </div>
  )
}

// --- Turno abierto ---

function TurnoAbierto({ turno, perfiles }) {
  const [cerrando, setCerrando] = useState(false)

  const efectivo = turno.por_metodo.find((m) => m.metodo === 'efectivo')
  const otros = turno.por_metodo.filter((m) => m.metodo !== 'efectivo')

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
  const [nota, setNota] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [resumen, setResumen] = useState(null)

  const efectivo = turno.por_metodo.find((m) => m.metodo === 'efectivo')
  // Lo que debería haber: la base con la que arrancó más lo cobrado en efectivo
  const esperado = turno.base_efectivo + (efectivo?.total ?? 0)
  const numeroContado = Number(String(contado).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0
  const diferencia = Math.round((numeroContado - esperado) * 100) / 100
  const hayFalta = contado.trim() !== '' && diferencia !== 0

  async function confirmar() {
    setGuardando(true)
    setError('')
    try {
      const r = await cerrar(elegido.id, numeroContado, nota.trim() || undefined)
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
              <dt className="text-piedra">Contado</dt>
              <dd className="font-semibold tabular-nums text-tinta">{pesos(resumen.contado_efectivo)}</dd>
            </div>
            <div className="flex justify-between border-t border-linea pt-2">
              <dt className="text-piedra">Diferencia</dt>
              <dd
                className={`font-bold tabular-nums ${
                  resumen.diferencia === 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {resumen.diferencia === 0 ? 'Cuadró' : pesos(resumen.diferencia)}
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
          Contá el efectivo de la gaveta. Las transferencias y las tarjetas no se cuentan: no dejan
          plata en el local.
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
          <div className="mt-2 flex justify-between border-t border-latte pt-2 text-base font-bold">
            <dt className="text-espresso">Debería haber</dt>
            <dd className="tabular-nums text-espresso">{pesos(esperado)}</dd>
          </div>
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
            Effective contado
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
              placeholder="0"
              className={`${CAMPOS} pl-7 text-2xl font-bold tabular-nums`}
            />
          </div>
          {contado.trim() !== '' && (
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

        {hayFalta && (
          <div className="mt-4">
            <label htmlFor="nota" className="mb-1 block text-sm font-medium text-red-800">
              Contá por qué {diferencia > 0 ? 'sobra' : 'falta'} plata <span className="text-red-700">(obligatorio)</span>
            </label>
            <textarea
              id="nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
              placeholder="Por ejemplo: se takeó un café sin cobrar"
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
              elegido?.id !== turno.usuario_id ||
              (hayFalta && nota.trim().length < 3)
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
  const limpio = String(contado).replace(/[^\d,.-]/g, '').replace(',', '.')
  return limpio === '' || Number.isNaN(Number(limpio)) || Number(limpio) < 0
}

// --- Vincular la máquina (la hace el admin una vez por computadora) ---

function VincularEquipo({ onListo }) {
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('Caja del local')
  const [error, setError] = useState('')
  const [creando, setCreando] = useState(false)

  async function vincular(e) {
    e.preventDefault()
    setCreando(true)
    setError('')
    try {
      const { clavePrivada, publicaB64 } = await crearClaves()
      const r = await api('/asistencia/equipos', {
        metodo: 'POST',
        cuerpo: { codigo: codigo.trim().toUpperCase(), nombre: nombre.trim(), public_key: publicaB64 },
      })
      await vincularEquipo({ equipoId: r.id, nombre: r.nombre, clavePrivada, publicaB64 })
      onListo({ equipoId: r.id, nombre: r.nombre })
    } catch (e2) {
      setError(e2.message)
    } finally {
      setCreando(false)
    }
  }

  return (
    <form onSubmit={vincular} className={`${TARJETA} flex flex-col gap-4`}>
      <div>
        <h2 className="font-semibold text-espresso">Vincular esta máquina</h2>
        <p className="mt-1 text-sm text-piedra">
          Esta computadora todavía no está autorizada. Pedile al administrador un código y ponelo
          acá. Se hace una sola vez por máquina.
        </p>
      </div>

      <div>
        <label htmlFor="eq-codigo" className="mb-1 block text-sm font-medium text-piedra">
          Código del administrador
        </label>
        <input
          id="eq-codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoComplete="off"
          className={`${CAMPOS} text-center text-lg font-bold uppercase tracking-[0.3em]`}
          placeholder="XXXXXXXX"
        />
      </div>

      <div>
        <label htmlFor="eq-nombre" className="mb-1 block text-sm font-medium text-piedra">
          Nombre del equipo
        </label>
        <input
          id="eq-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={CAMPOS}
        />
      </div>

      {error && <p role="alert" className={ERROR}>{error}</p>}

      <button type="submit" disabled={creando || !codigo.trim()} className={BOTON}>
        {creando ? 'Vinculando...' : 'Vincular esta máquina'}
      </button>
    </form>
  )
}
