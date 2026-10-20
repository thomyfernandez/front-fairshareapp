import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, it, vi } from 'vitest'
import { createApi } from '../api'
import { assertContract } from '../mocks/contract'
import { createMockEngine } from '../mocks/mock-engine'
import { createMockFetcher, loadMockFixtures } from '../mocks/mock-fetch'
import { DEMO_ACCOUNT } from '../mocks/config'

const directory = resolve(process.cwd(), 'public/data')
const now = () => new Date('2026-10-19T15:00:00Z')
const manifest = JSON.parse(await readFile(resolve(directory, 'index.json'), 'utf8'))
const fixtures = Object.fromEntries(await Promise.all(Object.entries(manifest.fixtures).map(async ([key, entry]) => [key, JSON.parse(await readFile(resolve(directory, entry.file), 'utf8'))])))
function setup() {
  const engine = createMockEngine(fixtures, { now })
  const auth = engine('/api/v1/usuarios/login', { method: 'POST', body: DEMO_ACCOUNT }).body
  const request = (path, options = {}) => engine(path, { token: auth.token, ...options })
  return { engine, request, auth }
}
const expense = (overrides = {}) => ({ descripcion: 'Cena compartida', monto: 100.01, fecha: '2026-10-19', pagadorId: 1, regla: 'EQUITATIVA', participantes: [{ usuarioId: 1 }, { usuarioId: 2 }], ...overrides })

it('los archivos de datos son DTOs exactos, sin wrappers ni campos inventados', () => {
  for (const [key, entry] of Object.entries(manifest.fixtures)) expect(() => assertContract(entry.dto, fixtures[key])).not.toThrow()
  expect(() => assertContract('GastoDetalleDTO', { ...fixtures.expenses1[0], tipoReparto: 'EQUITATIVA' })).toThrow(/ajeno al DTO/)
  expect(() => assertContract('EspacioResponseDTO', { ...fixtures.spaces[0], presupuestoBase: '2000000' })).toThrow(/número JSON/)
  expect(() => assertContract('EspacioResponseDTO', { ...fixtures.spaces[0], tipo: 'CASA' })).toThrow(/enum inválido/)
})

it('la interfaz consume los JSON locales por fetch y no contacta ningún endpoint Java', async () => {
  const fetcher = vi.fn(async url => {
    expect(url.startsWith('/data/')).toBe(true)
    const file = url.slice('/data/'.length)
    return new Response(await readFile(resolve(directory, file), 'utf8'), { status: 200 })
  })
  const mockFetcher = createMockFetcher({ fetcher, now })
  const publicApi = createApi({ fetcher: mockFetcher, baseUrl: 'https://backend.example.test' })
  const auth = await publicApi('/api/v1/usuarios/login', { method: 'POST', body: DEMO_ACCOUNT })
  assertContract('LoginResponse', auth)
  const api = createApi({ token: auth.token, fetcher: mockFetcher })
  expect((await api('/api/v1/espacios')).map(item => item.nombre)).toEqual(fixtures.spaces.map(item => item.nombre))
  await api('/api/v1/espacios/1/gastos', { method: 'POST', body: expense() })
  expect((await api('/api/v1/espacios/1/gastos')).some(item => item.descripcion === 'Cena compartida')).toBe(true)
  expect(fetcher).toHaveBeenCalledTimes(Object.keys(manifest.fixtures).length + 1)
  expect(fetcher.mock.calls.every(([url]) => url.startsWith('/data/'))).toBe(true)
})

