// imprimirTicket.js
// Imprime la comanda de LATTECITO en una térmica de 80 mm con window.print().
// Uso: imprimirTicket({ id: 123, total: 6000, items: [{ nombre: "Latte", cantidad: 2, subtotal: 6000 }] });

const dinero = (n) => "$" + Number(n).toLocaleString("es-AR");

const escapar = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

function htmlTicket({ id, items }) {
  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const filas = items
    .map(
      (i) => `
      <div class="fila">
        <span class="prod">${i.cantidad}x ${escapar(i.nombre)}</span>
        <span class="monto">${dinero(i.subtotal)}</span>
      </div>`
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Ticket ${escapar(id)}</title>
<style>
  /* 80 mm de ancho, alto automático, sin márgenes de página */
  @page { size: 80mm auto; margin: 0; }

  * { box-sizing: border-box; }

  html, body { margin: 0; padding: 0; }

  body {
    width: 72mm;                 /* área imprimible real de una térmica de 80 mm */
    margin: 0 auto;
    padding: 2mm 0 6mm;
    font-family: "Courier New", Consolas, monospace;
    font-size: 13px;
    line-height: 1.3;
    color: #000;
  }

  .sep    { border-top: 2px dashed #000; margin: 3mm 0; }
  .centro { text-align: center; }
  .marca  { font-size: 20px; font-weight: bold; letter-spacing: 1px; }
  .fila   { display: flex; justify-content: space-between; gap: 6px; }
  .prod   { flex: 1; overflow-wrap: anywhere; }
  .monto  { white-space: nowrap; }
  .total  { font-size: 16px; font-weight: bold; }
</style>
</head>
<body>
  <div class="sep"></div>
  <div class="centro marca">LATTECITO</div>
  <div class="centro">N° ${escapar(id)} TICKET</div>
  <div class="sep"></div>
  ${filas}
  <div class="sep"></div>
  <div class="fila total"><span>Total:</span><span>${dinero(total)}</span></div>
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
