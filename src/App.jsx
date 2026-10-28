import { BrowserRouter } from 'react-router'
import { Provider } from 'react-redux'
import { store } from './app/store'
import { AppRoutes } from './app/AppRoutes'
import { SessionProvider } from './features/auth/SessionProvider'
import { UIProvider } from './components/ui'
import './App.css'
import { MOCK_MODE } from './mocks/config'
import { MockModeNotice } from './mocks/MockModeNotice'

export default function App() {
  return <Provider store={store}><BrowserRouter>{MOCK_MODE && <MockModeNotice />}<UIProvider><SessionProvider><AppRoutes /></SessionProvider></UIProvider></BrowserRouter></Provider>
}
