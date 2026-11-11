import { create } from 'zustand'
import { api } from './api'

// El turno de caja es el corazón del mostrador: quién atiende, cuánto vendió y
// cómo cerró la gaveta. Vive en un store para que el Inicio, el menú lateral y la
// pantalla de caja muestren siempre lo mismo sin volver a pegarle a la API.
//
// Hay una sola computadora que abre y cierra la caja (la del mostrador) y va
// con la sesión abierta, así que no hace falta firmar nada por máquina: alcanza
// el login en esa PC.

export const useTurno = create((set, get) => ({
  turno: null,
  perfiles: [],
  cargando: true,
  cargado: false,

  // Pide el turno al servidor y lo deja en el store. Devuelve el turno para
  // poder imprimir siempre con datos frescos, aunque la pantalla tenga rato
  // abierta o se haya vendido desde otro lado.
  async traer() {
    const { turno } = await api('/turnos/actual')
    set({ turno, cargando: false, cargado: true })
    return turno
  },

  async cargar() {
    try {
      await get().traer()
    } catch {
      // Si el server no responde, no se pisa lo que ya se estaba mostrando
      set({ cargando: false, cargado: true })
    }
  },

  async cargarPerfiles() {
    if (get().perfiles.length > 0) return
    set({ perfiles: await api('/turnos/perfiles') })
  },

  async abrir(usuarioId, baseEfectivo) {
    const r = await api('/turnos/abrir', {
      metodo: 'POST',
      cuerpo: {
        usuario_id: usuarioId,
        base_efectivo: baseEfectivo,
      },
    })
    set({ turno: r.turno })
    return r.turno
  },

  async cerrar(usuarioId, contadoEfectivo, contadoTransferencia, nota) {
    const r = await api('/turnos/cerrar', {
      metodo: 'POST',
      cuerpo: {
        usuario_id: usuarioId,
        contado_efectivo: contadoEfectivo,
        contado_transferencia: contadoTransferencia,
        nota,
      },
    })
    // Ojo: no se limpia el turno acá. La pantalla muestra el resultado del
    // cierre (con el botón para imprimir el resumen) hasta que el usuario
    // vuelve a la caja; si se limpiara, el resultado desaparecía al instante.
    return r
  },
}))

// El nombre de quien atiende, o null si no hay turno abierto
export const nombreTurno = (turno) => turno?.usuario ?? null