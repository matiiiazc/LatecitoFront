// imprimirTicket.js
// Imprime la comanda de LATTECITO en una térmica de 80 mm con window.print().
// Uso: imprimirTicket({ id: 123, total: 6000, items: [{ nombre: "Latte", cantidad: 2, subtotal: 6000 }] });
import { imprimirTexto, ANCHO, centrar, alineado, recortar } from "./imprimir";

const dinero = (n) => "$" + Number(n).toLocaleString("es-AR");

const METODO = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

function textoTicket({
  id,
  items,
  created_at,
  atendio,
  metodo_pago,
  pago_efectivo,
  pago_transferencia,
  pago_tarjeta,
}) {
  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const cuando = created_at ? new Date(created_at) : new Date();
  const fecha = cuando.toLocaleDateString("es-AR");
  const hora = cuando.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const filas = items.map((i) =>
    alineado(`${i.cantidad ?? 1}x ${i.nombre}`, dinero(i.subtotal))
  );

  // Pago simple: una línea. Combinado: una línea por cada método usado.
  const detallePago = [];
  if (metodo_pago === "combinado") {
    if (Number(pago_efectivo) > 0) detallePago.push(alineado("Efectivo", dinero(pago_efectivo)));
    if (Number(pago_transferencia) > 0)
      detallePago.push(alineado("Transferencia", dinero(pago_transferencia)));
    if (Number(pago_tarjeta) > 0) detallePago.push(alineado("Tarjeta", dinero(pago_tarjeta)));
  } else if (metodo_pago) {
    detallePago.push(alineado("Pago", METODO[metodo_pago] ?? metodo_pago));
  }

  return [
    "=".repeat(ANCHO),
    centrar("LATTECITO"),
    centrar(`N° ${id} TICKET`),
    alineado(`Fecha: ${fecha}`, `Hora: ${hora}`),
    ...(atendio ? [recortar(`Atendió: ${atendio}`)] : []),
    "=".repeat(ANCHO),
    ...filas,
    "-".repeat(ANCHO),
    alineado("TOTAL", dinero(total)),
    ...detallePago,
    "=".repeat(ANCHO),
    "",
    "",
  ].join("\n");
}

export function imprimirTicket(datos) {
  imprimirTexto(textoTicket(datos));
}
