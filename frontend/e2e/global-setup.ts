import { createServer } from 'vite'

export default async function globalSetup() {
  // API luôn trỏ về server thử nghiệm và được intercept, không tới Backend thật.
  const previous = process.env.VITE_API_URL
  process.env.VITE_API_URL = '/api/v1'
  const server = await createServer({ server: { host: '127.0.0.1', port: 4174, strictPort: true } })
  await server.listen()
  // Đóng bằng API của Vite, tránh tiến trình npm con bị giữ lại trên Windows.
  return async () => {
    await server.close()
    if (previous === undefined) delete process.env.VITE_API_URL
    else process.env.VITE_API_URL = previous
  }
}
