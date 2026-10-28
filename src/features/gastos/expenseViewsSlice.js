import { createSlice } from '@reduxjs/toolkit'

// Recuerda, por espacio, cómo dejó la persona el listado de Gastos (filtros, página y desplazamiento)
// para volver a esa misma vista desde la navegación o al cambiar de espacio.
const initialState = { bySpace: {} }

const expenseViewsSlice = createSlice({
  name: 'expenseViews',
  initialState,
  reducers: {
    rememberExpenseView: {
      reducer(state, { payload: { spaceId, view } }) {
        state.bySpace[spaceId] = { ...state.bySpace[spaceId], ...view }
      },
      prepare: (spaceId, view) => ({ payload: { spaceId: String(spaceId), view } }),
    },
    // Las vistas pertenecen a la sesión: se descartan al cerrarla para no mostrarlas a otra cuenta.
    clearExpenseViews: () => initialState,
  },
})

export const { rememberExpenseView, clearExpenseViews } =expenseViewsSlice.actions
export default expenseViewsSlice.reducer

export const selectExpenseViews = state => state.expenseViews.bySpace
export const selectExpenseView = (state, spaceId) => state.expenseViews.bySpace[String(spaceId)]
