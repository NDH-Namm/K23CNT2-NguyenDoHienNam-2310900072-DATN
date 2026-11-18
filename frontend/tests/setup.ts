import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import api, { publicApi } from '../src/services/api'
import { sessionStore } from '../src/services/session'

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  sessionStore.setToken(null)
  const blockNetwork = () => { throw new Error('Test phải mock API; không được gọi Backend thật.') }
  api.defaults.adapter = blockNetwork
  publicApi.defaults.adapter = blockNetwork
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(blockNetwork)
  vi.stubGlobal('fetch', vi.fn(blockNetwork))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
