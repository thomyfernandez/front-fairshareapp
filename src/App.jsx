import { useState } from 'react'
import { createApi } from './api'
import './App.css'

const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value || 0)
const today = () => new Date().toLocaleDateString('en-CA')
const nextMonth = () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toLocaleDateString('en-CA') }
const formData = event => Object.fromEntries(new FormData(event.currentTarget))
function Field({ label, children, ...props }) { return <label>{label}{children || <input {...props} />}</label> }
function Submit({ busy, children }) { return <button disabled={busy} type="submit">{busy ? 'Procesando…' : children}</button> }
function Empty({ children }) { return <p className="empty">{children}</p> }

export default function App() {
  // El token se conserva únicamente en memoria. Recargar requiere iniciar sesión otra vez.
  const [session, setSession] = useState(null)
  const [register, setRegister] = useState(false)
  const [spaces, setSpaces] = useState([])
  const [space, setSpace] = useState(null)
  const [members, setMembers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [salaries, setSalaries] = useState([])
  const [debts, setDebts] = useState([])
  const [templates, setTemplates] = useState([])
  const [settlements, setSettlements] = useState([])
  const [tab, setTab] = useState('gastos')
  const [rule, setRule] = useState('EQUITATIVA')
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [salaryEdit, setSalaryEdit] = useState(null)
  const clearSession = () => { setSession(null); setSpace(null); setSpaces([]); setMembers([]); setExpenses([]); setSalaries([]); setDebts([]); setTemplates([]); setSettlements([]); setSalaryEdit(null) }
  const api = createApi({
    baseUrl: import.meta.env.VITE_API_URL || '', token: session?.token,
    onUnauthorized: () => { clearSession() }
  })
  const run = async (operation, message) => {
    setBusy(true); setNotice(null)
    try { await operation(); if (message) setNotice({ ok: true, text: message }) }
    catch (error) { setNotice({ ok: false, text: error.message || 'No se pudo conectar con el servidor' }) }
    finally { setBusy(false) }
  }
  const refresh = async (selected = space, client = api) => {
    const list = await client('/api/v1/espacios'); setSpaces(list)
    setSalaries(await client('/api/v1/sueldos'))
    if (!selected) return
    const id = selected.id
    const [current, people, items, balance, favorites, history] = await Promise.all([
      client(`/api/v1/espacios/${id}`), client(`/api/v1/espacios/${id}/miembros`),
      client(`/api/v1/espacios/${id}/gastos`), client(`/api/v1/espacios/${id}/balance`),
      client(`/api/v1/espacios/${id}/favoritos`), client(`/api/v1/espacios/${id}/liquidaciones/historial`),
    ])
    setSpace(current); setMembers(people); setExpenses(items); setDebts(balance.deudas); setTemplates(favorites); setSettlements(history)
  }
  const mutate = (path, method, body, message) => run(async () => { await api(path, { method, body }); await refresh() }, message)
  const isAdmin = members.some(m => m.usuarioId === session?.usuario.id && m.rol === 'ADMIN')
  const spacePath = `/api/v1/espacios/${space?.id}`
  const pending = expenses.filter(g => g.estado === 'PENDIENTE')
  const onLogin = event => {
    event.preventDefault(); const data = formData(event)
    run(async () => {
      if (register) { await api('/api/v1/usuarios/registro', { method: 'POST', body: data }); setRegister(false); setNotice({ ok: true, text: 'Cuenta creada. Iniciá sesión para continuar.' }); return }
      const auth = await api('/api/v1/usuarios/login', { method: 'POST', body: data })
      const client = createApi({ baseUrl: import.meta.env.VITE_API_URL || '', token: auth.token })
      await refresh(null, client); setSession(auth)
    })
  }
  const peopleSelect = (name, label, value = session?.usuario.id) => <Field label={label}><select name={name} defaultValue={value} required>{members.map(m => <option key={m.usuarioId} value={m.usuarioId}>{m.nombreUsuario}</option>)}</select></Field>

  return <div className="shell bg-canvas text-primary font-sans">
    <header className="border-subtle"><a className="brand" href="#" onClick={e => e.preventDefault()}><span className="mark">F</span> FairShare</a><span className="tagline">Gastos claros. Cuentas compartidas.</span>{session && <div className="account"><span>{session.usuario.nombre}</span><button className="secondary" onClick={() => { clearSession(); setNotice(null) }}>Cerrar sesión</button></div>}</header>
    {notice && <div className={`notice ${notice.ok ? 'success' : 'error'}`} role={notice.ok ? 'status' : 'alert'}>{notice.text}</div>}
    {!session ? <main className="auth"><div className="intro"><span className="eyebrow">TU DINERO, EN EQUIPO</span><h1>Compartir gastos.<br />Sin perder la cuenta.</h1><p>Organizá tu hogar, un viaje o un proyecto. Registrá gastos, repartí importes y sabé cuánto queda por pagar.</p><div className="pills"><span>Repartos flexibles</span><span>Balances claros</span><span>Control de presupuesto</span></div></div>
      <section className="card"><h2>{register ? 'Crear una cuenta' : 'Bienvenido de nuevo'}</h2><p>{register ? 'Completá tus datos para empezar.' : 'Ingresá a tus espacios compartidos.'}</p><form onSubmit={onLogin}>
        {register && <><Field label="Nombre" name="nombre" required maxLength={100} /><Field label="Apellido" name="apellido" required maxLength={100} /><Field label="Nombre de usuario" name="usuario" required minLength={2} maxLength={50} /></>}
        <Field label="Email" name="email" type="email" autoComplete="email" required maxLength={254} />
        <Field label="Contraseña" name="contra" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} maxLength={72} required />
        <Submit busy={busy}>{register ? 'Crear cuenta' : 'Iniciar sesión'}</Submit>
      </form><button className="link" onClick={() => { setRegister(!register); setNotice(null) }}>{register ? 'Ya tengo cuenta' : '¿Primera vez? Creá tu cuenta'}</button></section></main>
      : <main className="workspace"><aside><h2>Mis espacios</h2><nav aria-label="Espacios">{spaces.map(e => <button disabled={busy} className={space?.id === e.id ? 'selected' : 'secondary'} key={e.id} onClick={() => run(() => refresh(e))}>{e.nombre}</button>)}</nav>{!spaces.length && <Empty>Todavía no tenés espacios.</Empty>}
        <details><summary>Crear un espacio</summary><form onSubmit={event => { event.preventDefault(); const data = formData(event); data.presupuestoBase = Number(data.presupuestoBase); run(async () => { const e = await api('/api/v1/espacios', { method: 'POST', body: data }); await refresh(e) }, 'Espacio creado. Ya sos su administrador.') }}>
          <Field label="Nombre" name="nombre" required minLength={2} maxLength={100} /><Field label="Descripción" name="descripcion" maxLength={255} />
          <Field label="Tipo"><select name="tipo"><option value="HOGAR">Hogar</option><option value="VIAJE">Viaje</option><option value="PAREJA">Pareja</option><option value="TRABAJO">Trabajo</option><option value="OTRO">Otro</option></select></Field>
          <Field label="Reparto inicial"><select name="reglaReparto"><option value="CINCUENTA_CINCUENTA">Equitativo</option><option value="PROPORCIONAL">Proporcional</option></select></Field>
          <Field label="Presupuesto" name="presupuestoBase" type="number" min="0" step="0.01" defaultValue="0" required /><Submit busy={busy}>Crear espacio</Submit>
        </form></details>
        <details><summary>Unirme con un código</summary><form onSubmit={event => { event.preventDefault(); const data = formData(event); run(async () => { const m = await api('/api/v1/espacios/unirse', { method: 'POST', body: { codigo: data.codigo, usuarioId: session.usuario.id } }); await refresh({ id: m.espacioId }) }, 'Ya sos parte del espacio.') }}><Field label="Código de invitación" name="codigo" required /><Submit busy={busy}>Unirme</Submit></form></details>
        <button disabled={busy} className="secondary" onClick={() => { setTab('sueldos') }}>Mis ingresos</button>
      </aside><div className="content">
          {space && <><div className="space-heading"><div><span className="eyebrow">ESPACIO COMPARTIDO</span><h1>{space.nombre}</h1><p>{space.descripcion || 'Organizá los gastos de tu grupo.'}</p></div><div className="budget"><span>Presupuesto disponible</span><strong>{money(space.presupuestoBase)}</strong></div></div>
            <div className="invite">Código de invitación: <strong>{space.codigo}</strong><span>{members.length} integrantes</span></div>
            <nav className="tabs" aria-label="Secciones">{[['gastos', 'Gastos'], ['balance', 'Balance'], ['favoritos', 'Recurrentes'], ['liquidaciones', 'Liquidaciones'], ['miembros', 'Miembros'], ['sueldos', 'Mis ingresos']].map(([key, label]) => <button className={tab === key ? 'selected' : 'secondary'} key={key} onClick={() => setTab(key)}>{label}</button>)}</nav></>}
          {!space && tab !== 'sueldos' && <section className="card"><h1>Tu próximo espacio empieza acá</h1><p>Creá un espacio o unite con un código para registrar gastos con tu equipo.</p></section>}

          {tab === 'sueldos' && <section className="card"><h2>Mis ingresos</h2><p>Se utilizan para calcular repartos proporcionales.</p><form key={salaryEdit?.id || 'new'} className="grid-form" onSubmit={event => { event.preventDefault(); const d = formData(event); for (const key of ['monto', 'mes', 'anio']) d[key] = Number(d[key]); run(async () => { await api(`/api/v1/sueldos${salaryEdit ? `/${salaryEdit.id}` : ''}`, { method: salaryEdit ? 'PUT' : 'POST', body: d }); setSalaryEdit(null); await refresh() }, 'Ingreso guardado.') }}>
            <Field label="Monto" name="monto" type="number" min="0.01" step="0.01" defaultValue={salaryEdit?.monto} required /><Field label="Mes" name="mes" type="number" min="1" max="12" defaultValue={salaryEdit?.mes || new Date().getMonth() + 1} required /><Field label="Año" name="anio" type="number" min="2000" max={new Date().getFullYear() + 1} defaultValue={salaryEdit?.anio || new Date().getFullYear()} required />
            <Field label="Tipo"><select name="tipo" defaultValue={salaryEdit?.tipo || 'FIJO'}><option>FIJO</option><option>VARIABLE</option></select></Field><Field label="Frecuencia"><select name="frecuencia" defaultValue={salaryEdit?.frecuencia || 'MENSUAL'}><option>MENSUAL</option><option>QUINCENAL</option></select></Field><Submit busy={busy}>{salaryEdit ? 'Guardar cambios' : 'Guardar ingreso'}</Submit>
          </form>{salaryEdit && <button className="link" onClick={() => setSalaryEdit(null)}>Cancelar edición</button>}
            {salaries.map(s => <article className="row" key={s.id}><div><strong>{s.mes}/{s.anio}</strong><small>{s.tipo} · {s.frecuencia}</small></div><strong>{money(s.monto)}</strong><button className="secondary" onClick={() => setSalaryEdit(s)}>Editar</button><button disabled={busy} className="danger" onClick={() => { if (confirm('¿Eliminar este ingreso?')) mutate(`/api/v1/sueldos/${s.id}`, 'DELETE', undefined, 'Ingreso eliminado.') }}>Eliminar</button></article>)}{!salaries.length && <Empty>No registraste ingresos todavía.</Empty>}
          </section>}

          {space && tab === 'gastos' && <section className="card"><h2>Gastos del espacio</h2><details><summary>Registrar un gasto</summary><form onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); const participantes = f.getAll('participantes').map(id => ({ usuarioId: Number(id), ...(rule === 'PERSONALIZADA' ? { importe: Number(f.get(`importe-${id}`)) } : {}) })); const body = { descripcion: f.get('descripcion'), monto: Number(f.get('monto')), fecha: f.get('fecha'), pagadorId: Number(f.get('pagadorId')), regla: rule, participantes }; mutate(`${spacePath}/gastos`, 'POST', body, 'Gasto registrado.') }}>
            <div className="grid-form"><Field label="Descripción" name="descripcion" required maxLength={255} /><Field label="Monto total" name="monto" type="number" min="0.01" step="0.01" required /><Field label="Fecha" name="fecha" type="date" defaultValue={today()} required />{peopleSelect('pagadorId', 'Pagó')}
              <Field label="Reparto"><select value={rule} onChange={e => setRule(e.target.value)}><option value="EQUITATIVA">Equitativo</option><option value="PROPORCIONAL_INGRESOS">Proporcional a ingresos</option><option value="PARTICIPACION_PARCIAL">Solo participantes elegidos</option><option value="PERSONALIZADA">Importes personalizados</option></select></Field></div>
            <fieldset><legend>Participantes</legend>{members.map(m => <div className="participant" key={m.usuarioId}><label className="check"><input type="checkbox" name="participantes" value={m.usuarioId} defaultChecked />{m.nombreUsuario}</label>{rule === 'PERSONALIZADA' && <Field label={`Importe de ${m.nombreUsuario}`} name={`importe-${m.usuarioId}`} type="number" min="0" step="0.01" defaultValue="0" />}</div>)}</fieldset><Submit busy={busy}>Registrar gasto</Submit>
          </form></details>
            <form className="filters" onSubmit={event => { event.preventDefault(); const d = formData(event); const q = new URLSearchParams(Object.entries(d).filter(([, v]) => v)); run(async () => setExpenses(await api(`${spacePath}/gastos?${q}`))) }}><Field label="Desde" name="desde" type="date" /><Field label="Hasta" name="hasta" type="date" /><Submit busy={busy}>Filtrar</Submit></form>
            {expenses.map(g => <article key={g.id} className="expense"><div className="row"><div><strong>{g.descripcion}</strong><small>{g.fecha} · {g.estado}</small></div><strong>{money(g.monto)}</strong>{g.estado === 'PENDIENTE' && (isAdmin || g.pagadorId === session.usuario.id) && <button disabled={busy} className="danger" onClick={() => { if (confirm('¿Eliminar este gasto? El balance se recalculará.')) mutate(`/api/v1/gastos/${g.id}`, 'DELETE', undefined, 'Gasto eliminado.') }}>Eliminar</button>}</div><details><summary>Ver reparto</summary>{g.participantes?.map(p => <div className="row" key={p.usuarioId}><span>{p.usuarioNombre || `Usuario ${p.usuarioId}`}</span><span>{money(p.importe)}</span></div>)}</details></article>)}{!expenses.length && <Empty>No hay gastos para mostrar.</Empty>}
          </section>}

          {space && tab === 'balance' && <section className="card"><h2>Quién le debe a quién</h2><p>El balance incorpora los pagos ya registrados.</p><button disabled={busy} className="secondary" onClick={() => run(() => refresh())}>Actualizar balance</button>{debts.map(d => <article className="expense" key={d.id}><div className="row"><span><strong>{d.deudorNombre}</strong> → {d.acreedorNombre}</span><strong>{money(d.monto)}</strong></div>{(isAdmin || d.deudorId === session.usuario.id) && <form className="filters" onSubmit={event => { event.preventDefault(); const f = formData(event); mutate(`/api/v1/deudas/${d.id}/saldar`, 'POST', { monto: Number(f.monto) }, 'Pago registrado.') }}><Field label="Monto a pagar" name="monto" type="number" min="0.01" max={d.monto} step="0.01" defaultValue={d.monto} key={d.monto} required /><Submit busy={busy}>Registrar pago</Submit></form>}</article>)}{!debts.length && <Empty>Todo al día. No hay deudas pendientes.</Empty>}</section>}

          {space && tab === 'favoritos' && <section className="card"><h2>Gastos recurrentes</h2><details><summary>Crear plantilla</summary><form className="grid-form" onSubmit={event => { event.preventDefault(); const d = formData(event); for (const k of ['pagadorId', 'montoBase', 'montoVariable', 'frecuenciaAjusteMeses']) d[k] = Number(d[k]); mutate(`${spacePath}/favoritos`, 'POST', d, 'Plantilla creada.') }}>
            <Field label="Nombre" name="nombre" required minLength={2} maxLength={100} />{peopleSelect('pagadorId', 'Pagador')}<Field label="Monto base" name="montoBase" type="number" min="0" step="0.01" required /><Field label="Monto variable" name="montoVariable" type="number" min="0" step="0.01" defaultValue="0" required /><Field label="Revisar cada (meses)" name="frecuenciaAjusteMeses" type="number" min="1" defaultValue="1" required /><Field label="Próxima revisión" name="fechaProximaRevision" type="date" defaultValue={nextMonth()} required /><Field label="Reparto"><select name="reglaDivision"><option value="EQUITATIVA">Equitativo</option><option value="PROPORCIONAL_INGRESOS">Proporcional a ingresos</option></select></Field><Submit busy={busy}>Crear plantilla</Submit>
          </form></details>{templates.map(p => <article className="expense" key={p.id}><div className="row"><div><strong>{p.nombre}</strong><small>Revisión: {p.fechaProximaRevision} {p.vencido ? '· VENCIDA' : ''}</small></div><strong>{money(Number(p.montoBase) + Number(p.montoVariable))}</strong><button disabled={busy || p.vencido} onClick={() => mutate(`/api/v1/favoritos/${p.id}/ejecutar`, 'POST', undefined, 'Gasto generado.')}>Generar gasto</button><button disabled={busy} className="danger" onClick={() => { if (confirm('¿Eliminar esta plantilla?')) mutate(`/api/v1/favoritos/${p.id}`, 'DELETE', undefined, 'Plantilla eliminada.') }}>Eliminar</button></div><details><summary>Actualizar monto y revisión</summary><form className="grid-form" onSubmit={event => { event.preventDefault(); const d = formData(event); d.nuevoMontoBase = Number(d.nuevoMontoBase); d.nuevoMontoVariable = Number(d.nuevoMontoVariable); mutate(`/api/v1/favoritos/${p.id}/actualizar-monto`, 'PUT', d, 'Plantilla actualizada.') }}><Field label="Monto base" name="nuevoMontoBase" type="number" min="0" step="0.01" defaultValue={p.montoBase} required /><Field label="Variable" name="nuevoMontoVariable" type="number" min="0" step="0.01" defaultValue={p.montoVariable} required /><Field label="Nueva revisión" name="nuevaFechaProximaRevision" type="date" defaultValue={nextMonth()} required /><Submit busy={busy}>Actualizar</Submit></form></details></article>)}{!templates.length && <Empty>No hay plantillas todavía.</Empty>}</section>}

          {space && tab === 'liquidaciones' && <section className="card"><h2>Cierre de gastos</h2><p>El cierre descuenta del presupuesto los gastos pendientes seleccionados. No registra pagos entre miembros.</p>{isAdmin && <form onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); const ids = f.getAll('gastoIds').map(Number); if (!ids.length) { setNotice({ ok: false, text: 'Seleccioná al menos un gasto.' }); return } mutate(`${spacePath}/liquidaciones/cierre`, 'POST', { gastoIds: ids, descripcion: f.get('descripcion') }, 'Liquidación cerrada.') }}><fieldset><legend>Gastos pendientes</legend>{pending.map(g => <label className="check" key={g.id}><input type="checkbox" name="gastoIds" value={g.id} defaultChecked />{g.descripcion} · {money(g.monto)}</label>)}{!pending.length && <Empty>No hay gastos pendientes de cierre.</Empty>}</fieldset><Field label="Nota del cierre" name="descripcion" maxLength={255} /><Submit busy={busy || !pending.length}>Cerrar seleccionados</Submit></form>}
            <h3>Historial</h3>{settlements.map(l => <article className="row" key={l.id}><div><strong>Liquidación #{l.id}</strong><small>{l.fechaLiquidacion} · {l.cantidadGastos} gastos</small></div><strong>{money(l.montoTotal)}</strong></article>)}{!settlements.length && <Empty>Todavía no se realizaron cierres.</Empty>}</section>}

          {space && tab === 'miembros' && <section className="card"><h2>Miembros y configuración</h2>{members.map(m => <article className="row" key={m.id}><div><strong>{m.nombreUsuario}</strong><small>{m.rol}</small></div>{isAdmin && <button disabled={busy} className="secondary" onClick={() => mutate(`${spacePath}/miembros/${m.usuarioId}/rol?rol=${m.rol === 'ADMIN' ? 'MIEMBRO' : 'ADMIN'}`, 'PATCH', undefined, 'Rol actualizado.')}>{m.rol === 'ADMIN' ? 'Quitar administración' : 'Hacer administrador'}</button>}</article>)}
            <form className="filters" onSubmit={event => { event.preventDefault(); const d = formData(event); mutate(`${spacePath}/miembros/${session.usuario.id}/sueldo`, 'PUT', { sueldoDeclarado: Number(d.sueldoDeclarado) }, 'Ingreso declarado actualizado.') }}><Field label="Mi ingreso declarado en este espacio" name="sueldoDeclarado" type="number" min="0" step="0.01" required /><Submit busy={busy}>Guardar</Submit></form>
            {isAdmin && <><form className="filters" onSubmit={event => { event.preventDefault(); const d = formData(event); mutate(`${spacePath}/presupuesto-base?presupuestoBase=${Number(d.presupuesto)}`, 'PATCH', undefined, 'Presupuesto actualizado.') }}><Field label="Presupuesto disponible" name="presupuesto" type="number" min="0" step="0.01" defaultValue={space.presupuestoBase} key={space.presupuestoBase} required /><Submit busy={busy}>Actualizar presupuesto</Submit></form>
              <form className="filters" onSubmit={event => { event.preventDefault(); const d = formData(event); mutate(`${spacePath}/regla-distribucion?reglaReparto=${d.regla}`, 'PATCH', undefined, 'Regla actualizada.') }}><Field label="Regla del espacio"><select name="regla" defaultValue={space.reglaReparto}><option value="CINCUENTA_CINCUENTA">Equitativa</option><option value="PROPORCIONAL">Proporcional</option></select></Field><Submit busy={busy}>Guardar regla</Submit></form></>}
          </section>}
        </div></main>}
    <footer>FairShare · 2026</footer>
  </div>
}
