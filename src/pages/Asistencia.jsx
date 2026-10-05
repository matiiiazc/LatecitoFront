import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../useAuth'
import {
  disponible,
  leerEquipo,
  crearClaves,
  vincularEquipo,
  firmar,
  mensajeAsistencia,
} from '../equipo'

const ZONA = 'America/Argentina/Buenos_Aires'
const ar = (opciones) => new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, ...opciones })
const hora = (iso) => ar({ hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const diaHora = (iso) => ar({ day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const enCa = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(d)
const horasTexto = (n) =>
  `${(Number(n) || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })} h`

const CAMPOS =
  'w-full rounded-xl border border-linea bg-white px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-mocha'
const BOTON =
  'rounded-xl bg-espresso px-4 py-3 font-semibold text-latte transition-colors hover:bg-mocha disabled:cursor-not-allowed disabled:opacity-50'
const TARJETA = 'rounded-2xl border border-linea bg-white p-5'

export default function Asistencia() {
  const esAdmin = useAuth((s) => s.usuario?.rol === 'admin')
  const [tab, setTab] = useState('marcar')

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-espresso">Asistencia</h1>
        <p className="text-sm text-piedra">
          Marcá tu entrada y salida desde la máquina del local.
        </p>
      </header>

      {esAdmin && (
        <div className="mb-5 flex gap-1 rounded-xl bg-latte/40 p-1">
          {[
            { id: 'marcar', etiqueta: 'Marcar' },
            { id: 'equipos', etiqueta: 'Equipos' },
            { id: 'horas', etiqueta: 'Horas' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-white text-espresso shadow-sm' : 'text-mocha hover:bg-white/60'
              }`}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
      )}

      {tab === 'marcar' && <Marcar />}
      {esAdmin && tab === 'equipos' && <Equipos />}
      {esAdmin && tab === 'horas' && <Horas />}
    </div>
  )
}

// --- Marcar entrada o salida ---

function Marcar() {
  const usuario = useAuth((s) => s.usuario)

  const [equipo, setEquipo] = useState(null)
  const [revisando, setRevisando] = useState(true)
  const [estado, setEstado] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [marcando, setMarcando] = useState(false)

  async function cargarEstado() {
    try {
      setEstado(await api('/asistencia/estado'))
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    let vivo = true
    ;(async () => {
      if (!disponible()) {
        setError('Este navegador no puede firma electrónica (necesita https o localhost).')
        setRevisando(false)
        return
      }
      const guardado = await leerEquipo()
      if (!vivo) return
      setEquipo(guardado)
      setRevisando(false)
      if (guardado) await cargarEstado()
    })()
    return () => {
      vivo = false
    }
  }, [])

  async function alVincular(eq) {
    setEquipo(eq)
    setAviso('Equipo vinculado. Ya podés marcar tu entrada.')
    await cargarEstado()
  }

  async function marcar() {
    setMarcando(true)
    setError('')
    setAviso('')
    try {
      const tipo = estado?.dentro ? 'salida' : 'entrada'
      const { nonce } = await api('/asistencia/desafio', { metodo: 'POST' })
      const mensaje = mensajeAsistencia({
        nonce,
        equipoId: equipo.equipoId,
        usuarioId: usuario.id,
        tipo,
      })
      const firma = await firmar(mensaje)
      const r = await api('/asistencia/marcar', {
        metodo: 'POST',
        cuerpo: { nonce, firma, tipo, equipo_id: equipo.equipoId },
      })
      await cargarEstado()
      setAviso(
        `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada a las ${hora(r.registrado_at)}`
      )
    } catch (e) {
      setError(e.message)
    } finally {
      setMarcando(false)
    }
  }

  if (revisando) return <p className="text-piedra">Revisando el equipo...</p>

  if (!disponible()) {
    return (
      <div className={`${TARJETA} border-amber-300 bg-amber-50 text-amber-900`}>
        <p className="font-semibold">Este navegador no sirve para marcar</p>
        <p className="mt-1 text-sm">
          La firma del equipo necesita un navegador con WebCrypto y una dirección segura
          (localhost o https).
        </p>
      </div>
    )
  }

  if (!equipo) return <VincularEquipo onListo={alVincular} />

  const dentro = Boolean(estado?.dentro)

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-2xl border p-5 ${
          dentro ? 'border-green-300 bg-green-50' : 'border-linea bg-white'
        }`}
      >
        <p className="text-sm text-piedra">Tu estado</p>
        <p className={`text-xl font-extrabold ${dentro ? 'text-green-800' : 'text-espresso'}`}>
          {dentro ? 'Estás adentro' : 'Estás afuera'}
        </p>
        {dentro && estado?.desde && (
          <p className="mt-1 text-sm text-green-800">Desde las {hora(estado.desde)}</p>
        )}

        <button
          type="button"
          onClick={marcar}
          disabled={marcando || !estado}
          className={`${BOTON} mt-4 w-full py-4 text-lg ${
            dentro ? 'bg-mocha hover:bg-espresso' : 'bg-espresso'
          }`}
        >
          {marcando ? 'Marcando...' : dentro ? 'Marcar salida' : 'Marcar entrada'}
        </button>

        <p className="mt-3 text-center text-xs text-piedra">
          Equipo: {equipo.nombre} · Sesión de {usuario?.nombre}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          {aviso}
        </p>
      )}

      {estado?.marcas?.length > 0 && (
        <div className={TARJETA}>
          <h2 className="mb-3 font-semibold text-espresso">Tus últimas marcas</h2>
          <ul className="flex flex-col divide-y divide-linea">
            {estado.marcas.map((m, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="capitalize text-piedra">{m.tipo}</span>
                <span className="tabular-nums text-tinta">{diaHora(m.registrado_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// --- Vincular la máquina del local ---

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
      await vincularEquipo({
        equipoId: r.id,
        nombre: r.nombre,
        clavePrivada,
        publicaB64,
      })
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
          Esta computadora todavía no está autorizada. Pedile al admin un código y ponelo acá.
          Se hace una sola vez por máquina.
        </p>
      </div>

      <div>
        <label htmlFor="eq-codigo" className="mb-1 block text-sm font-medium text-piedra">
          Código del admin
        </label>
        <input
          id="eq-codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          autoComplete="off"
          className={`${CAMPOS} text-center text-lg font-bold tracking-[0.3em] uppercase`}
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

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button type="submit" disabled={creando || !codigo.trim()} className={BOTON}>
        {creando ? 'Vinculando...' : 'Vincular esta máquina'}
      </button>
    </form>
  )
}

// --- Equipos (solo admin) ---

function Equipos() {
  const [equipos, setEquipos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [codigo, setCodigo] = useState(null)
  const [generando, setGenerando] = useState(false)

  async function cargar() {
    try {
      setEquipos(await api('/asistencia/equipos'))
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const lista = await api('/asistencia/equipos')
        if (!vivo) return
        setEquipos(lista)
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

  async function generar() {
    setGenerando(true)
    setError('')
    try {
      const r = await api('/asistencia/equipos/codigo', { metodo: 'POST' })
      setCodigo(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerando(false)
    }
  }

  async function darDeBaja(id) {
    if (!confirm('¿Dar de baja este equipo? No va a poder marcar más asistencia.')) return
    try {
      await api(`/asistencia/equipos/${id}`, { metodo: 'DELETE' })
      await cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={TARJETA}>
        <h2 className="font-semibold text-espresso">Vincular una máquina</h2>
        <p className="mt-1 text-sm text-piedra">
          Generá un código y usalo en la computadora del local. Vence a los 10 minutos y sirve
          una sola vez.
        </p>
        {codigo ? (
          <div className="mt-3 rounded-xl bg-latte/40 p-4 text-center">
            <p className="text-xs text-piedra">Código (vence en 10 minutos)</p>
            <p className="text-3xl font-extrabold tracking-[0.3em] text-espresso">{codigo.codigo}</p>
          </div>
        ) : (
          <button type="button" onClick={generar} disabled={generando} className={`${BOTON} mt-3`}>
            {generando ? 'Generando...' : 'Generar código'}
          </button>
        )}
      </div>

      <div className={TARJETA}>
        <h2 className="mb-3 font-semibold text-espresso">Equipos autorizados</h2>
        {cargando ? (
          <p className="text-sm text-piedra">Cargando...</p>
        ) : equipos.length === 0 ? (
          <p className="text-sm text-piedra">Todavía no hay ninguna máquina vinculada.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-linea">
            {equipos.map((eq) => (
              <li key={eq.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-tinta">
                    {eq.nombre}
                    {!eq.activo && <span className="ml-2 text-xs font-normal text-red-700">(de baja)</span>}
                  </p>
                  <p className="text-xs text-piedra">
                    {eq.marcas} marcas ·{' '}
                    {eq.ultima_conexion
                      ? `última: ${diaHora(eq.ultima_conexion)}`
                      : 'nunca usada'}
                  </p>
                </div>
                {eq.activo && (
                  <button
                    type="button"
                    onClick={() => darDeBaja(eq.id)}
                    className="shrink-0 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
                  >
                    Dar de baja
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  )
}

// --- Horas por empleado (solo admin) ---

function Horas() {
  const [periodo, setPeriodo] = useState(() => {
    const hoy = enCa(new Date())
    return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy }
  })
  const { desde, hasta } = periodo
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const params = new URLSearchParams({ desde, hasta })
        const r = await api(`/asistencia/resumen?${params}`)
        if (!vivo) return
        setDatos(r)
        setError('')
        setCargando(false)
      } catch (e) {
        if (vivo) {
          setError(e.message)
          setCargando(false)
        }
      }
    })()
    return () => {
      vivo = false
    }
  }, [desde, hasta])

  return (
    <div className="flex flex-col gap-4">
      <div className={`${TARJETA} grid gap-3 sm:grid-cols-2`}>
        <div>
          <label htmlFor="h-desde" className="mb-1 block text-sm font-medium text-piedra">
            Desde
          </label>
          <input
            id="h-desde"
            type="date"
            value={desde}
            onChange={(e) => setPeriodo({ ...periodo, desde: e.target.value })}
            className={CAMPOS}
          />
        </div>
        <div>
          <label htmlFor="h-hasta" className="mb-1 block text-sm font-medium text-piedra">
            Hasta
          </label>
          <input
            id="h-hasta"
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => setPeriodo({ ...periodo, hasta: e.target.value })}
            className={CAMPOS}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {datos && (
        <div className={TARJETA}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-semibold text-espresso">Horas por empleado</h2>
            <p className="text-sm text-piedra">Total: {horasTexto(datos.total_horas)}</p>
          </div>

          {cargando ? (
            <p className="text-sm text-piedra">Cargando...</p>
          ) : datos.empleados.length === 0 ? (
            <p className="text-sm text-piedra">No hay marcas en este período.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-linea">
              {datos.empleados.map((emp) => (
                <li key={emp.usuario_id} className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-tinta">
                      {emp.usuario}
                      {emp.abierto && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          turno sin cerrar
                        </span>
                      )}
                    </p>
                    <p className="font-semibold tabular-nums text-espresso">{horasTexto(emp.horas)}</p>
                  </div>
                  <p className="text-xs text-piedra">{emp.dias} día(s) trabajado(s)</p>
                  {emp.tramos.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 text-xs text-piedra">
                      {emp.tramos.map((t, i) => (
                        <li key={i} className="tabular-nums">
                          {diaHora(t.entrada)} → {t.salida ? diaHora(t.salida) : 'sin salida'}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
