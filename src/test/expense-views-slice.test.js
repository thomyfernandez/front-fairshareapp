import { describe, expect, it } from 'vitest'
import { createAppStore } from '../app/store'
import { clearExpenseViews, rememberExpenseView, selectExpenseView, selectExpenseViews } from '../features/gastos/expenseViewsSlice'

describe('expenseViewsSlice', () => {
  it('recuerda la vista de cada espacio por separado y combina los datos parciales', () => {
    const store = createAppStore()
    store.dispatch(rememberExpenseView(1, { query: 'q=super', scroll: 0 }))
    store.dispatch(rememberExpenseView('2', { query: 'desde=2026-09-01' }))
    store.dispatch(rememberExpenseView('1', { scroll: 480 }))
    expect(selectExpenseView(store.getState(), 1)).toEqual({ query: 'q=super', scroll: 480 })
    expect(selectExpenseView(store.getState(), '2')).toEqual({ query: 'desde=2026-09-01' })
    expect(selectExpenseView(store.getState(), 3)).toBeUndefined()
  })

  it('olvida todas las vistas al cerrar la sesión', () => {
    const store = createAppStore()
    store.dispatch(rememberExpenseView(1, { query: 'pagina=2' }))
    store.dispatch(clearExpenseViews())
    expect(selectExpenseViews(store.getState())).toEqual({})
  })
})
