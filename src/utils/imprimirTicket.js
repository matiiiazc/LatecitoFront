// imprimirTicket.js
// Imprime la comanda de LATTECITO en una térmica de 80 mm con window.print().
// Uso: imprimirTicket({ id: 123, total: 6000, items: [{ nombre: "Latte", cantidad: 2, subtotal: 6000 }] });

// Caracteres por línea (Font A en 80 mm). Si el papel corta las líneas, bajá
// este número; si sobra mucho espacio a la derecha, subilo.
const ANCHO = 48;

const dinero = (n) => "$" + Number(n).toLocaleString("es-AR");

const escapar = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

const centrar = (t) => {
  const s = String(t);
  if (s.length >= ANCHO) return s;
  return " ".repeat(Math.floor((ANCHO - s.length) / 2)) + s;
};

const alineado = (izq, der) => {
  const i = String(izq);
  const d = String(der);
  const hueco = ANCHO - i.length - d.length;
  return hueco > 0 ? i + " ".repeat(hueco) + d : `${i} ${d}`;
};

const recortar = (t) => {
  const s = String(t);
  return s.length > ANCHO ? s.slice(0, ANCHO) : s;
};

function textoTicket({ id, items, created_at, atendio }) {
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
    "=".repeat(ANCHO),
    "",
    "",
  ].join("\n");
}

function htmlTicket(datos) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Ticket ${escapar(datos.id)}</title>
<style>
  /* 80 mm de ancho, alto automático, sin márgenes de página */
  @page { size: 80mm auto; margin: 0; }

  html, body { margin: 0; padding: 0; }

  body {
    width: 72mm;                 /* área imprimible real de una térmica de 80 mm */
    margin: 0 auto;
    padding: 2mm 0 6mm;
  }

  pre {
    margin: 0;
    font-family: "Courier New", Consolas, monospace;
    font-size: 9px;
    line-height: 1.25;
    white-space: pre;
    color: #000;
  }
</style>
</head>
<body>
<pre>${escapar(textoTicket(datos))}</pre>
</body>
</html>`;
}

export function imprimirTicket(datos) {
  // Iframe oculto: no abre pestañas ni pisa la pantalla de la app
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlTicket(datos));
  doc.close();

  // Esperar a que cargue el contenido antes de imprimir
  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1000);
  };
}
