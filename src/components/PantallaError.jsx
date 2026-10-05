// Pantalla única para los errores y las vistas que no existen. Antes cada caso
// mostraba un texto pelado, y si la app se rompía al renderizar quedaba en
// blanco. Acá siempre hay algo que leer y una salida clara.
export default function PantallaError({
  titulo,
  mensaje,
  detalle = '',
  accion = null,
  secundario = null,
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-hueso p-6">
      <div className="w-full max-w-md text-center">
        <p className="text-3xl font-extrabold tracking-tight text-espresso">Lattecito</p>
        <p className="mt-1 text-sm text-piedra">Café al paso</p>

        <div className="mt-8 rounded-2xl border border-linea bg-white p-6 text-left">
          <h1 className="text-xl font-bold text-mocha">{titulo}</h1>
          <p className="mt-2 text-piedra">{mensaje}</p>

          {detalle && (
            <p className="mt-4 rounded-lg bg-latte/40 px-3 py-2 text-xs break-words text-mocha">
              {detalle}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            {accion && (
              <button
                type="button"
                onClick={accion.onClick}
                className="w-full rounded-xl bg-espresso px-4 py-3 font-semibold text-latte transition-colors hover:bg-mocha focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha"
              >
                {accion.etiqueta}
              </button>
            )}
            {secundario && (
              <button
                type="button"
                onClick={secundario.onClick}
                className="w-full rounded-xl border border-linea px-4 py-3 font-semibold text-mocha transition-colors hover:bg-latte/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mocha"
              >
                {secundario.etiqueta}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
