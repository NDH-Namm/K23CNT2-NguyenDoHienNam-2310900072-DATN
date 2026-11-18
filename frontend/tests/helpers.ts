import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { ApiUser } from '../src/modules/auth/types/auth.types'

export const TEST_TOKEN = 'token-gia-chi-dung-trong-test'
export const fixture: ApiUser = {
  _id: 'abcdef000000000000000001', employeeCode: 'TEST001', fullName: 'Nguyễn Minh An',
  email: 'an@example.invalid', role: 'admin', status: 'active', mustChangePassword: false,
}
export const meResponse = (user: ApiUser = fixture) => ({ success: true, message: 'Thành công', data: { user } })
export const loginResponse = (user: ApiUser = fixture) => ({
  success: true, message: 'Đăng nhập thành công.',
  data: { accessToken: TEST_TOKEN, user: { ...user, _id: undefined, id: user._id } },
})
export function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  const result = { data, status, statusText: String(status), headers: new AxiosHeaders(), config }
  if (status >= 400) throw new AxiosError('Mock HTTP error', 'ERR_BAD_REQUEST', config, undefined, result)
  return result
}
