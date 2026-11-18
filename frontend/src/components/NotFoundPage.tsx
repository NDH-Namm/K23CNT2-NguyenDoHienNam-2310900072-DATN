import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageTitle } from './PageTitle'

export function NotFoundPage() {
  return <div className="not-found"><PageTitle title="Không tìm thấy trang" /><span className="section-kicker">404 / DEVMaster</span>
    <h1>Trang này chưa khả dụng</h1><p>Đường dẫn không tồn tại hoặc phân hệ đang được chuẩn bị.</p>
    <Link className="btn btn-primary" to="/dashboard"><ArrowLeft size={17} /> Về tổng quan</Link>
  </div>
}
