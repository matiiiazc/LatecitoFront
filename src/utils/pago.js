// Etiquetas y armado de los pagos de una comanda. Un pago simple va entero a un
// método; el combinado reparte la venta entre efectivo, transferencia y tarjeta.

export const PAGO = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  combinado: 'Combinado',
}

// Las partes del pago con monto mayor a cero, en orden fijo
export function partesPago(comanda) {
  return [
    ['Efectivo', comanda?.pago_efectivo],
    ['Transferencia', comanda?.pago_transferencia],
    ['Tarjeta', comanda?.pago_tarjeta],
  ].filter(([, monto]) => Number(monto) > 0)
}

export function etiquetaPago(comanda) {
  if (!comanda?.metodo_pago) return ''
  if (comanda.metodo_pago === 'combinado') {
    const nombres = partesPago(comanda).map(([nombre]) => nombre)
    return nombres.length > 1 ? `Combinado · ${nombres.join(' + ')}` : 'Combinado'
  }
  return PAGO[comanda.metodo_pago] ?? comanda.metodo_pago
}
