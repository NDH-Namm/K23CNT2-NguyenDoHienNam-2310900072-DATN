import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { createSessionStore, SESSION_KEY } from '../src/services/session'
import { createApiClients } from '../src/services/api'
import { apiErrorMessage } from '../src/services/api-error'
import { response } from './helpers'

describe('Lưu phiên', () => {
  it('khôi phục token từ sessionStorage, không lưu vào localStorage', () => {
    sessionStorage.setItem(SESSION_KEY, 'old-token')
    const store = createSessionStore()
    expect(store.getToken()).toBe('old-token')
    store.setToken('new-token')
    expect(sessionStorage.getItem(SESSION_KEY)).toBe('new-token')
    expect(localStorage.length).toBe(0)
    store.setToken(null)
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })
  it('storage bị chặn vẫn dùng được phiên trong bộ nhớ', () => {
    const store = createSessionStore(() => { throw new Error('SecurityError') })
    expect(store.getToken()).toBeNull()
    store.setToken('memory-token')
    expect(store.getToken()).toBe('memory-token')
    store.setToken(null)
    expect(store.getToken()).toBeNull()
  })
})

describe('Axios và lỗi phiên', () => {
  it('chỉ client xác thực đính kèm Bearer; login không mang token cũ', async () => {
    const store = createSessionStore()
    store.setToken('private-token')
    const { api, publicApi } = createApiClients('/api/v1/', store)
    api.defaults.adapter = async (config) => {
      expect(config.headers.get('Authorization')).toBe('Bearer private-token')
      return response(config, {})
    }
    publicApi.defaults.adapter = async (config) => {
      expect(config.headers.has('Authorization')).toBe(false)
      return response(config, {})
    }
    await api.get('/auth/me')
    await publicApi.post('/auth/login', {})
  })
  it('401 của API xác thực xóa phiên và phát sự kiện đúng một lần', async () => {
    const store = createSessionStore()
    store.setToken('private-token')
    const listener = vi.fn()
    store.subscribe(listener)
    const { api } = createApiClients('/api/v1', store)
    api.defaults.adapter = async (config) => response(config, {}, 401)
    await expect(api.get('/auth/me')).rejects.toThrow()
    expect(store.getToken()).toBeNull()
    expect(listener).toHaveBeenCalledExactlyOnceWith('expired')
  })
  it('401 đến muộn của token cũ không đăng xuất phiên mới', async () => {
    const store = createSessionStore()
    store.setToken('old-token')
    const { api } = createApiClients('/api/v1', store)
    api.defaults.adapter = async (config) => { store.setToken('new-token'); return response(config, {}, 401) }
    await expect(api.get('/auth/me')).rejects.toThrow()
    expect(store.getToken()).toBe('new-token')
  })
  it('401 khi đăng nhập sai không phát sự kiện hết phiên', async () => {
    const store = createSessionStore()
    store.setToken('existing-token')
    const listener = vi.fn()
    store.subscribe(listener)
    const { publicApi } = createApiClients('/api/v1', store)
    publicApi.defaults.adapter = async (config) => response(config, {}, 401)
    await expect(publicApi.post('/auth/login')).rejects.toThrow()
    expect(listener).not.toHaveBeenCalled()
    expect(store.getToken()).toBe('existing-token')
  })
  it('403 PASSWORD_CHANGE_REQUIRED chuyển luồng nhưng không xóa token', async () => {
    const store = createSessionStore()
    store.setToken('private-token')
    const listener = vi.fn()
    store.subscribe(listener)
    const { api } = createApiClients('/api/v1', store)
    api.defaults.adapter = async (config) => response(config, { code: 'PASSWORD_CHANGE_REQUIRED' }, 403)
    await expect(api.get('/users')).rejects.toThrow()
    expect(listener).toHaveBeenCalledExactlyOnceWith('password-required')
    expect(store.getToken()).toBe('private-token')
  })
  it('403 phân quyền thông thường và lỗi mạng không xóa phiên', async () => {
    const store = createSessionStore()
    store.setToken('private-token')
    const listener = vi.fn()
    store.subscribe(listener)
    const { api } = createApiClients('/api/v1', store)
    api.defaults.adapter = async (config) => response(config, {}, 403)
    await expect(api.get('/users')).rejects.toThrow()
    api.defaults.adapter = async () => { throw new AxiosError('Network error', 'ERR_NETWORK') }
    await expect(api.get('/auth/me')).rejects.toThrow()
    expect(store.getToken()).toBe('private-token')
    expect(listener).not.toHaveBeenCalled()
  })
  it('xung đột đổi mật khẩu yêu cầu đăng nhập lại', async () => {
    const store = createSessionStore()
    store.setToken('private-token')
    const { api } = createApiClients('/api/v1', store)
    api.defaults.adapter = async (config) => response(config, { code: 'PASSWORD_CHANGE_CONFLICT' }, 409)
    await expect(api.patch('/auth/change-password')).rejects.toThrow()
    expect(store.getToken()).toBeNull()
  })
  it('lỗi kỹ thuật không đưa thông tin thô ra thông báo giao diện', () => {
    const config = { headers: new AxiosHeaders() }
    const error = new AxiosError('raw-secret', 'ERR_BAD_RESPONSE', config, undefined,
      { status: 500, data: { message: 'raw-secret' }, statusText: '', headers: {}, config })
    expect(apiErrorMessage(error)).not.toContain('raw-secret')
    expect(apiErrorMessage(new AxiosError('network-secret'))).toMatch(/kết nối/)
  })
})
