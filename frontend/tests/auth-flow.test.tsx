import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../src/contexts/AuthContext'
import { useAuth } from '../src/contexts/auth-context'
import { AppRoutes } from '../src/routes/AppRoutes'
import api, { publicApi } from '../src/services/api'
import { SESSION_KEY, sessionStore } from '../src/services/session'
import { ROLE_LABELS } from '../src/modules/auth/types/auth.types'
import type { Role } from '../src/modules/auth/types/auth.types'
import { fixture, loginResponse, meResponse, response, TEST_TOKEN } from './helpers'

const renderApp = (path = '/dashboard') => render(<StrictMode><MemoryRouter initialEntries={[path]}>
  <AuthProvider><AppRoutes /></AuthProvider>
</MemoryRouter></StrictMode>)

async function fillLogin() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Email', { exact: true }), 'AN@example.invalid')
  await user.type(screen.getByLabelText('Mật khẩu', { exact: true }), 'OldPassword123!')
  return user
}

describe('Luồng Authentication qua React và Axios mock', () => {
  it('Dashboard chuyển khách chưa đăng nhập đến Login; không có đăng ký công khai', async () => {
    renderApp()
    expect(await screen.findByRole('heading', { name: /Chào mừng trở lại/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /đăng ký/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tổng quan' })).not.toBeInTheDocument()
  })

  it('validation hiển thị bằng tiếng Việt và nút ẩn/hiện mật khẩu hoạt động', async () => {
    const user = userEvent.setup()
    const send = vi.fn(async () => { throw new Error('Không được gửi form sai') })
    publicApi.defaults.adapter = send
    renderApp('/login')
    await user.click(await screen.findByRole('button', { name: 'Đăng nhập' }))
    expect(screen.getByText('Vui lòng nhập email của bạn.')).toBeInTheDocument()
    expect(screen.getByText('Vui lòng nhập mật khẩu.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hiển thị mật khẩu' }))
    expect(screen.getByLabelText('Mật khẩu', { exact: true })).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }))
    expect(screen.getByLabelText('Mật khẩu', { exact: true })).toHaveAttribute('type', 'password')
    expect(send).not.toHaveBeenCalled()
  })

  it('đăng nhập sai hiển thị lỗi Backend, không tạo phiên', async () => {
    publicApi.defaults.adapter = async (config) => response(config, { message: 'Email hoặc mật khẩu không chính xác.' }, 401)
    renderApp('/login')
    const user = await fillLogin()
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email hoặc mật khẩu không chính xác.')
    expect(sessionStore.getToken()).toBeNull()
  })

  it('hiển thị loading và ngăn gửi lặp trong lúc đăng nhập', async () => {
    let finish!: () => void
    const send = vi.fn(async (config: InternalAxiosRequestConfig) => {
      await new Promise<void>((resolve) => { finish = resolve })
      return response(config, { message: 'Hệ thống bận.' }, 503)
    })
    publicApi.defaults.adapter = send
    renderApp('/login')
    const user = await fillLogin()
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    const pending = await screen.findByRole('button', { name: /Đang đăng nhập/ })
    expect(pending).toBeDisabled()
    await user.click(pending)
    expect(send).toHaveBeenCalledTimes(1)
    await act(async () => { finish() })
    expect(await screen.findByRole('alert')).toHaveTextContent('tạm thời không khả dụng')
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled()
  })

  it('login gửi đúng payload, lấy /me mới nhất, lưu phiên và đăng xuất', async () => {
    const login = vi.fn(async (config: InternalAxiosRequestConfig) => {
      expect(JSON.parse(config.data)).toEqual({ email: fixture.email, password: 'OldPassword123!' })
      expect(config.headers.has('Authorization')).toBe(false)
      return response(config, loginResponse())
    })
    publicApi.defaults.adapter = login
    api.defaults.adapter = async (config) => {
      expect(config.url).toBe('/auth/me')
      expect(config.headers.get('Authorization')).toBe(`Bearer ${TEST_TOKEN}`)
      return response(config, meResponse({ ...fixture, role: 'manager' }))
    }
    renderApp('/login')
    const user = await fillLogin()
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument()
    expect(screen.getAllByText('Quản lý').length).toBeGreaterThan(0)
    expect(sessionStorage.getItem(SESSION_KEY)).toBe(TEST_TOKEN)
    expect(localStorage.length).toBe(0)
    await user.click(screen.getAllByRole('button', { name: 'Đăng xuất' })[0])
    expect(await screen.findByRole('heading', { name: /Chào mừng trở lại/ })).toBeInTheDocument()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it.each<Role>(['admin', 'manager', 'warehouse', 'employee'])('khôi phục phiên %s; vào Login tự chuyển Dashboard và hiện đúng quyền điều hướng', async (role) => {
    sessionStore.setToken(TEST_TOKEN)
    api.defaults.adapter = async (config) => response(config, meResponse({ ...fixture, role }))
    renderApp('/login')
    expect(await screen.findByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument()
    expect(screen.getAllByText(ROLE_LABELS[role]).length).toBeGreaterThan(0)
    const usersNav = screen.queryAllByRole('button', { name: /Người dùng/ })
    expect(usersNav.length > 0).toBe(role === 'admin' || role === 'manager')
    usersNav.forEach((item) => expect(item).toBeDisabled())
  })

  it('401 khi khôi phục phiên xóa token và thông báo đăng nhập lại', async () => {
    sessionStore.setToken(TEST_TOKEN)
    api.defaults.adapter = async (config) => response(config, {}, 401)
    renderApp()
    expect(await screen.findByRole('alert')).toHaveTextContent('Phiên đăng nhập đã hết hạn')
    expect(sessionStore.getToken()).toBeNull()
  })

  it('lỗi mạng không mở Dashboard; thử lại khôi phục được phiên', async () => {
    sessionStore.setToken(TEST_TOKEN)
    api.defaults.adapter = async () => { throw new AxiosError('offline', 'ERR_NETWORK') }
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Chưa thể kết nối đến hệ thống' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tổng quan' })).not.toBeInTheDocument()
    expect(sessionStore.getToken()).toBe(TEST_TOKEN)
    api.defaults.adapter = async (config) => response(config, meResponse())
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument()
  })

  it('mustChangePassword chặn Dashboard; đổi mật khẩu chỉ gửi hai trường và bỏ JWT cũ', async () => {
    sessionStore.setToken(TEST_TOKEN)
    const patch = vi.fn()
    api.defaults.adapter = async (config) => {
      if (config.method === 'patch') {
        patch(JSON.parse(config.data))
        return response(config, { success: true, message: 'Đổi mật khẩu thành công.' })
      }
      return response(config, meResponse({ ...fixture, mustChangePassword: true }))
    }
    renderApp()
    const user = userEvent.setup()
    expect(await screen.findByRole('heading', { name: 'Tạo mật khẩu riêng.' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Về tổng quan/ })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Mật khẩu hiện tại', { exact: true }), 'OldPassword123!')
    await user.type(screen.getByLabelText('Mật khẩu mới', { exact: true }), 'NewPassword123!')
    await user.type(screen.getByLabelText('Xác nhận mật khẩu mới', { exact: true }), 'Mismatch123!')
    await user.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }))
    expect(screen.getByText('Mật khẩu xác nhận chưa trùng khớp.')).toBeInTheDocument()
    expect(patch).not.toHaveBeenCalled()
    await user.clear(screen.getByLabelText('Xác nhận mật khẩu mới', { exact: true }))
    await user.type(screen.getByLabelText('Xác nhận mật khẩu mới', { exact: true }), 'NewPassword123!')
    await user.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }))
    expect(await screen.findByText(/Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới./)).toBeInTheDocument()
    expect(patch).toHaveBeenCalledExactlyOnceWith({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' })
    expect(sessionStore.getToken()).toBeNull()
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('đổi mật khẩu thất bại không thông báo thành công hoặc xóa phiên', async () => {
    sessionStore.setToken(TEST_TOKEN)
    api.defaults.adapter = async (config) => config.method === 'patch'
      ? response(config, { message: 'Mật khẩu hiện tại không chính xác.' }, 400)
      : response(config, meResponse())
    renderApp('/change-password')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Mật khẩu hiện tại', { exact: true }), 'WrongPassword123!')
    await user.type(screen.getByLabelText('Mật khẩu mới', { exact: true }), 'NewPassword123!')
    await user.type(screen.getByLabelText('Xác nhận mật khẩu mới', { exact: true }), 'NewPassword123!')
    await user.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Mật khẩu hiện tại không chính xác.')
    expect(sessionStore.getToken()).toBe(TEST_TOKEN)
    expect(screen.getByRole('heading', { name: 'Đổi mật khẩu.' })).toBeInTheDocument()
  })

  it('kết quả /me đến sau logout không khôi phục lại tài khoản', async () => {
    sessionStore.setToken(TEST_TOKEN)
    let finish!: () => void
    api.defaults.adapter = (config) => new Promise<AxiosResponse>((resolve) => {
      finish = () => resolve(response(config, meResponse()))
    })
    function Probe() {
      const { state, logout } = useAuth()
      return <><p data-testid="auth-state">{state.status}</p><button onClick={() => logout()}>Thoát</button></>
    }
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    fireEvent.click(screen.getByRole('button', { name: 'Thoát' }))
    await act(async () => { finish() })
    expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous')
    expect(sessionStore.getToken()).toBeNull()
  })
})
