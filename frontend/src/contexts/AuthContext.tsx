import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import axios from 'axios'
import { AuthContext } from './auth-context'
import { authService } from '../modules/auth/services/auth.service'
import { sessionStore } from '../services/session'
import type { AuthNotice, AuthState, ChangePasswordPayload, LoginCredentials } from '../modules/auth/types/auth.types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, notice: null })
  const revision = useRef(0)
  const cancelPendingRequests = useCallback(() => { revision.current++ }, [])

  const logout = useCallback((notice: AuthNotice = 'signed-out') => {
    revision.current++
    sessionStore.setToken(null)
    setState({ status: 'anonymous', user: null, notice })
  }, [])

  const restoreSession = useCallback(async (signal?: AbortSignal) => {
    const request = ++revision.current
    if (!sessionStore.getToken()) {
      setState({ status: 'anonymous', user: null, notice: null })
      return
    }
    setState({ status: 'loading', user: null, notice: null })
    try {
      const user = await authService.me(signal)
      if (request === revision.current) setState({ status: 'authenticated', user, notice: null })
    } catch (error) {
      if (request !== revision.current || axios.isCancel(error)) return
      // Lỗi mạng không được mở Dashboard hoặc âm thầm xóa phiên.
      setState({ status: 'unavailable', user: null, notice: null })
    }
  }, [])

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe((event) => {
      if (event === 'expired') logout('expired')
      else setState((current) => current.status === 'authenticated'
        ? { ...current, user: { ...current.user, mustChangePassword: true } } : current)
    })
    const controller = new AbortController()
    // StrictMode có thể mount lại effect; bỏ lượt đã hủy trước khi gửi request.
    queueMicrotask(() => { if (!controller.signal.aborted) void restoreSession(controller.signal) })
    return () => { controller.abort(); cancelPendingRequests(); unsubscribe() }
  }, [logout, restoreSession, cancelPendingRequests])

  const login = async (credentials: LoginCredentials) => {
    const request = ++revision.current
    try {
      const result = await authService.login(credentials)
      if (request !== revision.current) return
      sessionStore.setToken(result.accessToken)
      // Xác minh bằng /me trước khi đưa người dùng vào các tuyến được bảo vệ.
      const user = await authService.me()
      if (request === revision.current) setState({ status: 'authenticated', user, notice: null })
    } catch (error) {
      if (request === revision.current) {
        sessionStore.setToken(null)
        setState({ status: 'anonymous', user: null, notice: null })
      }
      throw error
    }
  }

  const changePassword = async (payload: ChangePasswordPayload) => {
    const request = revision.current
    await authService.changePassword(payload)
    // Backend tăng tokenVersion; tuyệt đối không tái sử dụng JWT vừa bị thu hồi.
    if (request === revision.current) logout('password-changed')
  }

  return <AuthContext.Provider value={{ state, login, logout, changePassword, retrySession: restoreSession }}>
    {children}
  </AuthContext.Provider>
}