it('conserva errores y cancelaciones de red sin convertirlos en éxitos', async () => {
  const broken = createMockFetcher({ fetcher: vi.fn(async () => new Response('No existe', { status: 404 })) })
  await expect(createApi({ fetcher: broken })('/api/v1/usuarios/login', { method: 'POST', body: DEMO_ACCOUNT })).rejects.toMatchObject({ status: 500, code: 'MOCK_DATA_ERROR' })
  const controller = new AbortController(); controller.abort()
  await expect(broken('/api/v1/espacios', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
})

it('carga los archivos también cuando la aplicación vive en una ruta base', async () => {
  const fetcher = vi.fn(async url => new Response(await readFile(resolve(directory, url.slice('/fairshare/data/'.length)), 'utf8')))
  const loaded = await loadMockFixtures(fetcher, '/fairshare/')
  expect(loaded.spaces).toEqual(fixtures.spaces)
  expect(fetcher.mock.calls.every(([url]) => url.startsWith('/fairshare/data/'))).toBe(true)
})

it('exige autenticación y mantiene separados los ingresos y permisos de cada usuario', () => {
  const { engine, request } = setup()
  expect(engine('/api/v1/espacios').status).toBe(401)
  const invalid = engine('/api/v1/usuarios/login', { method: 'POST', body: { ...DEMO_ACCOUNT, contra: 'incorrecta' } })
  expect(invalid.status).toBe(401); assertContract('ErrorResponseDTO', invalid.body)
  expect(request('/api/v1/sueldos').body.every(income => income.usuarioId === 1)).toBe(true)
  const thomas = engine('/api/v1/usuarios/login', { method: 'POST', body: { ...DEMO_ACCOUNT, email: 'thomas@example.test' } }).body
  const forbidden = engine('/api/v1/espacios/1', { method: 'PUT', token: thomas.token, body: { nombre: 'No autorizado' } })
  expect(forbidden.status).toBe(403)
  expect(request('/api/v1/espacios/1').body.nombre).toBe('Nuestro hogar')
})

it('filtra gastos y cierres con los parámetros reales de los controladores', () => {
  const { request } = setup()
  const filtered = request('/api/v1/espacios/1/gastos?desde=2026-10-08&hasta=2026-10-08')
  expect(filtered.body).toEqual(fixtures.expenses1.filter(row => row.fecha === '2026-10-08')); assertContract('GastoDetalleDTO[]', filtered.body)
  expect(request('/api/v1/espacios/1/liquidaciones/historial?mes=9&anio=2026').body).toEqual(fixtures.history1.filter(row => row.mes === 9 && row.anio === 2026))
  assertContract('LiquidacionResponseDTO[]', request('/api/v1/espacios/1/liquidaciones/historial?mes=10&anio=2026').body)
  assertContract('ServicioVencimientoDTO[]', request('/api/v1/espacios/1/favoritos/vencimientos').body)
})

it('registra lotes atómicos, conserva centavos y actualiza el balance', () => {
  const { request } = setup()
  expect(request('/api/v1/espacios/1/balance').body).toEqual(fixtures.balance1)
  const before = request('/api/v1/espacios/1/gastos').body
  const failure = request('/api/v1/espacios/1/gastos/lote', { method: 'POST', body: [expense(), expense({ monto: -1 })] })
  expect(failure.status).toBe(400)
  expect(request('/api/v1/espacios/1/gastos').body).toEqual(before)
  const created = request('/api/v1/espacios/1/gastos/lote', { method: 'POST', body: [expense(), expense({ monto: 300.01, regla: 'PROPORCIONAL_INGRESOS' })] })
  expect(created.status).toBe(201); assertContract('GastoDetalleDTO[]', created.body)
  expect(created.body[0].participantes.map(part => part.importe)).toEqual([50.01, 50])
  expect(created.body[1].participantes.map(part => part.importe)).toEqual([120.01, 180])
  const net = balance => balance.deudas.reduce((sum, row) => sum + (row.acreedorId === 1 ? Math.round(row.monto * 100) : 0) - (row.deudorId === 1 ? Math.round(row.monto * 100) : 0), 0)
  expect(net(request('/api/v1/espacios/1/balance').body) - net(fixtures.balance1)).toBe(23000)
})

it('valida repartos personalizados y devuelve participantes con el DTO completo', () => {
  const { request } = setup()
  const row = expense({ regla: 'PERSONALIZADA', participantes: [{ usuarioId: 1, porcentaje: 25 }, { usuarioId: 2, porcentaje: 75 }] })
  const response = request('/api/v1/espacios/1/gastos', { method: 'POST', body: row })
  assertContract('GastoDetalleDTO', response.body)
  expect(response.body.participantes.reduce((sum, part) => sum + Math.round(part.importe * 100), 0)).toBe(10001)
  expect(request('/api/v1/espacios/1/gastos', { method: 'POST', body: { ...row, participantes: [{ usuarioId: 1, porcentaje: 10 }, { usuarioId: 2, porcentaje: 10 }] } }).status).toBe(400)
})

it('simula pagos parciales y totales sin descontar el presupuesto del espacio', () => {
  const { request } = setup()
  const debt = fixtures.balance1.deudas[0]
  const amount = Math.floor(debt.monto / 3 * 100) / 100
  const remaining = (Math.round(debt.monto * 100) - Math.round(amount * 100)) / 100
  const total = rows => rows.reduce((sum, row) => sum + Math.round(row.monto * 100), 0)
  const payment = request(`/api/v1/deudas/${debt.id}/saldar`, { method: 'POST', body: { monto: amount } })
  assertContract('DeudaDetalleDTO', payment.body)
  expect(payment.body.monto).toBe(remaining)
  expect(request(`/api/v1/deudas/${debt.id}/saldar`, { method: 'POST', body: { monto: remaining + 1 } }).status).toBe(400)
  expect(total(request('/api/v1/espacios/1/balance').body.deudas)).toBe(total(fixtures.balance1.deudas) - Math.round(amount * 100))
  expect(request(`/api/v1/deudas/${debt.id}/saldar`, { method: 'POST' }).body.estado).toBe('SALDADO')
  expect(request('/api/v1/espacios/1/balance').body.deudas.some(row => row.id === debt.id)).toBe(false)
  expect(request('/api/v1/espacios/1').body.presupuestoBase).toBe(2000000)
})

it('cerrar gastos descuenta el presupuesto una sola vez y devuelve el DTO de liquidación', () => {
  const { request } = setup()
  const close = request('/api/v1/espacios/1/liquidaciones/cierre', { method: 'POST', body: { gastoIds: [101, 102], mes: 10, anio: 2026, descripcion: 'Compras' } })
  expect(close.status).toBe(201); assertContract('LiquidacionResponseDTO', close.body)
  expect(close.body).toMatchObject({ gastosLiquidadosIds: [101, 102], cantidadGastos: 2, resumenCierre: { totalLiquidado: 254464, presupuestoRestante: 1745536 } })
  expect(request('/api/v1/espacios/1/liquidaciones/cierre', { method: 'POST', body: { gastoIds: [101], mes: 10, anio: 2026 } }).status).toBe(409)
  expect(request('/api/v1/espacios/1').body.presupuestoBase).toBe(1745536)
  expect(request('/api/v1/gastos/101', { method: 'DELETE' }).status).toBe(400)
})

it('permite crear, actualizar y usar plantillas y exige revisar las vencidas', () => {
  const { request } = setup()
  expect(request('/api/v1/favoritos/302/ejecutar', { method: 'POST' }).status).toBe(409)
  const updated = request('/api/v1/favoritos/302/actualizar-monto', { method: 'PUT', body: { nuevoMontoBase: 40000, nuevoMontoVariable: 500, nuevaFechaProximaRevision: '2026-11-19' } })
  assertContract('PlantillaGastoResponseDTO', updated.body)
  expect(updated.body.vencido).toBe(false)
  const created = request('/api/v1/favoritos/302/ejecutar', { method: 'POST' })
  assertContract('GastoDetalleDTO', created.body)
  expect(created.body.monto).toBe(40500)
  const template = request('/api/v1/espacios/1/favoritos', { method: 'POST', body: { nombre: 'Expensas', montoBase: 100, montoVariable: 0, fechaProximaRevision: '2026-11-19', pagadorId: 1, reglaDivision: 'EQUITATIVA' } })
  assertContract('PlantillaGastoResponseDTO', template.body)
  expect(request(`/api/v1/favoritos/${template.body.id}`, { method: 'DELETE' }).status).toBe(204)
})

it('permite probar registro, creación y unión a espacios sin persistir contraseñas en DTOs', () => {
  const { engine } = setup()
  const body = { nombre: 'Alex', apellido: 'García', usuario: 'alex', email: 'alex@example.test', contra: 'Ejemplo123!' }
  const registration = engine('/api/v1/usuarios/registro', { method: 'POST', body })
  assertContract('UsuarioResponse', registration.body)
  const auth = engine('/api/v1/usuarios/login', { method: 'POST', body }).body
  assertContract('LoginResponse', auth)
  const request = (path, options = {}) => engine(path, { token: auth.token, ...options })
  expect(request('/api/v1/espacios').body).toEqual([])
  const joined = request('/api/v1/espacios/unirse', { method: 'POST', body: { codigo: 'CASA-2026' } })
  assertContract('MiembroResponseDTO', joined.body)
  const created = request('/api/v1/espacios', { method: 'POST', body: { nombre: 'Casa de prueba', tipo: 'HOGAR', reglaReparto: 'CINCUENTA_CINCUENTA' } })
  assertContract('EspacioResponseDTO', created.body)
  expect(request('/api/v1/espacios').body).toHaveLength(2)
  expect(request(`/api/v1/espacios/${created.body.id}`, { method: 'DELETE' }).status).toBe(204)
})

it('actualiza ingresos por período y reinicia todo al cargar otra instancia desde JSON', () => {
  const { request } = setup()
  const updated = request('/api/v1/sueldos', { method: 'POST', body: { monto: 1500000, tipo: 'FIJO', frecuencia: 'MENSUAL', mes: 10, anio: 2026 } })
  assertContract('SueldoResponse', updated.body)
  expect(request('/api/v1/sueldos').body).toHaveLength(fixtures.incomes.filter(row => row.usuarioId === 1).length)
  expect(updated.body.id).toBe(1)
  expect(setup().request('/api/v1/sueldos/1').body.monto).toBe(1200000)
  expect(fixtures.incomes[0].monto).toBe(1200000)
})

it('incluye cientos de gastos, varios meses y escenarios de permisos distintos', () => {
  const values = prefix => Object.entries(fixtures).filter(([key]) => key.startsWith(prefix)).flatMap(([, rows]) => rows)
  expect(fixtures.spaces).toHaveLength(6)
  expect(fixtures.users).toHaveLength(12)
  expect(values('expenses')).toHaveLength(485)
  expect(values('templates')).toHaveLength(48)
  expect(values('history')).toHaveLength(43)
  expect(fixtures.incomes).toHaveLength(72)
  expect(new Set(values('expenses').map(row => row.fecha.slice(0, 7))).size).toBe(6)
  expect(new Set(values('expenses').map(row => row.regla)).size).toBe(4)
  expect(values('members').find(row => row.espacioId === 3 && row.usuarioId === 1).rol).toBe('MIEMBRO')
})

it('mantiene relaciones, repartos, cierres, presupuestos y balances coherentes en todos los espacios', () => {
  const { request } = setup()
  const allExpenseIds = new Set()
  const allPartIds = new Set()
  const allHistoryIds = new Set()
  const allMemberIds = new Set()
  const allTemplateIds = new Set()
  for (const space of fixtures.spaces) {
    const members = fixtures[`members${space.id}`]
    const ids = new Set(members.map(row => row.usuarioId))
    for (const row of members) {
      expect(allMemberIds.has(row.id)).toBe(false); allMemberIds.add(row.id)
      const user = fixtures.users.find(user => user.id === row.usuarioId)
      expect(row.nombreUsuario).toBe(`${user.nombre} ${user.apellido}`)
      expect(row.emailUsuario).toBe(user.email)
    }
    expect(members.some(row => row.rol === 'ADMIN')).toBe(true)
    const expenses = fixtures[`expenses${space.id}`]
    for (const row of expenses) {
      expect(allExpenseIds.has(row.id)).toBe(false); allExpenseIds.add(row.id)
      expect(ids.has(row.pagadorId)).toBe(true)
      expect(row.espacioNombre).toBe(space.nombre)
      const payer = fixtures.users.find(user => user.id === row.pagadorId)
      expect(row.pagadorNombre).toBe(`${payer.nombre} ${payer.apellido}`)
      expect(row.pagadorEmail).toBe(payer.email)
      expect(row.participantes.reduce((sum, part) => sum + Math.round(part.importe * 100), 0)).toBe(Math.round(row.monto * 100))
      for (const part of row.participantes) {
        expect(allPartIds.has(part.id)).toBe(false); allPartIds.add(part.id)
        expect(ids.has(part.usuarioId)).toBe(true)
        const user = fixtures.users.find(user => user.id === part.usuarioId)
        expect(part.usuarioNombre).toBe(`${user.nombre} ${user.apellido}`)
        expect(part.usuarioEmail).toBe(user.email)
      }
    }
    const closed = new Set()
    const history = [...fixtures[`history${space.id}`]].sort((a, b) => a.fechaLiquidacion.localeCompare(b.fechaLiquidacion))
    let remaining
    for (const row of history) {
      expect(allHistoryIds.has(row.id)).toBe(false); allHistoryIds.add(row.id)
      expect(row.cantidadGastos).toBe(row.gastosLiquidadosIds.length)
      const rows = row.gastosLiquidadosIds.map(id => expenses.find(expense => expense.id === id))
      expect(rows.every(expense => expense?.estado === 'LIQUIDADO' && expense.fecha <= row.fechaLiquidacion)).toBe(true)
      for (const id of row.gastosLiquidadosIds) { expect(closed.has(id)).toBe(false); closed.add(id) }
      const total = rows.reduce((sum, expense) => sum + Math.round(expense.monto * 100), 0)
      expect(total).toBe(Math.round(row.montoTotal * 100))
      const summary = row.resumenCierre
      expect(summary.totalLiquidado).toBe(row.montoTotal)
      expect(summary.cantidadGastosCerrados).toBe(row.cantidadGastos)
      expect(summary.fechaCierre).toBe(row.fechaLiquidacion)
      if (remaining != null) expect(summary.presupuestoAnterior).toBe(remaining)
      expect(Math.round(summary.presupuestoAnterior * 100) - total).toBe(Math.round(summary.presupuestoRestante * 100))
      remaining = summary.presupuestoRestante
    }
    expect(remaining).toBe(space.presupuestoBase)
    expect(closed.size).toBe(expenses.filter(row => row.estado === 'LIQUIDADO').length)
    expect(new Set(fixtures[`templates${space.id}`].map(row => row.nombre)).size).toBe(fixtures[`templates${space.id}`].length)
    for (const row of fixtures[`templates${space.id}`]) {
      expect(allTemplateIds.has(row.id)).toBe(false); allTemplateIds.add(row.id)
      expect(ids.has(row.pagadorId)).toBe(true)
    }
    expect(fixtures[`overdue${space.id}`].length).toBe(fixtures[`templates${space.id}`].filter(row => row.vencido).length)
    expect(request(`/api/v1/espacios/${space.id}/balance`).body).toEqual(fixtures[`balance${space.id}`])
  }
  const periods = fixtures.incomes.map(row => `${row.usuarioId}:${row.anio}:${row.mes}`)
  expect(new Set(periods).size).toBe(periods.length)
})

it('guarda el ícono elegido, conserva automático y rechaza íconos fuera del contrato Java', () => {
  const { request } = setup()
  const created = request('/api/v1/espacios/1/gastos', { method: 'POST', body: expense({ icono: 'MASCOTAS' }) })
  assertContract('GastoDetalleDTO', created.body)
  expect(created.body.icono).toBe('MASCOTAS')
  expect(request(`/api/v1/gastos/${created.body.id}`).body.icono).toBe('MASCOTAS')
  expect(request('/api/v1/espacios/1/gastos').body.find(row => row.id === created.body.id).icono).toBe('MASCOTAS')
  const automatic = request('/api/v1/espacios/1/gastos', { method: 'POST', body: expense() })
  expect(automatic.body.icono).toBeNull()
  const before = request('/api/v1/espacios/1/gastos').body.length
  expect(request('/api/v1/espacios/1/gastos/lote', { method: 'POST', body: [expense({ icono: 'REGALOS' }), expense({ icono: 'NO_EXISTE' })] }).status).toBe(400)
  expect(request('/api/v1/espacios/1/gastos').body).toHaveLength(before)
})

it('consume el catálogo JSON y guarda la categoría en registro, detalle y lote', () => {
  const { engine, request } = setup()
  expect(engine('/api/v1/categorias').status).toBe(401)
  const categories = request('/api/v1/categorias')
  assertContract('CategoriaResponseDTO[]', categories.body)
  expect(categories.body).toEqual(fixtures.categories)
  const pet = categories.body.find(category => category.nombre === 'Mascotas')
  const body = expense({ categoriaId: pet.id })
  const created = request('/api/v1/espacios/1/gastos', { method: 'POST', body })
  expect(created.status).toBe(201)
  expect(created.body).toMatchObject({ categoriaId: pet.id, categoriaNombre: 'Mascotas' })
  expect(request(`/api/v1/gastos/${created.body.id}`).body.categoriaNombre).toBe('Mascotas')
  const batch = request('/api/v1/espacios/1/gastos/lote', { method: 'POST', body: [body, expense()] })
  expect(batch.body[0].categoriaNombre).toBe('Mascotas')
  expect(batch.body[1].categoriaId).toBeNull()
  const before = request('/api/v1/espacios/1/gastos').body.length
  expect(request('/api/v1/espacios/1/gastos/lote', { method: 'POST', body: [body, expense({ categoriaId: 999999 })] }).status).toBe(404)
  expect(request('/api/v1/espacios/1/gastos').body).toHaveLength(before)
})
