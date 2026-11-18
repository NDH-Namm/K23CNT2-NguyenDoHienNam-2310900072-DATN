export const SESSION_KEY = 'devmaster.accessToken'
type SessionEvent = 'expired' | 'password-required'
type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function createSessionStore(getStorage: () => TokenStorage = () => window.sessionStorage) {
  let token: string | null = null
  let initialized = false
  const listeners = new Set<(event: SessionEvent) => void>()

  const getToken = () => {
    if (!initialized) {
      initialized = true
      try { token = getStorage().getItem(SESSION_KEY) || null } catch { /* Chỉ lưu trong RAM nếu storage bị chặn. */ }
    }
    return token
  }
  const setToken = (value: string | null) => {
    initialized = true
    token = value
    try {
      if (value) getStorage().setItem(SESSION_KEY, value)
      else getStorage().removeItem(SESSION_KEY)
    } catch { /* Không đưa token hoặc lỗi storage vào console. */ }
  }
  return {
    getToken, setToken,
    subscribe(listener: (event: SessionEvent) => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    expire(expectedToken: string) {
      // Phản hồi 401 trễ của phiên cũ không được xóa một phiên mới.
      if (!expectedToken || getToken() !== expectedToken) return
      setToken(null)
      listeners.forEach((listener) => listener('expired'))
    },
    requirePasswordChange(expectedToken: string) {
      if (!expectedToken || getToken() !== expectedToken) return
      listeners.forEach((listener) => listener('password-required'))
    },
  }
}

export const sessionStore = createSessionStore()
