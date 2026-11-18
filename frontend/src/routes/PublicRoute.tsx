import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { SessionGate } from '../components/SessionGate'

export function PublicRoute() {
  const { state } = useAuth()
  if (state.status === 'loading' || state.status === 'unavailable') return <SessionGate />
  if (state.status === 'authenticated') return <Navigate to={state.user.mustChangePassword ? '/change-password' : '/dashboard'} replace />
  return <Outlet />
}
