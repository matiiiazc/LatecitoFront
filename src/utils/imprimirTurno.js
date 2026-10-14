// imprimirTurno.js
// Resumen de un turno de caja para la térmica de 80 mm con window.print().
// Sirve tanto para el turno en curso (sin el conteo) como para el cierre, que le
// suma el efectivo y la transferencia contados y su diferencia.
import { imprimirTexto, ANCHO, centrar, alineado } from './imprimir'
import { PAGO } from './pago'

const ZONA = 'America/Argentina/Buenos_Aires'
const ar = (opciones) => new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, ...opciones })

const fechaHora = (valor) => {
  const d = valor instanceof Date ? valor : new Date(valor)
  return {
    fecha: ar({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(d),
    hora: ar({ hour: '2-digit', minute: '2-digit', hour12: false }).format(d),
  }
}

const dinero = (n) => {
  const v = Math.round(Number(n) || 0)
  return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('es-AR')
}

// Corta un texto largo en varios renglones que entren en el ancho del papel
function envolver(texto) {
  const palabras = String(texto).split(/\s+/)
  const lineas = []
  let actual = ''
  for (const palabra of palabras) {
    if ((actual + (actual ? ' ' : '') + palabra).length > ANCHO) {
      if (actual) lineas.push(actual)
      actual = palabra
    } else {
      actual += (actual ? ' ' : '') + palabra
    }
  }
  if (actual) lineas.push(actual)
  return lineas
}

// Arma el resumen como texto monoespaciado para la térmica. Acepta el objeto del
// turno en curso y, si viene del cierre, los campos del conteo (contado y
// diferencia). No usa acentos: la térmica rompe los diacriticos.
export function textoResumenTurno(t) {
  const sep = '='.repeat(ANCHO)
  const lin = '-'.repeat(ANCHO)
  const lineas = []

  const metodos = t.por_metodo ?? []
  const efectivo = metodos.find((m) => m.metodo === 'efectivo')
  const transferencia = metodos.find((m) => m.metodo === 'transferencia')
  const resto = metodos.filter((m) => m.metodo !== 'efectivo' && m.metodo !== 'transferencia')

  const vendido =
    t.vendido != null ? Number(t.vendido) : metodos.reduce((s, m) => s + Number(m.total), 0)
  const cerrado = t.cerrado_at ? fechaHora(t.cerrado_at) : null
  const abierto = fechaHora(t.abierto_at)

  lineas.push(sep)
  lineas.push(centrar('LATTECITO'))
  lineas.push(centrar(cerrado ? 'CIERRE DE TURNO' : 'RESUMEN DE TURNO'))
  lineas.push(sep)
  lineas.push(`Atendio: ${t.usuario}`)
  lineas.push(`Abrio:   ${abierto.fecha} ${abierto.hora}`)
  if (cerrado) {
    lineas.push(`Cerro:   ${cerrado.fecha} ${cerrado.hora}`)
  } else {
    const ahora = fechaHora(new Date())
    lineas.push(`Impreso: ${ahora.fecha} ${ahora.hora}`)
  }

  lineas.push(lin)
  if (t.comandas != null) {
    lineas.push(alineado(`Ventas: ${t.comandas}`, `Total ${dinero(vendido)}`))
  } else {
    lineas.push(alineado('TOTAL VENDIDO', dinero(vendido)))
  }

  lineas.push(sep)
  lineas.push(centrar('COBRADO POR FORMA DE PAGO'))
  lineas.push(lin)
  if (metodos.length === 0) {
    lineas.push('Sin ventas cobradas')
  } else {
    for (const m of metodos) {
      lineas.push(alineado(`${PAGO[m.metodo] ?? m.metodo} (${m.cantidad})`, dinero(m.total)))
    }
  }

  // Gaveta: la base mas lo cobrado en efectivo. Si vino del cierre, lo contado
  const esperado =
    t.esperado_efectivo != null
      ? Number(t.esperado_efectivo)
      : Number(t.base_efectivo) + Number(efectivo?.total ?? 0)

  lineas.push(sep)
  lineas.push(centrar('CAJA EN EFECTIVO'))
  lineas.push(lin)
  lineas.push(alineado('Base', dinero(t.base_efectivo)))
  lineas.push(alineado('Vendido en efectivo', dinero(efectivo?.total ?? 0)))
  lineas.push(alineado('Esperado en gaveta', dinero(esperado)))
  if (t.contado_efectivo != null) {
    lineas.push(alineado('Contado', dinero(t.contado_efectivo)))
    lineas.push(alineado('Diferencia', t.diferencia === 0 ? 'Cuadro' : dinero(t.diferencia)))
  }

  // Transferencia: se concilia aparte contra lo que entro por transferencia
  if (t.esperado_transferencia != null || Number(transferencia?.total ?? 0) > 0) {
    const esperadoTrans =
      t.esperado_transferencia != null
        ? Number(t.esperado_transferencia)
        : Number(transferencia?.total ?? 0)
    lineas.push(sep)
    lineas.push(centrar('TRANSFERENCIA'))
    lineas.push(lin)
    lineas.push(alineado('Esperado', dinero(esperadoTrans)))
    if (t.contado_transferencia != null) {
      lineas.push(alineado('Contado', dinero(t.contado_transferencia)))
      lineas.push(
        alineado('Diferencia', t.diferencia_transferencia === 0 ? 'Cuadro' : dinero(t.diferencia_transferencia)),
      )
    }
  }

  // Tarjeta y resto: no deja plata en el local, va solo informativo
  if (resto.length > 0) {
    lineas.push(sep)
    lineas.push(centrar('TARJETA Y RESTO'))
    lineas.push(lin)
    for (const m of resto) {
      lineas.push(alineado(`${PAGO[m.metodo] ?? m.metodo} (${m.cantidad})`, dinero(m.total)))
    }
  }

  if (t.nota) {
    lineas.push(sep)
    lineas.push('EXPLICACION:')
    lineas.push(...envolver(t.nota))
  }

  lineas.push(sep)
  lineas.push('')
  lineas.push('')
  return lineas.join('\n')
}

export function imprimirResumenTurno(t) {
  imprimirTexto(textoResumenTurno(t))
}
