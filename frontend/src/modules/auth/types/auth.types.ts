export type Role = 'admin' | 'manager' | 'warehouse' | 'employee'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  warehouse: 'Nhân viên kho',
  employee: 'Nhân viên',
}

export interface AuthUser {
  id: string
  employeeCode: string
  fullName: string
  email: string
  role: Role
  mustChangePassword: boolean
}

// Login trả id; /auth/me trả _id của Mongoose. Không dùng trực tiếp hai dạng này trong UI.
export interface ApiUser {
  id?: string
  _id?: string
  employeeCode: string
  fullName: string
  email: string
  role: Role
  status: string
  isDeleted?: boolean
  mustChangePassword?: boolean
}

export interface LoginCredentials { email: string; password: string }
export interface ChangePasswordPayload { currentPassword: string; newPassword: string }
export interface ApiResponse<T> { success: boolean; message: string; data: T }
export type AuthNotice = 'expired' | 'signed-out' | 'password-changed' | null
export type AuthState =
  | { status: 'loading'; user: null; notice: AuthNotice }
  | { status: 'unavailable'; user: null; notice: AuthNotice }
  | { status: 'anonymous'; user: null; notice: AuthNotice }
  | { status: 'authenticated'; user: AuthUser; notice: null }

export function normalizeUser(user: ApiUser): AuthUser {
  const id = user?.id || user?._id
  if (!id || typeof user.fullName !== 'string' || typeof user.email !== 'string' ||
      !Object.hasOwn(ROLE_LABELS, user.role) || user.status !== 'active' || user.isDeleted) {
    throw new Error('Thông tin tài khoản không hợp lệ. Vui lòng đăng nhập lại.')
  }
  return {
    id, employeeCode: user.employeeCode, fullName: user.fullName, email: user.email,
    role: user.role, mustChangePassword: user.mustChangePassword !== false,
  }
}
