import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import { LoginPage } from '../modules/auth/pages/LoginPage'
import { ChangePasswordPage } from '../modules/auth/pages/ChangePasswordPage'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { DashboardPage } from '../modules/dashboard/pages/DashboardPage'
import { NotFoundPage } from '../components/NotFoundPage'

export function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route element={<PublicRoute />}><Route path="/login" element={<LoginPage />} /></Route>
    <Route element={<ProtectedRoute allowPasswordChange />}>
      <Route path="/change-password" element={<ChangePasswordPage />} />
    </Route>
    <Route element={<ProtectedRoute />}>
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes>
}
