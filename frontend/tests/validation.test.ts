import { describe, expect, it } from 'vitest'
import { passwordByteLength, validateLogin, validatePasswordChange } from '../src/modules/auth/validation'
import { normalizeUser } from '../src/modules/auth/types/auth.types'
import { fixture } from './helpers'

describe('Validation khớp Backend', () => {
  it('email sai hoặc trường trống bị chặn bằng thông báo tiếng Việt', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({ email: 'Vui lòng nhập email của bạn.', password: 'Vui lòng nhập mật khẩu.' })
    expect(validateLogin({ email: 'khong-phai-email', password: '123' }).email).toBeTruthy()
  })
  it('đăng nhập chấp nhận mật khẩu cũ ngắn hoặc trên 72 byte, không trim mật khẩu', () => {
    expect(validateLogin({ email: ' AN@example.invalid ', password: ' á'.repeat(50) })).toEqual({})
    expect(validateLogin({ email: fixture.email, password: 'x' })).toEqual({})
    expect(validateLogin({ email: fixture.email, password: 'x'.repeat(129) }).password).toBeTruthy()
  })
  it.each(['a'.repeat(72), 'á'.repeat(36), '😀'.repeat(18)])('mật khẩu mới đúng biên 72 byte được chấp nhận (%#)', (newPassword) => {
    expect(passwordByteLength(newPassword)).toBe(72)
    expect(validatePasswordChange({ currentPassword: 'OldPassword123!', newPassword, confirmPassword: newPassword })).toEqual({})
  })
  it.each(['a'.repeat(73), 'á'.repeat(37), '😀'.repeat(19)])('mật khẩu mới vượt 72 byte bị chặn (%#)', (newPassword) => {
    expect(validatePasswordChange({ currentPassword: 'OldPassword123!', newPassword, confirmPassword: newPassword }).newPassword).toMatch(/72 byte/)
  })
  it('chặn mật khẩu trắng, ngắn, trùng cũ và xác nhận không khớp', () => {
    for (const newPassword of ['        ', 'abc', 'OldPassword123!']) {
      expect(validatePasswordChange({ currentPassword: 'OldPassword123!', newPassword, confirmPassword: newPassword }).newPassword).toBeTruthy()
    }
    expect(validatePasswordChange({ currentPassword: '', newPassword: 'NewPassword123!', confirmPassword: 'different' })).toHaveProperty('confirmPassword')
  })
})

describe('Chuẩn hóa tài khoản', () => {
  it('đọc đúng id của login và _id của /me', () => {
    expect(normalizeUser(fixture).id).toBe(fixture._id)
    expect(normalizeUser({ ...fixture, id: fixture._id, _id: undefined })).toEqual(normalizeUser(fixture))
  })
  it('thiếu cờ mustChangePassword vẫn bắt buộc đổi mật khẩu', () => {
    expect(normalizeUser({ ...fixture, mustChangePassword: undefined }).mustChangePassword).toBe(true)
  })
  it('không dùng tài khoản không hoạt động hoặc đã xóa', () => {
    expect(() => normalizeUser({ ...fixture, status: 'locked' })).toThrow()
    expect(() => normalizeUser({ ...fixture, isDeleted: true })).toThrow()
  })
})
