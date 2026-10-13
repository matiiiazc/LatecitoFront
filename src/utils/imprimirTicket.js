// imprimirTicket.js
// Imprime la comanda de LATTECITO en una térmica de 80 mm con window.print().
// Uso: imprimirTicket({ id: 123, total: 6000, items: [{ nombre: "Latte", cantidad: 2, subtotal: 6000 }] });
import { imprimirTexto, ANCHO, centrar, alineado, recortar } from "./imprimir";

const dinero = (n) => "$" + Number(n).toLocaleString("es-AR");

const METODO = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mercadopago: "MercadoPago",
};

function textoTicket({ id, items, created_at, atendio, metodo_pago }) {
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
    ...(metodo_pago
      ? [alineado("Pago", METODO[metodo_pago] ?? metodo_pago)]
      : []),
    "=".repeat(ANCHO),
    "",
    "",
  ].join("\n");
}

export function imprimirTicket(datos) {
  imprimirTexto(textoTicket(datos));
}
