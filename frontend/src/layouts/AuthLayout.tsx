import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight, Building2, Layers3, Monitor, Package, ShieldCheck } from 'lucide-react'
import { Brand } from '../components/Brand'

export function AuthLayout({ children }: { children: ReactNode }) {
  const [year] = useState(() => new Date().getFullYear())
  return <div className="auth-layout">
    <aside className="auth-story">
      <Brand />
      <div className="story-content">
        <div className="eyebrow"><span className="accent-line" /> KHÔNG GIAN LÀM VIỆC SỐ</div>
        <h1>Mọi tài sản.<br /><span>Một điểm quản lý.</span></h1>
        <p className="story-description">Kết nối con người, tài sản và không gian.<br className="desktop-break" /> Cùng DevMaster vận hành hiệu quả mỗi ngày.</p>
        <div className="asset-scene" aria-hidden="true">
          <div className="scene-orbit orbit-one" /><div className="scene-orbit orbit-two" />
          <div className="scene-floor floor-back" /><div className="scene-floor floor-front" />
          <div className="scene-building"><Building2 strokeWidth={1} size={104} />
            <span>DEVMASTER</span></div>
          <div className="scene-node node-assets"><Package size={22} /><span>Tài sản</span></div>
          <div className="scene-node node-devices"><Monitor size={22} /><span>Thiết bị</span></div>
          <div className="scene-node node-spaces"><Layers3 size={22} /><span>Không gian</span></div>
          <div className="scene-caption"><span className="status-dot" /> KẾT NỐI ĐỂ VẬN HÀNH TỐT HƠN <ArrowUpRight size={14} /></div>
        </div>
      </div>
      <div className="story-footer"><ShieldCheck size={17} /><span>Dành riêng cho đội ngũ DevMaster</span></div>
    </aside>
    <section className="auth-main" aria-label="Xác thực tài khoản">
      <div className="auth-topline"><span>CỔNG QUẢN TRỊ NỘI BỘ</span><span className="auth-version">DEVMaster / 01</span></div>
      <main className="auth-content">{children}</main>
      <footer className="auth-footer">© {year} DevMaster.<span>Đồng hành cùng doanh nghiệp.</span></footer>
    </section>
  </div>
}
