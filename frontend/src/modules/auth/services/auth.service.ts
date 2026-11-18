import api, { publicApi } from '../../../services/api'
import { normalizeUser } from '../types/auth.types'
import type { ApiResponse, ApiUser, ChangePasswordPayload, LoginCredentials } from '../types/auth.types'

export const authService = {
  async login(credentials: LoginCredentials) {
    const response = await publicApi.post<ApiResponse<{ accessToken: string; user: ApiUser }>>('/auth/login', {
      email: credentials.email.trim().toLowerCase(), password: credentials.password,
    })
    const { accessToken, user } = response.data.data
    if (!response.data.success || typeof accessToken !== 'string' || !accessToken) {
      throw new Error('Phản hồi đăng nhập không hợp lệ.')
    }
    return { accessToken, user: normalizeUser(user) }
  },
  async me(signal?: AbortSignal) {
    const response = await api.get<ApiResponse<{ user: ApiUser }>>('/auth/me', { signal })
    if (!response.data.success) throw new Error('Không thể xác thực tài khoản.')
    return normalizeUser(response.data.data.user)
  },
  async changePassword(payload: ChangePasswordPayload) {
    const response = await api.patch<{ success: boolean; message: string }>('/auth/change-password', payload)
    if (!response.data.success) throw new Error('Không thể đổi mật khẩu.')
  },
}
