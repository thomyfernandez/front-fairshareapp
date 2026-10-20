import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { userAvatarChoices } from '../src/components/ui/user-avatars.js'
import { buildExpense, calculateBalance, fullName } from '../src/mocks/mock-finance.js'

// Conjunto reproducible: regenerarlo no cambia las fechas ni introduce datos aleatorios.
const reference = '2026-10-19'
const now = new Date(`${reference}T15:00:00Z`)
const directory = fileURLToPath(new URL('../public/data/', import.meta.url))
const write = (file, value) => writeFile(`${directory}${file}`, `${JSON.stringify(value, null, 2)}\n`)
const date = (month, day) => `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
const cents = value => Math.round(value * 100)
const names = [['Ana', 'Ruiz', 'ana', 'demo@fairshare.test'], ['Thomas', 'Fernandez', 'thomas'], ['Sol', 'García', 'sol'], ['Lucía', 'Pérez', 'lucia'], ['Martín', 'López', 'martin'], ['Valentina', 'Torres', 'valentina'], ['Nicolás', 'Romero', 'nicolas'], ['Camila', 'Díaz', 'camila'], ['Mateo', 'Herrera', 'mateo'], ['Julieta', 'Castro', 'julieta'], ['Santiago', 'Acosta', 'santiago'], ['Emilia', 'Vega', 'emilia']]
const users = names.map(([nombre, apellido, usuario, email], index) => ({ id: index + 1, usuario, email: email || `${usuario}@example.test`, nombre, apellido, rol: 'USUARIO', avatarId: index < 10 ? userAvatarChoices[(index + 3) % userAvatarChoices.length].id : null }))
const configurations = [
  ['Nuestro hogar', 'Compras, servicios y convivencia.', 'CASA-2026', 'HOGAR', 'PROPORCIONAL', 2000000, [1, 2, 4, 5], 1],
  ['Viaje al sur', 'Alojamiento, comidas y excursiones en equipo.', 'VIAJE-2026', 'VIAJE', 'CINCUENTA_CINCUENTA', 950000, [1, 2, 3, 6, 7, 8], 1],
  ['Oficina compartida', 'Los gastos del estudio y sus proyectos.', 'OFICINA-2026', 'TRABAJO', 'PROPORCIONAL', 80000, [1, 3, 4, 9, 10], 3],
  ['Equipo de fútbol', 'Cancha, camisetas y tercer tiempo.', 'EQUIPO-2026', 'OTRO', 'CINCUENTA_CINCUENTA', 600000, [1, 2, 4, 5, 6, 8, 11, 12], 1],
  ['Proyecto final', 'Materiales, herramientas y entregas de la facultad.', 'PROYECTO-2026', 'OTRO', 'CINCUENTA_CINCUENTA', 350000, [1, 3, 5, 7, 9, 12], 9],
  ['Planes en pareja', 'Salidas y proyectos de a dos.', 'PAREJA-2026', 'PAREJA', 'PROPORCIONAL', 1200000, [1, 2], 1],
]
const spaces = configurations.map(([nombre, descripcion, codigo, tipo, reglaReparto, presupuestoBase], index) => ({ id: index + 1, nombre, descripcion, codigo, tipo, reglaReparto, presupuestoBase }))
const incomeBase = [1200000, 1800000, 1000000, 1350000, 1550000, 1100000, 1650000, 1450000, 2100000, 1750000, 1250000, 950000]
const incomes = []
function addIncome(userId, month, id = incomes.length + 1) {
  const user = users[userId - 1]
  const monto = incomeBase[userId - 1] - (10 - month) * 20000
  incomes.push({ id, usuarioId: userId, monto, tipo: userId % 4 === 0 ? 'VARIABLE' : 'FIJO', frecuencia: userId % 5 === 0 ? 'QUINCENAL' : 'MENSUAL', mes: month, anio: 2026, usuarioNombre: fullName(user) })
}
addIncome(1, 10); addIncome(1, 9); addIncome(2, 10); addIncome(3, 10)
for (const user of users) for (let month = 5; month <= 10; month++) if (!incomes.some(row => row.usuarioId === user.id && row.mes === month)) addIncome(user.id, month)
const members = configurations.flatMap((configuration, index) => configuration[6].map(userId => ({ id: (index + 1) * 100 + userId, espacioId: index + 1, usuarioId: userId, nombreUsuario: fullName(users[userId - 1]), emailUsuario: users[userId - 1].email, avatarId: users[userId - 1].avatarId, rol: userId === configuration[7] ? 'ADMIN' : 'MIEMBRO', sueldoDeclarado: incomeBase[userId - 1] })))
const categories = [[1, 'Supermercado'], [2, 'Internet'], [3, 'Transporte'], [4, 'Servicios'], [5, 'Comidas'], [6, 'Hogar'], [7, 'Trabajo'], [8, 'Ocio'], [9, 'Estudio'], [10, 'Deportes'], [11, 'Salud'], [12, 'Regalos'], [13, 'Mascotas'], [14, 'Otros']]
const concepts = [
  [['Coto', 1, 45200], ['Verdulería', 1, 12750], ['Alquiler', 6, 450000], ['Luz', 4, 34566], ['Gas', 4, 18350], ['Internet', 2, 32000], ['Artículos de limpieza', 6, 22400], ['Ferretería', 6, 15480], ['Delivery del viernes', 5, 28600], ['Expensas', 6, 92500]],
  [['Cabaña en Bariloche', 6, 180000], ['Combustible', 3, 68000], ['Excursión al lago', 8, 95000], ['Cena en el centro', 5, 72000], ['Compras para el viaje', 1, 56000], ['Estacionamiento', 3, 12000], ['Alquiler de equipo', 8, 45500], ['Desayuno en ruta', 5, 26500], ['Seguro de viaje', 3, 34000], ['Pasajes', 3, 125000]],
  [['Alquiler del estudio', 7, 280000], ['Café y té', 5, 18400], ['Internet de la oficina', 2, 46000], ['Licencia de diseño', 7, 32000], ['Papelería', 7, 12600], ['Impresiones', 7, 8500], ['Limpieza del estudio', 7, 62000], ['Almuerzo del equipo', 5, 48500], ['Servicio eléctrico', 4, 58000], ['Accesorios de trabajo', 7, 39200]],
  [['Reserva de cancha', 10, 52000], ['Pelota nueva', 10, 42000], ['Camisetas del equipo', 10, 96000], ['Bebidas del partido', 5, 18500], ['Tercer tiempo', 5, 65800], ['Traslado al torneo', 3, 45000], ['Inscripción al torneo', 10, 80000], ['Botiquín', 10, 15400], ['Entrenamiento', 10, 28000], ['Lavado de camisetas', 10, 12000]],
  [['Impresión de láminas', 9, 18000], ['Materiales para maqueta', 9, 34500], ['Suscripción de prototipado', 9, 24000], ['Encuadernación', 9, 16500], ['Merienda de estudio', 5, 14500], ['Traslado a la facultad', 3, 9800], ['Hosting del proyecto', 9, 12000], ['Compra de cartón', 9, 8600], ['Impresión 3D', 9, 42000], ['Presentación final', 9, 21500]],
  [['Cena de aniversario', 5, 92000], ['Entradas de cine', 8, 24500], ['Compra del fin de semana', 1, 62500], ['Escapada de fin de semana', 8, 150000], ['Café y merienda', 5, 18500], ['Regalo compartido', 8, 48000], ['Transporte de la salida', 3, 15600], ['Entradas al teatro', 8, 68000], ['Comida para cocinar', 1, 32000], ['Fondo para vacaciones', 8, 120000]],
]
const categoryCatalog = categories.map(([id, nombre]) => ({ id, nombre }))
const state = { categories: categoryCatalog, users, spaces, incomes, members, expenses: [], debts: [], payments: [] }
function expense(space, id, body) {
  const row = buildExpense(state, space, body, id, now)
  row.categoriaNombre = categories.find(([categoryId]) => categoryId === row.categoriaId)?.[1] || null
  state.expenses.push(row)
  return row
}
const equal = ids => ids.map(usuarioId => ({ usuarioId }))
// Conservar los ejemplos reconocibles y sus IDs.
expense(spaces[0], 101, { descripcion: 'DIA', monto: 231232, fecha: date(10, 8), pagadorId: 2, categoriaId: 1, regla: 'EQUITATIVA', participantes: equal([1, 2]) })
expense(spaces[0], 102, { descripcion: 'Coto', monto: 23232, fecha: date(10, 8), pagadorId: 1, categoriaId: 1, regla: 'EQUITATIVA', participantes: equal([1, 2]) })
expense(spaces[0], 103, { descripcion: 'Internet', monto: 32000, fecha: date(10, 2), pagadorId: 1, categoriaId: 2, regla: 'EQUITATIVA', participantes: equal([1, 2]) }).estado = 'LIQUIDADO'
expense(spaces[1], 201, { descripcion: 'Transporte', monto: 90000, fecha: date(10, 12), pagadorId: 1, categoriaId: 3, regla: 'EQUITATIVA', participantes: equal([1, 2, 3]) })
expense(spaces[1], 202, { descripcion: 'Hospedaje', monto: 300000, fecha: date(10, 13), pagadorId: 2, regla: 'EQUITATIVA', participantes: equal([1, 2, 3]) })
for (const space of spaces) {
  const ids = configurations[space.id - 1][6]
  let sequence = 0
  for (let month = 5; month <= 10; month++) {
    const count = month === 10 ? 20 : 12
    for (let index = 0; index < count; index++, sequence++) {
      const [descripcion, categoriaId, base] = concepts[space.id - 1][index % 10]
      const regla = ['EQUITATIVA', 'PROPORCIONAL_INGRESOS', 'PERSONALIZADA', 'PARTICIPACION_PARCIAL'][index % 4]
      const participantIds = regla === 'PARTICIPACION_PARCIAL' ? ids.slice(0, Math.max(2, ids.length - 1)) : ids
      const monto = (cents(base) + (month - 5) * 3137 + index * 789) / 100
      const participants = regla === 'PERSONALIZADA' ? participantIds.map((usuarioId, part) => index % 8 === 6
        ? { usuarioId, importe: (part ? Math.floor(cents(monto) / participantIds.length) : cents(monto) - (participantIds.length - 1) * Math.floor(cents(monto) / participantIds.length)) / 100 }
        : { usuarioId, porcentaje: part ? Math.floor(10000 / participantIds.length) / 100 : (10000 - (participantIds.length - 1) * Math.floor(10000 / participantIds.length)) / 100 }) : equal(participantIds)
      const day = month === 10 ? 1 + Math.floor(index * 18 / 19) : 1 + (index * 2) % 28
      const icono = index % 3 === 0 ? { 1: 'COMPRAS', 2: 'INTERNET', 3: 'TRANSPORTE', 4: 'SERVICIOS', 5: 'COMIDAS', 6: 'HOGAR', 7: 'TRABAJO', 8: 'OCIO', 9: 'ESTUDIO', 10: 'DEPORTES' }[categoriaId] : null
      const row = expense(space, space.id * 10000 + sequence + 1, { descripcion, icono, monto, fecha: date(month, day), pagadorId: ids[(sequence + space.id) % ids.length], categoriaId, regla, participantes: participants })
      row.estado = month < 10 || index < 8 ? 'LIQUIDADO' : 'PENDIENTE'
    }
  }
}
const history = []
let historyId = 2
for (const space of spaces) {
  const groups = new Map()
  for (const row of state.expenses.filter(row => row.espacioId === space.id && row.estado === 'LIQUIDADO')) {
    const month = Number(row.fecha.slice(5, 7))
    const closeDate = row.id === 103 ? date(10, 3) : month < 10 ? date(month, 28) : date(10, Number(row.fecha.slice(8)) <= 3 ? 6 : 10)
    const rows = groups.get(closeDate) || []; rows.push(row); groups.set(closeDate, rows)
  }
  let budget = cents(space.presupuestoBase) + [...groups.values()].flat().reduce((sum, row) => sum + cents(row.monto), 0)
  for (const [fecha, rows] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const total = rows.reduce((sum, row) => sum + cents(row.monto), 0)
    history.push({ id: rows.some(row => row.id === 103) ? 1 : historyId++, espacioId: space.id, espacioNombre: space.nombre, montoTotal: total / 100, fechaLiquidacion: fecha, mes: Number(fecha.slice(5, 7)), anio: 2026, descripcion: `Cierre de ${space.nombre.toLocaleLowerCase('es-AR')}`, cantidadGastos: rows.length, gastosLiquidadosIds: rows.map(row => row.id), resumenCierre: { totalLiquidado: total / 100, presupuestoAnterior: budget / 100, presupuestoRestante: (budget - total) / 100, cantidadGastosCerrados: rows.length, fechaCierre: fecha } })
    budget -= total
  }
}
const templateConcepts = concepts.map(rows => rows.slice(0, 8))
templateConcepts[0] = [['Alquiler', 6, 450000], ['Internet', 2, 32000], ['Luz', 4, 34566], ['Gas', 4, 18350], ['Expensas', 6, 92500], ['Artículos de limpieza', 6, 22400], ['Seguro del hogar', 6, 12500], ['Agua', 4, 15800]]
const templates = spaces.flatMap(space => templateConcepts[space.id - 1].map(([nombre, categoriaId, montoBase], index) => {
  const ids = configurations[space.id - 1][6]
  const overdue = index % 3 === 1
  return { id: space.id * 100 + 200 + index + 1, nombre, frecuenciaAjusteMeses: index % 4 === 0 ? 3 : 1, montoBase, montoVariable: index % 3 === 1 ? 2000 : 0, fechaProximaRevision: overdue ? date(10, 10 + index) : `2026-11-${String(10 + index).padStart(2, '0')}`, espacioId: space.id, servicioId: null, nombreServicio: null, pagadorId: ids[index % ids.length], categoriaId, reglaDivision: index % 3 === 0 ? 'PROPORCIONAL_INGRESOS' : 'EQUITATIVA', vencido: overdue }
}))
// Mantener las tres plantillas iniciales para que enlaces y borradores sigan siendo útiles.
Object.assign(templates[0], { nombre: 'Alquiler', montoBase: 450000, montoVariable: 0, pagadorId: 2, categoriaId: 6, fechaProximaRevision: '2026-11-19', reglaDivision: 'PROPORCIONAL_INGRESOS', vencido: false })
Object.assign(templates[1], { nombre: 'Internet', montoBase: 32000, montoVariable: 2000, pagadorId: 1, categoriaId: 2, fechaProximaRevision: '2026-10-15', reglaDivision: 'EQUITATIVA', vencido: true })
Object.assign(templates[2], { nombre: 'Luz', montoBase: 34566, montoVariable: 0, pagadorId: 1, categoriaId: 4, fechaProximaRevision: '2026-11-19', reglaDivision: 'EQUITATIVA', vencido: false })
const manifest = { description: 'Manifiesto de archivos; los DTOs se encuentran sin envoltorios en cada archivo indicado.', referenceDate: reference, fixtures: {} }
async function fixture(key, file, dto, value) { manifest.fixtures[key] = { file, dto }; await write(file, value) }
await fixture('login', 'login.json', 'LoginResponse', { token: 'mock-demo-ana-v1', tokenType: 'Bearer', expiresIn: 3600, email: users[0].email, nombre: users[0].nombre, apellido: users[0].apellido, usuario: users[0] })
await fixture('categories', 'categorias.json', 'CategoriaResponseDTO[]', categoryCatalog)
await fixture('users', 'usuarios.json', 'UsuarioResponse[]', users)
await fixture('spaces', 'espacios.json', 'EspacioResponseDTO[]', spaces)
await fixture('incomes', 'sueldos.json', 'SueldoResponse[]', incomes)
state.expenses.sort((a, b) => a.espacioId - b.espacioId || b.fecha.localeCompare(a.fecha) || b.id - a.id)
for (const space of spaces) {
  const id = space.id
  const rows = templates.filter(row => row.espacioId === id)
  await fixture(`members${id}`, `miembros-${id}.json`, 'MiembroResponseDTO[]', members.filter(row => row.espacioId === id))
  await fixture(`expenses${id}`, `gastos-${id}.json`, 'GastoDetalleDTO[]', state.expenses.filter(row => row.espacioId === id).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id))
  await fixture(`balance${id}`, `balance-${id}.json`, 'BalanceDTO', calculateBalance(state, space))
  await fixture(`templates${id}`, `recurrentes-${id}.json`, 'PlantillaGastoResponseDTO[]', rows)
  await fixture(`history${id}`, `liquidaciones-${id}.json`, 'LiquidacionResponseDTO[]', history.filter(row => row.espacioId === id))
  await fixture(`overdue${id}`, `vencimientos-${id}.json`, 'ServicioVencimientoDTO[]', rows.filter(row => row.vencido).map(row => ({ servicioId: row.id, nombreServicio: row.nombre, fechaVencimiento: row.fechaProximaRevision, montoBase: row.montoBase, montoVariable: row.montoVariable, diasVencido: Math.round((Date.parse(reference) - Date.parse(row.fechaProximaRevision)) / 86400000) })))
}
await fixture('error', 'error.json', 'ErrorResponseDTO', { timestamp: `${reference}T15:00:00Z`, status: 404, code: 'RECURSO_NO_ENCONTRADO', message: 'No encontramos el recurso solicitado.', path: '/api/v1/gastos/999999' })
await write('index.json', manifest)
console.log(`${spaces.length} espacios, ${users.length} personas, ${members.length} membresías, ${state.expenses.length} gastos, ${templates.length} plantillas, ${history.length} cierres y ${incomes.length} ingresos.`)
