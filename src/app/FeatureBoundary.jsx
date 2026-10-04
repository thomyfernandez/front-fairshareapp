import { Component } from 'react'
import { Card, ErrorState } from '../components/ui'

export class FeatureBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) { console.error('FairShare screen failed:', error) }
  render() {
    if (this.state.error) return <Card><ErrorState title="Esta pantalla encontró un problema" error={{ message: 'Podés volver a intentar o usar otra sección desde el menú.' }} onRetry={() => this.setState({ error: null })} /></Card>
    return this.props.children
  }
}
