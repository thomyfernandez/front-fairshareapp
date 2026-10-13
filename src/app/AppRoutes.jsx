import { lazy, Suspense } from 'react'
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { Card, EmptyState, LoadingState } from '../components/ui'
import AuthPage from '../features/auth/AuthPage'
import { useSession } from '../features/auth/useSession'
import Dashboard from '../features/dashboard/Dashboard'
import SpacesPage from '../features/espacios/SpacesPage'
import { AppLayout } from './AppLayout'
import { WorkspaceProvider } from './WorkspaceProvider'
import { useWorkspace } from './useWorkspace'
import { WorkspacePage } from './WorkspacePage'
import { FeatureBoundary } from './FeatureBoundary'

const ExpensesPage = lazy(() => import('../features/gastos/ExpensesPage'))
const IncomePage = lazy(() => import('../features/ingresos/IncomePage'))
const BalancePage = lazy(() => import('../features/balance/BalancePage'))
const RecurringPage = lazy(() => import('../features/recurrentes/RecurringPage'))
const SettlementsPage = lazy(() => import('../features/liquidaciones/SettlementsPage'))
const MembersPage = lazy(() => import('../features/miembros/MembersPage'))
const SpaceSettings = lazy(() => import('../features/espacios/SpaceSettings'))
const ComponentGallery = lazy(() => import('../features/design-system/ComponentGallery'))

function ProtectedApp() {
  const { session } = useSession()
  const location = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  return <WorkspaceProvider><AppLayout /></WorkspaceProvider>
}
function LandingPage() {
  const { spaces, spacesState } = useWorkspace()
  if (spacesState.loading) return <LoadingState label="Cargando tus espacios…" />
  if (spaces.length) return <Navigate to={`/espacios/${spaces[0].id}/resumen`} replace />
  return <SpacesPage />
}
function ScreenBoundary() {
  const { pathname } = useLocation()
  return <FeatureBoundary key={pathname}><Suspense fallback={<LoadingState label="Abriendo sección…" />}><Outlet /></Suspense></FeatureBoundary>
}
function NotFound() {
  return <Card><EmptyState title="No encontramos esta página" description="Volvé a tus espacios para continuar." action={<Link className="ui-button ui-button--primary" to="/espacios">Ir a mis espacios</Link>} /></Card>
}
export function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<AuthPage key="login" />} />
    <Route path="/registro" element={<AuthPage key="register" register />} />
    <Route element={<ProtectedApp />}><Route element={<ScreenBoundary />}>
      <Route index element={<LandingPage />} />
      <Route path="espacios" element={<SpacesPage />} />
      <Route path="ingresos" element={<IncomePage />} />
      <Route path="componentes" element={<ComponentGallery />} />
      <Route path="espacios/:id">
        <Route index element={<Navigate to="resumen" replace />} />
        <Route path="resumen" element={<WorkspacePage component={Dashboard} />} />
        <Route path="gastos" element={<WorkspacePage component={ExpensesPage} />} />
        <Route path="balance" element={<WorkspacePage component={BalancePage} />} />
        <Route path="recurrentes" element={<WorkspacePage component={RecurringPage} />} />
        <Route path="liquidaciones" element={<WorkspacePage component={SettlementsPage} />} />
        <Route path="miembros" element={<WorkspacePage component={MembersPage} />} />
        <Route path="configuracion" element={<WorkspacePage component={SpaceSettings} />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Route></Route>
  </Routes>
}
