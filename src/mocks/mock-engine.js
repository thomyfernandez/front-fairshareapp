import { DEMO_ACCOUNT } from './config'
import { buildExpense, calculateBalance, fullName, MockFailure, requireMock, validMoney } from './mock-finance'
import { cents, localDate } from '../lib/format'

const nextId = rows => Math.max(0, ...rows.map(row => row.id)) + 1
const pick = (body, fields) => Object.fromEntries(fields.filter(key => body[key] !== undefined).map(key => [key, body[key]]))
const spaceFields = ['nombre', 'descripcion', 'codigo', 'tipo', 'reglaReparto', 'presupuestoBase']
const templateFields = ['nombre', 'frecuenciaAjusteMeses', 'montoBase', 'montoVariable', 'fechaProximaRevision', 'pagadorId', 'categoriaId', 'reglaDivision']

// Motor exclusivo de demostración. El estado vive en esta instancia y nunca se persiste ni llega a Java.
export function createMockEngine(fixtures, { now = () => new Date() } = {}) {
  const seed = structuredClone(fixtures)
  const values = prefix => Object.entries(seed).filter(([key]) => key.startsWith(prefix)).flatMap(([, rows]) => rows)
  const state = {
    users: seed.users, spaces: seed.spaces, incomes: seed.incomes,
    members: values('members'), expenses: values('expenses'), templates: values('templates'), history: values('history'),
    debts: Object.entries(seed).filter(([key]) => key.startsWith('balance')).flatMap(([, balance]) => balance.deudas.map(debt => ({ id: debt.id, key: `${balance.espacioId}:${debt.deudorId}:${debt.acreedorId}` }))),
    payments: [],
  }
  const passwords = new Map(state.users.map(user => [user.email, DEMO_ACCOUNT.contra]))
  const tokens = new Map()
  const found = (rows, id) => { const row = rows.find(item => item.id === Number(id)); requireMock(row, 'Recurso no encontrado.', 404, 'RECURSO_NO_ENCONTRADO'); return row }
  const member = (spaceId, userId) => state.members.find(item => item.espacioId === spaceId && item.usuarioId === userId)
  const access = (spaceId, user, admin = false) => {
    const space = found(state.spaces, spaceId)
    requireMock(member(space.id, user.id) && (!admin || member(space.id, user.id).rol === 'ADMIN'), 'No tenés permiso para realizar esta acción.', 403, 'ACCESO_DENEGADO')
    return space
  }
  const templateDTO = template => ({ ...template, vencido: Boolean(template.fechaProximaRevision && template.fechaProximaRevision <= localDate(now())) })
  const checkSpace = body => {
    requireMock(typeof body.nombre === 'string' && body.nombre.trim().length >= 2 && body.nombre.length <= 100, 'Revisá el nombre del espacio.')
    requireMock(['HOGAR', 'VIAJE', 'PAREJA', 'TRABAJO', 'OTRO'].includes(body.tipo) && ['CINCUENTA_CINCUENTA', 'PROPORCIONAL'].includes(body.reglaReparto), 'Revisá el tipo de espacio y el reparto.')
    requireMock(validMoney(body.presupuestoBase ?? 0, true), 'El presupuesto no puede ser negativo.')
  }
  const checkTemplate = (body, space) => {
    requireMock(typeof body.nombre === 'string' && body.nombre.trim().length >= 2 && body.nombre.length <= 100, 'Revisá el nombre de la plantilla.')
    requireMock(validMoney(body.montoBase, true) && validMoney(body.montoVariable ?? 0, true), 'Revisá los importes de la plantilla.')
    requireMock(member(space.id, body.pagadorId), 'El pagador debe pertenecer al espacio.')
    requireMock(['EQUITATIVA', 'PARTICIPACION_PARCIAL', 'PROPORCIONAL_INGRESOS'].includes(body.reglaDivision || 'EQUITATIVA'), 'Reparto de plantilla inválido.')
    requireMock(/^\d{4}-\d{2}-\d{2}$/.test(body.fechaProximaRevision || '') && (body.frecuenciaAjusteMeses ?? 1) >= 1, 'Revisá la fecha y la frecuencia de revisión.')
  }

  function dispatch(url, { method, body = {}, token }) {
    const path = url.pathname
    const query = url.searchParams
    const ok = (data, status = 200) => ({ status, body: data })
    if (path === '/api/v1/usuarios/login' && method === 'POST') {
      const user = state.users.find(item => item.email.toLowerCase() === String(body.email || '').trim().toLowerCase())
      requireMock(user && passwords.get(user.email) === body.contra, 'Email o contraseña incorrectos.', 401, 'CREDENCIALES_INVALIDAS')
      const auth = { ...seed.login, email: user.email, nombre: user.nombre, apellido: user.apellido, token: user.id === seed.login.usuario.id ? seed.login.token : `mock-user-${user.id}`, usuario: user }
      tokens.set(auth.token, user.id)
      return ok(auth)
    }
    if (path === '/api/v1/usuarios/registro' && method === 'POST') {
      requireMock(body.nombre?.trim() && body.apellido?.trim() && body.usuario?.length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email || '') && body.contra?.length >= 8, 'Revisá los datos de registro.', 400, 'VALIDATION_ERROR')
      requireMock(!state.users.some(user => user.email.toLowerCase() === body.email.toLowerCase() || user.usuario === body.usuario), 'El email o usuario ya está registrado.', 409, 'RECURSO_DUPLICADO')
      const user = { id: nextId(state.users), ...pick(body, ['usuario', 'email', 'nombre', 'apellido']), rol: 'USUARIO' }
      state.users.push(user); passwords.set(user.email, body.contra)
      return ok(user, 201)
    }
    const user = state.users.find(item => item.id === tokens.get(token))
    requireMock(user, 'Iniciá sesión para continuar.', 401, 'CREDENCIALES_INVALIDAS')
    if (path === '/api/v1/usuarios/me' && method === 'GET') return ok(user)
    if (path === '/api/v1/usuarios' && method === 'GET') return ok(state.users)

    if (path === '/api/v1/espacios') {
      if (method === 'GET') return ok(state.spaces.filter(space => member(space.id, user.id)))
      if (method === 'POST') {
        checkSpace(body)
        const id = nextId(state.spaces)
        const space = { id, descripcion: '', presupuestoBase: 0, ...pick(body, spaceFields), codigo: body.codigo || `DEMO-${id}-2026` }
        requireMock(!state.spaces.some(item => item.codigo === space.codigo), 'El código ya existe.', 409, 'RECURSO_DUPLICADO')
        state.spaces.push(space)
        state.members.push({ id: nextId(state.members), espacioId: id, usuarioId: user.id, nombreUsuario: fullName(user), emailUsuario: user.email, rol: 'ADMIN', sueldoDeclarado: null })
        return ok(space, 201)
      }
    }
    if (path === '/api/v1/espacios/unirse' && method === 'POST') {
      const space = state.spaces.find(item => item.codigo === body.codigo)
      requireMock(space, 'No encontramos un espacio con ese código.', 404, 'RECURSO_NO_ENCONTRADO')
      requireMock(!member(space.id, user.id), 'Ya formás parte de este espacio.', 409, 'CONFLICTO')
      const joined = { id: nextId(state.members), espacioId: space.id, usuarioId: user.id, nombreUsuario: fullName(user), emailUsuario: user.email, rol: 'MIEMBRO', sueldoDeclarado: null }
      state.members.push(joined)
      return ok(joined, 201)
    }
    let match = path.match(/^\/api\/v1\/espacios\/codigo\/([^/]+)$/)
    if (match && method === 'GET') { const space = state.spaces.find(item => item.codigo === decodeURIComponent(match[1])); requireMock(space, 'Código no encontrado.', 404, 'RECURSO_NO_ENCONTRADO'); return ok(space) }
    match = path.match(/^\/api\/v1\/espacios\/(\d+)(?:\/(.*))?$/)
    if (match) {
      const [, id, action = ''] = match
      const admin = method === 'DELETE' || (['PUT', 'PATCH'].includes(method) && action !== 'miembros') || action === 'liquidaciones/cierre'
      const space = access(Number(id), user, admin)
      if (!action) {
        if (method === 'GET') return ok(space)
        if (method === 'PUT') {
          const updated = { ...space, ...pick(body, spaceFields) }; checkSpace(updated)
          Object.assign(space, updated)
          for (const row of [...state.expenses, ...state.history]) if (row.espacioId === space.id) row.espacioNombre = space.nombre
          return ok(space)
        }
        if (method === 'DELETE') {
          state.spaces = state.spaces.filter(item => item.id !== space.id)
          for (const key of ['expenses', 'members', 'templates', 'history']) state[key] = state[key].filter(item => item.espacioId !== space.id)
          return ok(null, 204)
        }
      }
      if (action === 'miembros' && method === 'GET') return ok(state.members.filter(item => item.espacioId === space.id))
      const role = action.match(/^miembros\/(\d+)\/rol$/)
      if (role && method === 'PATCH') {
        const target = state.members.find(item => item.espacioId === space.id && item.usuarioId === Number(role[1]))
        requireMock(target, 'Miembro no encontrado.', 404, 'RECURSO_NO_ENCONTRADO')
        const nextRole = query.get('rol')
        requireMock(['ADMIN', 'MIEMBRO'].includes(nextRole), 'Rol inválido.')
        requireMock(!(target.rol === 'ADMIN' && nextRole !== 'ADMIN' && state.members.filter(item => item.espacioId === space.id && item.rol === 'ADMIN').length === 1), 'El espacio debe conservar al menos un administrador.')
        target.rol = nextRole; return ok(target)
      }
      if (action === 'regla-distribucion' && method === 'PATCH') { const updated = { ...space, reglaReparto: query.get('reglaReparto') }; checkSpace(updated); Object.assign(space, updated); return ok(space) }
      if (action === 'presupuesto-base' && method === 'PATCH') { const updated = { ...space, presupuestoBase: Number(query.get('presupuestoBase')) }; checkSpace(updated); Object.assign(space, updated); return ok(space) }
      if (action === 'gastos' && method === 'GET') return ok(state.expenses.filter(item => item.espacioId === space.id && (!query.get('desde') || item.fecha >= query.get('desde')) && (!query.get('hasta') || item.fecha <= query.get('hasta'))))
      if (['gastos', 'gastos/lote'].includes(action) && method === 'POST') {
        const rows = action === 'gastos/lote' ? body : [body]
        requireMock(Array.isArray(rows) && rows.length > 0 && rows.length <= 100, 'Ingresá entre 1 y 100 gastos.')
        const id = nextId(state.expenses)
        const created = rows.map((row, index) => buildExpense(state, space, row, id + index, now()))
        state.expenses.push(...created)
        return ok(action === 'gastos/lote' ? created : created[0], 201)
      }
      if (action === 'balance' && method === 'GET') return ok(calculateBalance(state, space))
      if (action === 'favoritos' && method === 'GET') return ok(state.templates.filter(item => item.espacioId === space.id).map(templateDTO).filter(item => query.get('soloVencidos') !== 'true' || item.vencido))
      if (action === 'favoritos' && method === 'POST') {
        checkTemplate(body, space)
        const template = { id: nextId(state.templates), ...pick(body, templateFields), montoVariable: body.montoVariable ?? 0, frecuenciaAjusteMeses: body.frecuenciaAjusteMeses ?? 1, categoriaId: body.categoriaId ?? null, reglaDivision: body.reglaDivision || 'EQUITATIVA', espacioId: space.id, servicioId: null, nombreServicio: null, vencido: false }
        state.templates.push(template); return ok(templateDTO(template), 201)
      }
      if (action === 'favoritos/vencimientos' && method === 'GET') return ok(state.templates.filter(item => item.espacioId === space.id && templateDTO(item).vencido).map(item => ({ servicioId: item.servicioId ?? item.id, nombreServicio: item.nombreServicio ?? item.nombre, fechaVencimiento: item.fechaProximaRevision, montoBase: item.montoBase, montoVariable: item.montoVariable, diasVencido: Math.floor((Date.parse(localDate(now())) - Date.parse(item.fechaProximaRevision)) / 86400000) })))
      if (action === 'liquidaciones/historial' && method === 'GET') return ok(state.history.filter(item => item.espacioId === space.id && (!query.get('mes') || item.mes === Number(query.get('mes'))) && (!query.get('anio') || item.anio === Number(query.get('anio'))) && (!query.get('desde') || item.fechaLiquidacion >= query.get('desde')) && (!query.get('hasta') || item.fechaLiquidacion <= query.get('hasta'))))
      if (action === 'liquidaciones/cierre' && method === 'POST') {
        const pending = state.expenses.filter(item => item.espacioId === space.id && item.estado === 'PENDIENTE')
        const ids = body.gastoIds?.length ? body.gastoIds : pending.map(item => item.id)
        requireMock(ids.length > 0 && new Set(ids).size === ids.length && ids.every(gastoId => pending.some(item => item.id === gastoId)), 'Los gastos cambiaron o ya fueron liquidados.', 409, 'CONFLICTO')
        const rows = pending.filter(item => ids.includes(item.id)); const total = rows.reduce((sum, item) => sum + cents(item.monto), 0) / 100
        requireMock(cents(space.presupuestoBase) >= cents(total), 'El presupuesto disponible no alcanza para este cierre.')
        requireMock((body.mes ?? now().getMonth() + 1) >= 1 && (body.mes ?? now().getMonth() + 1) <= 12 && (body.anio ?? now().getFullYear()) >= 2000 && (body.anio ?? now().getFullYear()) <= 9999, 'Período inválido.')
        const before = space.presupuestoBase; const after = (cents(before) - cents(total)) / 100; const date = localDate(now())
        const history = { id: nextId(state.history), espacioId: space.id, espacioNombre: space.nombre, montoTotal: total, fechaLiquidacion: date, mes: body.mes || now().getMonth() + 1, anio: body.anio || now().getFullYear(), descripcion: body.descripcion ?? null, cantidadGastos: rows.length, gastosLiquidadosIds: ids, resumenCierre: { totalLiquidado: total, presupuestoAnterior: before, presupuestoRestante: after, cantidadGastosCerrados: rows.length, fechaCierre: date } }
        rows.forEach(item => { item.estado = 'LIQUIDADO' }); space.presupuestoBase = after; state.history.push(history)
        return ok(history, 201)
      }
    }
    match = path.match(/^\/api\/v1\/gastos\/(\d+)$/)
    if (match) {
      const expense = found(state.expenses, match[1]); const space = access(expense.espacioId, user)
      if (method === 'GET') return ok(expense)
      if (method === 'DELETE') {
        requireMock(expense.pagadorId === user.id || member(space.id, user.id).rol === 'ADMIN', 'No tenés permiso para eliminar este gasto.', 403, 'ACCESO_DENEGADO')
        requireMock(expense.estado === 'PENDIENTE', 'No se puede eliminar un gasto liquidado.')
        state.expenses = state.expenses.filter(item => item.id !== expense.id); return ok(null, 204)
      }
    }
    match = path.match(/^\/api\/v1\/favoritos\/(\d+)(?:\/(.*))?$/)
    if (match) {
      const template = found(state.templates, match[1]); const space = access(template.espacioId, user)
      if (!match[2] && method === 'GET') return ok(templateDTO(template))
      if (!match[2] && method === 'DELETE') { state.templates = state.templates.filter(item => item.id !== template.id); return ok(null, 204) }
      if (match[2] === 'actualizar-monto' && method === 'PUT') {
        const updated = { ...template, montoBase: body.nuevoMontoBase, montoVariable: body.nuevoMontoVariable ?? 0, fechaProximaRevision: body.nuevaFechaProximaRevision || template.fechaProximaRevision }
        checkTemplate(updated, space); Object.assign(template, updated); return ok(templateDTO(template))
      }
      if (match[2] === 'ejecutar' && method === 'POST') {
        requireMock(!templateDTO(template).vencido, 'Actualizá el monto y la revisión antes de generar el gasto.', 409, 'CICLO_VENCIDO')
        const created = buildExpense(state, space, { descripcion: template.nombre, monto: (cents(template.montoBase) + cents(template.montoVariable)) / 100, pagadorId: template.pagadorId, categoriaId: template.categoriaId, regla: template.reglaDivision, participantes: state.members.filter(item => item.espacioId === space.id).map(item => ({ usuarioId: item.usuarioId })) }, nextId(state.expenses), now())
        state.expenses.push(created); return ok(created, 201)
      }
    }
    match = path.match(/^\/api\/v1\/deudas\/(\d+)\/saldar$/)
    if (match && method === 'POST') {
      const record = found(state.debts, match[1]); const space = access(Number(record.key.split(':')[0]), user)
      const debt = calculateBalance(state, space).deudas.find(item => item.id === record.id)
      requireMock(debt, 'La deuda ya está saldada.', 409, 'CONFLICTO')
      requireMock(debt.deudorId === user.id || member(space.id, user.id).rol === 'ADMIN', 'No tenés permiso para registrar este pago.', 403, 'ACCESO_DENEGADO')
      const amount = body.monto ?? debt.monto
      requireMock(validMoney(amount) && cents(amount) <= cents(debt.monto), 'El pago debe ser positivo y no superar la deuda.')
      state.payments.push({ spaceId: space.id, deudorId: debt.deudorId, acreedorId: debt.acreedorId, monto: amount })
      const remaining = (cents(debt.monto) - cents(amount)) / 100
      return ok({ ...debt, monto: remaining, estado: remaining === 0 ? 'SALDADO' : 'PENDIENTE', liquidacionId: body.liquidacionId ?? null })
    }
    match = path.match(/^\/api\/v1\/sueldos(?:\/(\d+))?$/)
    if (match) {
      const id = match[1]
      if (!id && method === 'GET') { requireMock(!query.get('usuarioId') || Number(query.get('usuarioId')) === user.id, 'Solo podés consultar tus ingresos.', 403, 'ACCESO_DENEGADO'); return ok(state.incomes.filter(item => item.usuarioId === user.id)) }
      const existing = id ? found(state.incomes, id) : null
      requireMock((!existing || existing.usuarioId === user.id) && (!body.usuarioId || body.usuarioId === user.id), 'Solo podés modificar tus ingresos.', 403, 'ACCESO_DENEGADO')
      if (existing && method === 'GET') return ok(existing)
      if (existing && method === 'DELETE') { state.incomes = state.incomes.filter(item => item.id !== existing.id); return ok(null, 204) }
      if (method === 'POST' || (existing && method === 'PUT')) {
        requireMock(validMoney(body.monto) && ['FIJO', 'VARIABLE'].includes(body.tipo) && ['MENSUAL', 'QUINCENAL'].includes(body.frecuencia), 'Revisá el ingreso, tipo y frecuencia.')
        const month = body.mes ?? now().getMonth() + 1; const year = body.anio ?? now().getFullYear()
        requireMock(Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 2000 && year <= 9999, 'Período de ingreso inválido.')
        const samePeriod = state.incomes.find(item => item.usuarioId === user.id && item.mes === month && item.anio === year)
        requireMock(!existing || !samePeriod || samePeriod.id === existing.id, 'Ya hay un ingreso para ese período.', 409, 'CONFLICTO')
        const target = existing || samePeriod
        const updated = { id: target?.id || nextId(state.incomes), usuarioId: user.id, monto: body.monto, tipo: body.tipo, frecuencia: body.frecuencia, mes: month, anio: year, usuarioNombre: fullName(user) }
        if (target) Object.assign(target, updated); else state.incomes.push(updated)
        return ok(updated, target ? 200 : 201)
      }
    }
    throw new MockFailure('Este endpoint no está simulado. No se contactó al backend.', 404, 'RECURSO_NO_ENCONTRADO')
  }

  return function request(path, options = {}) {
    const url = new URL(path, 'http://mock.local')
    try { const result = dispatch(url, { method: 'GET', ...options }); return structuredClone(result) }
    catch (error) {
      if (!(error instanceof MockFailure)) throw error
      return { status: error.status, body: { timestamp: now().toISOString(), status: error.status, code: error.code, message: error.message, path: url.pathname, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) } }
    }
  }
}
