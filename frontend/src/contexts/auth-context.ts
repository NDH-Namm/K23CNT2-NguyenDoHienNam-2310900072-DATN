import { createContext, useContext } from 'react'
import type { AuthNotice, AuthState, ChangePasswordPayload, LoginCredentials } from '../modules/auth/types/auth.types'

export interface AuthContextValue {
  state: AuthState
  login: (credentials: LoginCredentials) => Promise<void>
  logout: (notice?: AuthNotice) => void
  changePassword: (payload: ChangePasswordPayload) => Promise<void>
  retrySession: () => Promise<void>
}
export const AuthContext = createContext<AuthContextValue | null>(null)
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth cần nằm trong AuthProvider.')
  return value
}
