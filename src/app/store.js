import { configureStore } from '@reduxjs/toolkit'
import expenseViewsReducer from '../features/gastos/expenseViewsSlice'

// Las pruebas crean su propio store para que el estado no se comparta entre casos.
export const createAppStore = preloadedState => configureStore({
  reducer: { expenseViews: expenseViewsReducer },
  preloadedState,
})

export const store = createAppStore()
