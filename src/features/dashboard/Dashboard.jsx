import { Link } from 'react-router'
import { useState } from 'react'
import { useWorkspace } from '../../app/useWorkspace'
import { useApiResource } from '../../hooks/useApiResource'
import { Badge, Button, Card, EmptyState, ErrorState, Field, Icon, LoadingState, PageHeader } from '../../components/ui'
import { dateLabel, money } from '../../lib/format'
import { expenseSummary, monthOptions, personalBalance } from './model'

function Metric({ label, value, note, icon, loading, unavailable }) {
  return <Card className="metric"><div className="metric__heading"><span>{label}</span><Icon name={icon} size={18} /></div>
    {loading ? <div className="ui-skeleton metric__skeleton" aria-label="Cargando importe" /> : <strong className="metric__value">{unavailable ? 'No disponible' : value}</strong>}<p>{note}</p>
  </Card>
}

export default function Dashboard() {
  const { session, space, spaceId, members, membersState, api, revision } = useWorkspace()
  const base = `/api/v1/espacios/${spaceId}`
  const expenses = useApiResource(api, `${base}/gastos`, { revision })
  const balance = useApiResource(api, `${base}/balance`, { initialData: null, revision })
  const recurring = useApiResource(api, `${base}/favoritos`, { revision })
  const options = monthOptions()
  const [period, setPeriod] = useState(options[0].value)
  const summary = expenseSummary(expenses.data, period)
  const personal = personalBalance(balance.data?.deudas || [], session.usuario.id)
  const overdue = recurring.data.filter(item => item.vencido)
  const url = `/espacios/${spaceId}`
  return <div className="dashboard">
    <PageHeader eyebrow="TU ESPACIO, DE UN VISTAZO" title={`Hola, ${session.usuario.nombre || session.usuario.usuario}.`} description={`Esto es lo que está pasando en ${space.nombre}.`} actions={<Link className="ui-button ui-button--primary" to={`${url}/gastos?nuevo=1`}><Icon name="plus" size={18} />Registrar gasto</Link>} />
    <div className="dashboard-context"><div><span className="context-dot" aria-hidden="true" /><strong>{space.nombre}</strong><span className="context-divider" /><span>{space.reglaReparto === 'PROPORCIONAL' ? 'Reparto proporcional' : 'Reparto equitativo'}</span></div><Badge tone="brand">Espacio compartido</Badge></div>
    <div className="dashboard-section-heading"><div><h2>Tu resumen</h2><p>Importes en pesos argentinos (ARS).</p></div><Field label="Período de gastos" className="period-selector"><select value={period} onChange={event => setPeriod(event.target.value)}>{options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}</select></Field></div>
    <div className="metrics-grid">
      <Metric label="Gastos del período" value={money(summary.total)} icon="receipt" loading={expenses.loading} unavailable={expenses.error} note={expenses.loading ? 'Consultando los gastos del período…' : expenses.error ? 'No pudimos consultar los gastos.' : `${summary.count} ${summary.count === 1 ? 'gasto' : 'gastos'} · incluye pendientes y liquidados`} />
      <Metric label="Presupuesto disponible" value={money(space.presupuestoBase)} icon="wallet" note="Saldo del espacio en este momento" />
      <Metric label="Te queda por pagar" value={money(personal.payable)} icon="balance" loading={balance.loading} unavailable={balance.error} note="Tus deudas pendientes · todos los períodos" />
      <Metric label="Te queda por cobrar" value={money(personal.receivable)} icon="users" loading={balance.loading} unavailable={balance.error} note="Lo que te deben · todos los períodos" />
    </div>
    {balance.error && <ErrorState title="El balance no está disponible" error={balance.error} onRetry={balance.reload} />}
    <div className="dashboard-columns"><Card className="activity-card"><div className="card-heading"><div><h2>Últimos gastos del período</h2><p>Ordenados por fecha del gasto.</p></div><Link to={`${url}/gastos`} className="ui-link">Ver todos <Icon name="arrow" size={15} /></Link></div>
      {expenses.loading ? <LoadingState /> : expenses.error ? <ErrorState error={expenses.error} onRetry={expenses.reload} /> : !summary.recent.length ? <EmptyState title="Un mes para empezar" description="Todavía no hay gastos en el período seleccionado." icon="receipt" action={<Link className="ui-button ui-button--secondary" to={`${url}/gastos?nuevo=1`}>Registrar un gasto</Link>} /> : <ul className="activity-list">{summary.recent.map(item => <li key={item.id}><span className="activity-icon"><Icon name="receipt" size={18} /></span><div className="activity-description"><strong>{item.descripcion}</strong><span>{dateLabel(item.fecha)} · {item.pagadorNombre || 'Gasto del espacio'}</span></div><div className="activity-amount"><strong>{money(item.monto)}</strong><Badge tone={item.estado === 'LIQUIDADO' ? 'info' : 'neutral'}>{item.estado === 'LIQUIDADO' ? 'Liquidado' : 'Pendiente'}</Badge></div></li>)}</ul>}
    </Card><div className="dashboard-side"><Card><div className="card-heading"><h2>Próximos pasos</h2><Icon name="arrow" size={18} /></div><div className="quick-actions">
      <Link to={`${url}/balance`}><span className="quick-action-icon"><Icon name="balance" /></span><div><strong>Revisar el balance</strong><span>Consultá quién le debe a quién</span></div><Icon name="chevron" size={16} /></Link>
      <Link to={`${url}/recurrentes`}><span className="quick-action-icon"><Icon name="repeat" /></span><div><strong>Gastos recurrentes</strong><span>Reutilizá tus gastos habituales</span></div><Icon name="chevron" size={16} /></Link>
      <Link to={`${url}/liquidaciones`}><span className="quick-action-icon"><Icon name="check" /></span><div><strong>Ver liquidaciones</strong><span>Consultá los cierres del espacio</span></div><Icon name="chevron" size={16} /></Link>
      <Link to={`${url}/configuracion`}><span className="quick-action-icon"><Icon name="settings" /></span><div><strong>Configuración</strong><span>Ajustá el presupuesto y reglas</span></div><Icon name="chevron" size={16} /></Link>
    </div></Card><Card className="team-card"><div className="card-heading"><h2>Tu equipo</h2><Link className="ui-link" to={`${url}/miembros`}>Ver miembros</Link></div>
      {membersState.loading ? <LoadingState rows={1} /> : membersState.error ? <ErrorState error={membersState.error} onRetry={membersState.reload} /> : <><div className="team-avatars" aria-hidden="true">{members.slice(0, 5).map(member => <span key={member.id}>{member.nombreUsuario?.slice(0, 1).toUpperCase() || '?'}</span>)}</div><p>{members.length} {members.length === 1 ? 'persona comparte' : 'personas comparten'} este espacio.</p></>}
      {space?.codigo && <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}><span>Código: <code className="space-code-badge">{space.codigo}</code></span><Link className="ui-link" to={`${url}/miembros`}>Invitar <Icon name="arrow" size={14} /></Link></div>}
    </Card></div></div>
    <Card className={`review-card ${overdue.length ? 'review-card--warning' : ''}`}><span className="review-icon"><Icon name="repeat" /></span><div><h2>Revisión de recurrentes</h2>{recurring.loading ? <p role="status">Consultando las plantillas del espacio…</p> : recurring.error ? <p>No pudimos consultar las próximas revisiones.</p> : <p>{overdue.length ? `${overdue.length} ${overdue.length === 1 ? 'plantilla necesita' : 'plantillas necesitan'} actualizar el monto y la fecha de revisión.` : 'No hay plantillas con revisión vencida.'}</p>}</div>{recurring.error ? <Button variant="secondary" onClick={recurring.reload}>Reintentar</Button> : <Link className="ui-button ui-button--secondary" to={`${url}/recurrentes`}>Ver recurrentes <Icon name="arrow" size={16} /></Link>}</Card>
  </div>
}
