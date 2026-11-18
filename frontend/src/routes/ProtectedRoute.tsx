import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { SessionGate } from '../components/SessionGate'

export function ProtectedRoute({ allowPasswordChange = false }: { allowPasswordChange?: boolean }) {
  const { state } = useAuth()
  if (state.status === 'loading' || state.status === 'unavailable') return <SessionGate />
  if (state.status === 'anonymous') return <Navigate to="/login" replace />
  if (!allowPasswordChange && state.user.mustChangePassword) return <Navigate to="/change-password" replace />
  return <Outlet />
}
