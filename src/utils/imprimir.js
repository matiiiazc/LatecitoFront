// imprimir.js
// Impresión por iframe oculto para la térmica de 80 mm.
// Todo el texto se normaliza SIN acentos ni "°": la térmica rompe los diacríticos.

// Caracteres por línea (Font A en 80 mm). Si el papel corta las líneas, bajá
// este número; si sobra mucho espacio a la derecha, subilo.
export const ANCHO = 48;

export const sinAcentos = (t) =>
  String(t)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/°/g, "");

export const centrar = (t) => {
  const s = String(t);
  if (s.length >= ANCHO) return s;
  return " ".repeat(Math.floor((ANCHO - s.length) / 2)) + s;
};

export const alineado = (izq, der) => {
  const i = String(izq);
  const d = String(der);
  const hueco = ANCHO - i.length - d.length;
  return hueco > 0 ? i + " ".repeat(hueco) + d : `${i} ${d}`;
};

export const recortar = (t) => {
  const s = String(t);
  return s.length > ANCHO ? s.slice(0, ANCHO) : s;
};

const escapar = (t) =>
  String(t).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

export function imprimirTexto(texto) {
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
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
<pre>${escapar(sinAcentos(texto))}</pre>
</body>
</html>`;

  // Iframe oculto: no abre pestañas ni pisa la pantalla de la app
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";

  // El handler se asigna ANTES de cargar el contenido. Si se asigna después de
  // doc.write()/doc.close(), el evento load ya se disparó y print() nunca corre:
  // el resumen (o el ticket) no sale. Con srcdoc el load llega una sola vez,
  // cuando el contenido ya está escrito.
  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1000);
  };

  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}
