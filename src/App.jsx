import { BrowserRouter } from 'react-router'
import { AppRoutes } from './app/AppRoutes'
import { SessionProvider } from './features/auth/SessionProvider'
import { UIProvider } from './components/ui'
import './App.css'
import { MOCK_MODE } from './mocks/config'
import { MockModeNotice } from './mocks/MockModeNotice'

export default function App() {
  return <BrowserRouter>{MOCK_MODE && <MockModeNotice />}<UIProvider><SessionProvider><AppRoutes /></SessionProvider></UIProvider></BrowserRouter>
}
