import type { ChangePasswordPayload, LoginCredentials } from './types/auth.types'

export type PasswordForm = ChangePasswordPayload & { confirmPassword: string }
export type FieldErrors<T> = Partial<Record<keyof T, string>>
export const passwordByteLength = (value: string) => new TextEncoder().encode(value).byteLength

export function validateLogin(values: LoginCredentials): FieldErrors<LoginCredentials> {
  const errors: FieldErrors<LoginCredentials> = {}
  if (!values.email.trim()) errors.email = 'Vui lòng nhập email của bạn.'
  else if (values.email.trim().length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Vui lòng nhập địa chỉ email hợp lệ.'
  }
  if (!values.password) errors.password = 'Vui lòng nhập mật khẩu.'
  else if (values.password.length > 128) errors.password = 'Mật khẩu không được vượt quá 128 ký tự.'
  return errors
}

export function validatePasswordChange(values: PasswordForm): FieldErrors<PasswordForm> {
  const errors: FieldErrors<PasswordForm> = {}
  if (!values.currentPassword) errors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.'
  else if (values.currentPassword.length > 128) errors.currentPassword = 'Mật khẩu không được vượt quá 128 ký tự.'
  if (values.newPassword.length < 8) errors.newPassword = 'Mật khẩu mới phải có ít nhất 8 ký tự.'
  else if (!values.newPassword.trim()) errors.newPassword = 'Mật khẩu không được chỉ gồm khoảng trắng.'
  else if (passwordByteLength(values.newPassword) > 72) errors.newPassword = 'Mật khẩu mới không được vượt quá 72 byte UTF-8.'
  else if (values.newPassword === values.currentPassword) errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại.'
  if (!values.confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.'
  else if (values.confirmPassword !== values.newPassword) errors.confirmPassword = 'Mật khẩu xác nhận chưa trùng khớp.'
  return errors
}
