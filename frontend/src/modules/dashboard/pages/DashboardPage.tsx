import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Building2, CalendarDays, CircleCheck, Clock3, KeyRound, Layers3, Monitor, Package, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../../contexts/auth-context'
import { ROLE_LABELS } from '../../auth/types/auth.types'
import { PageTitle } from '../../../components/PageTitle'

const modules = [
  { title: 'Tài sản', icon: Package, className: 'teal', description: 'Theo dõi toàn bộ vòng đời tài sản doanh nghiệp.', caption: 'TỔNG TÀI SẢN' },
  { title: 'Thiết bị', icon: Monitor, className: 'blue', description: 'Nắm bắt tình trạng và hiệu quả sử dụng thiết bị.', caption: 'TỔNG THIẾT BỊ' },
  { title: 'Cơ sở vật chất', icon: Building2, className: 'amber', description: 'Quản lý tòa nhà, phòng và không gian làm việc.', caption: 'KHÔNG GIAN QUẢN LÝ' },
]

export function DashboardPage() {
  const { state } = useAuth()
  const [today] = useState(() => new Date())
  if (!state.user) return null
  const date = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(today)
  return <>
    <PageTitle title="Tổng quan" />
    <div className="page-heading"><div><div className="section-kicker">KHÔNG GIAN LÀM VIỆC</div><h1>Tổng quan</h1></div>
      <div className="date-label"><CalendarDays size={16} /><span>{date}</span></div>
    </div>
    <section className="welcome-panel">
      <div><p className="welcome-greeting">Xin chào, {state.user.fullName}</p>
        <h2>Một ngày làm việc<br /><span>ngăn nắp hơn.</span></h2>
        <p>Không gian tập trung để quản lý tài sản, thiết bị<br className="desktop-break" /> và cơ sở vật chất của DevMaster.</p>
        <span className="verified-label"><CircleCheck size={15} /> Tài khoản đã xác thực</span>
      </div>
      <div className="welcome-art" aria-hidden="true"><div className="welcome-art-ring" /><div className="welcome-art-ring ring-inner" />
        <div className="welcome-art-center"><Layers3 size={60} strokeWidth={1.2} /></div>
        <div className="welcome-art-small art-one"><Package size={23} /></div>
        <div className="welcome-art-small art-two"><Monitor size={23} /></div>
        <div className="welcome-art-small art-three"><Building2 size={23} /></div>
      </div>
    </section>
    <div className="section-heading"><h2>Các phân hệ quản lý</h2><span>Đang chuẩn bị đưa vào sử dụng</span></div>
    <section className="module-grid" aria-label="Các phân hệ quản lý">
      {modules.map(({ title, icon: Icon, description, className, caption }) => <article key={title} className="module-card">
        <div className="module-card-top"><span className={`module-icon ${className}`}><Icon size={23} /></span><span className="coming-badge">Sắp có</span></div>
        <h3>{title}</h3><p>{description}</p>
        <div className="module-card-metric"><span>{caption}</span><strong aria-label="Chưa có dữ liệu">—</strong></div>
      </article>)}
    </section>
    <div className="dashboard-lower">
      <section className="panel activity-panel"><div className="panel-heading"><h2>Hoạt động gần đây</h2><Clock3 size={18} /></div>
        <div className="empty-state"><div className="empty-state-icon"><Clock3 size={28} strokeWidth={1.4} /></div>
          <h3>Mọi hoạt động, tại một nơi</h3><p>Lịch sử tài sản và các hoạt động vận hành sẽ xuất hiện tại đây khi các phân hệ được đưa vào sử dụng.</p>
        </div>
      </section>
      <section className="panel account-panel"><div className="panel-heading"><h2>Tài khoản của bạn</h2><ShieldCheck size={18} /></div>
        <dl className="account-details"><div><dt>Mã nhân viên</dt><dd>{state.user.employeeCode}</dd></div>
          <div><dt>Vai trò</dt><dd><span className="role-pill">{ROLE_LABELS[state.user.role]}</span></dd></div>
          <div><dt>Email</dt><dd className="account-email">{state.user.email}</dd></div></dl>
        <Link to="/change-password" className="account-security-link"><KeyRound size={17} /><span>Quản lý mật khẩu</span><ArrowRight size={16} /></Link>
      </section>
    </div>
  </>
}
