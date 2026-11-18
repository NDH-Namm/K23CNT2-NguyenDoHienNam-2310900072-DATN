import { LoaderCircle, RefreshCw, WifiOff } from 'lucide-react'
import { Brand } from './Brand'
import { useAuth } from '../contexts/auth-context'

export function SessionGate() {
  const { state, retrySession, logout } = useAuth()
  return <main className="session-gate">
    <Brand />
    {state.status === 'loading' ? <div role="status" className="session-message">
      <LoaderCircle className="spin accent-text" size={30} /><h1>Đang xác thực phiên đăng nhập</h1>
      <p>Chờ một chút, DevMaster đang chuẩn bị không gian làm việc.</p>
    </div> : <div className="session-message">
      <WifiOff size={32} className="muted" /><h1>Chưa thể kết nối đến hệ thống</h1>
      <p>Không thể xác minh phiên đăng nhập. Kiểm tra kết nối và thử lại để tiếp tục.</p>
      <button type="button" className="btn btn-primary" onClick={() => void retrySession()}><RefreshCw size={17} /> Thử lại</button>
      <button type="button" className="text-button" onClick={() => logout(null)}>Về trang đăng nhập</button>
    </div>}
  </main>
}
