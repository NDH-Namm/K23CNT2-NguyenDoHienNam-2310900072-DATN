import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bell, Building2, CalendarDays, ChartNoAxesCombined, ChartPie, CircleCheck, Clock3, KeyRound, Layers3, Monitor, Package, ShieldCheck, Wrench } from 'lucide-react'
import { useAuth } from '../../../contexts/auth-context'
import { ROLE_LABELS } from '../../auth/types/auth.types'
import { PageTitle } from '../../../components/PageTitle'
import { EmptyState } from '../../../components/EmptyState'

const modules = [
  { title: 'Tổng tài sản', icon: Package, tone: 'primary' },
  { title: 'Tổng thiết bị', icon: Monitor, tone: 'primary' },
  { title: 'Cơ sở vật chất', icon: Building2, tone: 'secondary' },
  { title: 'Bảo trì', icon: Wrench, tone: 'accent' },
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
    <div className="section-heading"><h2>Tài sản & vận hành</h2><span>Tổng hợp tình hình quản lý doanh nghiệp</span></div>
    <section className="module-grid" aria-label="Chỉ số tổng quan">
      {modules.map(({ title, icon: Icon, tone }) => <article key={title} className={`module-card kpi-card kpi-${tone}`}>
        <div className="module-card-top"><h3>{title}</h3><span className={`module-icon tone-${tone}`}><Icon size={21} /></span></div>
        <strong className="kpi-value" aria-label="Chưa có số liệu">—</strong>
        <p className="kpi-caption">Chưa có dữ liệu</p>
      </article>)}
    </section>
    <div className="chart-grid">
      <section className="panel chart-panel" aria-label="Biểu đồ tình trạng tài sản">
        <div className="panel-heading"><div><h2>Tình trạng tài sản</h2><p>Phân bố theo trạng thái sử dụng</p></div><ChartPie size={19} /></div>
        <EmptyState icon={ChartPie} description="Biểu đồ sẽ hiển thị khi có dữ liệu tình trạng tài sản." />
      </section>
      <section className="panel chart-panel" aria-label="Biểu đồ biến động tài sản">
        <div className="panel-heading"><div><h2>Biến động tài sản</h2><p>Theo dõi thay đổi theo thời gian</p></div><ChartNoAxesCombined size={19} /></div>
        <EmptyState icon={ChartNoAxesCombined} description="Chưa có dữ liệu theo thời gian để hiển thị biểu đồ." />
      </section>
    </div>
    <div className="dashboard-lower">
      <section className="panel activity-panel"><div className="panel-heading"><h2>Hoạt động gần đây</h2><Clock3 size={18} /></div>
        <EmptyState icon={Clock3} description="Lịch sử hoạt động sẽ xuất hiện tại đây khi có dữ liệu vận hành." />
      </section>
      <section className="panel reminders-panel"><div className="panel-heading"><h2>Nhắc việc</h2><Bell size={18} /></div>
        <EmptyState icon={Bell} description="Chưa có dữ liệu về lịch bảo trì, bảo hành và các công việc cần xử lý." />
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
