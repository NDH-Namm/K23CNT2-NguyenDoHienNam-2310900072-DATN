
import axios, { AxiosHeaders } from 'axios'
import { sessionStore } from './session'

export function createApiClients(baseURL: string, session = sessionStore) {
  const options = {
    baseURL: baseURL.replace(/\/+$/, ''),
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
    withCredentials: false,
  }
  const publicApi = axios.create(options)
  const api = axios.create(options)
  api.interceptors.request.use((config) => {
    const token = session.getToken()
    if (token) config.headers.set('Authorization', `Bearer ${token}`)
    else config.headers.delete('Authorization')
    return config
  })
  api.interceptors.response.use((response) => response, (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const authorization = AxiosHeaders.from(error.config?.headers).get('Authorization')
      const token = typeof authorization === 'string' ? authorization.replace(/^Bearer /, '') : ''
      if (error.response?.status === 401 ||
          (error.response?.status === 409 && error.response.data?.code === 'PASSWORD_CHANGE_CONFLICT')) {
        session.expire(token)
      } else if (error.response?.status === 403 && error.response.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
        session.requirePasswordChange(token)
      }
    }
    return Promise.reject(error)
  })
  return { api, publicApi }
}

const clients = createApiClients(import.meta.env.VITE_API_URL?.trim() || 'http://localhost:5000/api/v1')
export const publicApi = clients.publicApi
export default clients.api
