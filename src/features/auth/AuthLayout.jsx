import { useEffect } from 'react'
import { Card } from '../../components/ui'
import { Brand } from '../../app/Sidebar'

export function AuthLayout({ pageTitle, title, description, children }) {
  useEffect(() => { document.title = `${pageTitle} · FairShare` }, [pageTitle])
  return <div className="auth-shell">
    <header className="auth-brand"><Brand /></header>
    <main className="auth">
      <div className="auth-intro">
        <p className="ui-eyebrow">TU DINERO, EN EQUIPO</p>
        <h1>Compartir gastos.<br />Sin perder la cuenta.</h1>
        <p className="auth-intro__text">Organizá tu hogar, un viaje o un proyecto. Registrá gastos, repartí importes y sabé cuánto queda por pagar.</p>
        <ul className="auth-pills"><li>Repartos claros</li><li>Un mismo espacio</li><li>Menos cuentas pendientes</li></ul>
      </div>
      <Card className="auth-card">
        <h2>{title}</h2>
        <p className="auth-card__description">{description}</p>
        {children}
      </Card>
    </main>
    <footer className="auth-footer">FairShare · Gastos claros, juntos.</footer>
  </div>
}
