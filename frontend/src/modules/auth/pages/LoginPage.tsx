import { Fingerprint, ShieldCheck } from 'lucide-react'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { Alert } from '../../../components/Alert'
import { PageTitle } from '../../../components/PageTitle'
import { useAuth } from '../../../contexts/auth-context'
import { LoginForm } from '../components/LoginForm'

export function LoginPage() {
  const { state } = useAuth()
  return <AuthLayout>
    <PageTitle title="Đăng nhập" />
    <div className="auth-heading-icon"><Fingerprint size={27} strokeWidth={1.6} /></div>
    <div className="section-kicker">CHÀO MỪNG ĐẾN VỚI DEVMaster</div>
    <h2 className="auth-title">Chào mừng trở lại<span className="accent-text">.</span></h2>
    <p className="auth-description">Đăng nhập để bắt đầu ngày làm việc của bạn.</p>
    {state.notice === 'expired' && <Alert>Phiên đăng nhập đã hết hạn hoặc thông tin tài khoản đã thay đổi. Vui lòng đăng nhập lại.</Alert>}
    {state.notice === 'password-changed' && <Alert tone="success">Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.</Alert>}
    {state.notice === 'signed-out' && <Alert tone="info">Bạn đã đăng xuất an toàn khỏi phiên trên tab này.</Alert>}
    <LoginForm />
    <div className="auth-help"><ShieldCheck size={20} aria-hidden="true" /><p>Tài khoản do quản trị viên cấp.<br />Cần hỗ trợ đăng nhập? Hãy liên hệ quản trị viên DevMaster.</p></div>
  </AuthLayout>
}
