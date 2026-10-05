import { Component } from 'react'
import PantallaError from './PantallaError'

// Si una pantalla se rompe al dibujarse, React la desmonta y queda en blanco.
// Este límite la intercepta y muestra la pantalla de error en su lugar.
export default class LimiteErrores extends Component {
  constructor(props) {
    super(props)
    this.state = { fallo: null }
  }

  static getDerivedStateFromError(fallo) {
    return { fallo }
  }

  componentDidCatch(fallo, info) {
    console.error('Error al mostrar la pantalla:', fallo, info)
  }

  render() {
    if (!this.state.fallo) return this.props.children

    return (
      <PantallaError
        titulo="Algo salió mal"
        mensaje="Esta pantalla no se pudo mostrar. Probá de nuevo; si sigue igual, avisale al dueño."
        detalle={this.state.fallo?.message ?? ''}
        accion={{ etiqueta: 'Recargar', onClick: () => window.location.reload() }}
        secundario={{ etiqueta: 'Volver al inicio', onClick: () => window.location.assign('/') }}
      />
    )
  }
}
