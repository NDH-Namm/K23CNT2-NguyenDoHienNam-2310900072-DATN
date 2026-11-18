import { useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { ChevronRight, KeyRound, LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../contexts/auth-context'
import { ROLE_LABELS } from '../modules/auth/types/auth.types'
import { Brand } from '../components/Brand'
import { navigation } from '../config/navigation'

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { state, logout } = useAuth()
  if (!state.user) return null
  const role = state.user.role
  return <>
    <div className="sidebar-brand"><Brand compact /><span className="workspace-label">KHÔNG GIAN NỘI BỘ</span></div>
    <nav className="sidebar-nav" aria-label="Điều hướng chính">
      {navigation.map((group) => <div key={group.title} className="nav-group">
        <p className="nav-group-label">{group.title}</p>
        {group.items.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
          const Icon = item.icon
          return item.ready ? <NavLink key={item.path} to={item.path} onClick={onNavigate}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
            <Icon size={18} /><span>{item.title}</span><span className="nav-active-dot" />
          </NavLink> : <button key={item.path} className="nav-item nav-item-disabled" type="button" disabled
            title={`${item.title} sẽ được mở trong giai đoạn tiếp theo`}>
            <Icon size={18} /><span>{item.title}</span><span className="nav-soon">Sắp có</span>
          </button>
        })}
      </div>)}
    </nav>
    <div className="sidebar-bottom">
      <Link className="nav-item" to="/change-password" onClick={onNavigate}><KeyRound size={18} /><span>Đổi mật khẩu</span></Link>
      <button className="nav-item logout-button" type="button" onClick={() => { onNavigate?.(); logout() }}><LogOut size={18} /><span>Đăng xuất</span></button>
      <div className="sidebar-footnote"><ShieldCheck size={14} /><span>Hệ thống nội bộ DevMaster</span></div>
    </div>
  </>
}

export function DashboardLayout() {
  const { state } = useAuth()
  const menuRef = useRef<HTMLDialogElement>(null)
  const [year] = useState(() => new Date().getFullYear())
  if (!state.user) return null
  const initials = state.user.fullName.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()
  return <div className="dashboard-layout">
    <a href="#main-content" className="skip-link">Đến nội dung chính</a>
    <aside className="desktop-sidebar"><SidebarContent /></aside>
    <dialog className="mobile-sidebar" ref={menuRef} aria-label="Menu điều hướng">
      <button className="icon-button close-menu" type="button" aria-label="Đóng menu" onClick={() => menuRef.current?.close()}><X size={20} /></button>
      <SidebarContent onNavigate={() => menuRef.current?.close()} />
    </dialog>
    <div className="workspace">
      <header className="workspace-header">
        <div className="header-location">
          <button type="button" className="icon-button open-menu" aria-label="Mở menu" onClick={() => menuRef.current?.showModal()}><Menu size={21} /></button>
          <span className="header-location-parent">Không gian làm việc</span><ChevronRight size={15} className="header-location-parent" />
          <span>Tổng quan</span>
        </div>
        <div className="header-profile"><div className="profile-caption"><strong>{state.user.fullName}</strong><span>{ROLE_LABELS[state.user.role]}</span></div>
          <span className="profile-avatar" aria-hidden="true">{initials}</span>
        </div>
      </header>
      <main id="main-content" className="workspace-content" tabIndex={-1}><Outlet /></main>
      <footer className="workspace-footer"><span>© {year} DevMaster</span><span>Quản lý tốt hơn. Vận hành hiệu quả hơn.</span></footer>
    </div>
  </div>
}
