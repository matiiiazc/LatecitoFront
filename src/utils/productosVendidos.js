// productosVendidos.js
// Bloque "PRODUCTOS VENDIDOS" para los resúmenes de la térmica: agrupa por
// categoría y muestra cuánto se vendió de cada producto y cuánta plata dejó.
import { ANCHO, centrar, alineado } from './imprimir'

const dinero = (n) => {
  const v = Math.round(Number(n) || 0)
  return (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString('es-AR')
}

export function lineasProductosVendidos(productos) {
  if (!productos || productos.length === 0) return []

  const sep = '='.repeat(ANCHO)
  const lin = '-'.repeat(ANCHO)
  const lineas = [sep, centrar('PRODUCTOS VENDIDOS'), lin]

  // Se respeta el orden en que vienen (la API los manda por categoría y nombre)
  const porCategoria = new Map()
  for (const p of productos) {
    const cat = p.categoria ?? 'Otros'
    if (!porCategoria.has(cat)) porCategoria.set(cat, [])
    porCategoria.get(cat).push(p)
  }

  let unidades = 0
  let total = 0
  for (const [cat, items] of porCategoria) {
    lineas.push(cat)
    for (const p of items) {
      unidades += Number(p.cantidad) || 0
      total += Number(p.ingresos) || 0
      // Si el nombre no entra, se corta para que el importe no se pierda
      const izq = `  ${p.cantidad} ${p.nombre}`
      const der = dinero(p.ingresos)
      const max = ANCHO - der.length - 1
      lineas.push(
        alineado(izq.length > max ? `${izq.slice(0, Math.max(0, max - 1))}~` : izq, der),
      )
    }
  }

  lineas.push(lin)
  lineas.push(alineado(`${unidades} unidades`, dinero(total)))
  return lineas
}
