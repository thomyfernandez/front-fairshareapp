import { Provider } from 'react-redux'
import { createAppStore } from '../app/store'

// Opciones de render con un store nuevo por prueba, para que el estado global no pase de un caso a otro.
export function storeWrapper(store = createAppStore()) {
  return { wrapper: ({ children }) => <Provider store={store}>{children}</Provider> }
}
