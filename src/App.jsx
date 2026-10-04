import { BrowserRouter } from 'react-router'
import { AppRoutes } from './app/AppRoutes'
import { SessionProvider } from './features/auth/SessionProvider'
import { UIProvider } from './components/ui'
import './App.css'

export default function App() {
  return <BrowserRouter><UIProvider><SessionProvider><AppRoutes /></SessionProvider></UIProvider></BrowserRouter>
}
