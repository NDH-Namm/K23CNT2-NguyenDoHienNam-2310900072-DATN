import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const user = {
  _id: 'abcdef000000000000000001', employeeCode: 'TEST001', fullName: 'Nguyễn Minh An',
  email: 'an@example.invalid', role: 'admin', status: 'active', mustChangePassword: false,
}
const sessionKey = 'devmaster.accessToken'
const password = 'OnlyTestPassword123!'
const runtimeErrors = new WeakMap<Page, string[]>()

async function mockApi(page: Page, mustChangePassword = false) {
  const state = { required: mustChangePassword, version: 0, expired: false }
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname
    const send = (body: unknown, status = 200) => route.fulfill({ status, json: body })
    if (pathname.endsWith('/auth/login')) {
      const body = request.postDataJSON()
      if (body.password === 'WrongPassword123!') return send({ message: 'Email hoặc mật khẩu không chính xác.' }, 401)
      return send({ success: true, data: { accessToken: `mock-token-${state.version}`, user: { ...user, id: user._id, _id: undefined, mustChangePassword: state.required } } })
    }
    if (request.headers().authorization !== `Bearer mock-token-${state.version}` || state.expired) {
      return send({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }, 401)
    }
    if (pathname.endsWith('/auth/me')) return send({ success: true, data: { user: { ...user, mustChangePassword: state.required } } })
    if (pathname.endsWith('/auth/change-password')) {
      expect(Object.keys(request.postDataJSON()).sort()).toEqual(['currentPassword', 'newPassword'])
      state.required = false
      state.version++
      return send({ success: true, message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' })
    }
    return send({ success: false, message: 'API chưa được mock.' }, 404)
  })
  return state
}

async function login(page: Page, value = password) {
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(value)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
}

test.beforeEach(async ({ context, page }) => {
  // Chỉ cho phép frontend thử nghiệm. Không có đường mạng tới Backend/database thật.
  await context.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin === 'http://127.0.0.1:4174') await route.continue()
    else await route.abort()
  })
  const errors: string[] = []
  runtimeErrors.set(page, errors)
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.text().includes(password) || message.text().includes('mock-token-')) {
      errors.push('Console chứa thông tin xác thực kiểm thử.')
    }
  })
})

test.afterEach(({ page }) => { expect(runtimeErrors.get(page) || []).toEqual([]) })

test('đăng nhập, tải lại phiên, responsive và đăng xuất', async ({ page }, testInfo) => {
  await mockApi(page)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /Chào mừng trở lại/ })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true })
  await page.getByRole('button', { name: 'Hiển thị mật khẩu', exact: true }).click()
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveAttribute('type', 'text')
  await login(page, 'WrongPassword123!')
  await expect(page.getByRole('alert')).toContainText('không chính xác')
  await login(page)
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Tổng quan', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tổng quan', exact: true })).toBeVisible()
  await page.goto('/login')
  await expect(page).toHaveURL(/\/dashboard$/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true })
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Mở menu' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await page.getByRole('button', { name: 'Mở menu' }).click()
  }
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).toBeNull()
  await page.goBack()
  await expect(page).toHaveURL(/\/login$/)
})

test('bắt buộc đổi mật khẩu, từ chối Unicode quá dài và bỏ JWT cũ', async ({ page }, testInfo) => {
  await mockApi(page, true)
  await page.goto('/login')
  await login(page)
  await expect(page).toHaveURL(/\/change-password$/)
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/change-password$/)
  await page.screenshot({ path: testInfo.outputPath('change-password.png'), fullPage: true })
  await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(password)
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('á'.repeat(37))
  await page.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill('á'.repeat(37))
  await page.getByRole('button', { name: 'Cập nhật mật khẩu' }).click()
  await expect(page.getByText('Mật khẩu mới không được vượt quá 72 byte UTF-8.', { exact: true })).toBeVisible()
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('NewTestPassword123!')
  await page.getByLabel('Xác nhận mật khẩu mới', { exact: true }).fill('NewTestPassword123!')
  await page.getByRole('button', { name: 'Cập nhật mật khẩu' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('status')).toContainText('Đổi mật khẩu thành công')
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).toBeNull()
  await login(page, 'NewTestPassword123!')
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('token hết hạn được xóa khi khôi phục phiên', async ({ page }) => {
  const state = await mockApi(page)
  await page.goto('/login')
  await login(page)
  await expect(page).toHaveURL(/\/dashboard$/)
  state.expired = true
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('alert')).toContainText('Phiên đăng nhập đã hết hạn')
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).toBeNull()
})
