import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, Building2, ChartNoAxesCombined,
  ClipboardCheck, FolderTree, LayoutDashboard, Monitor, Package, Users, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '../modules/auth/types/auth.types'

export interface NavigationItem {
  title: string; path: string; icon: LucideIcon; ready: boolean; roles?: Role[]
}
export const navigation: { title: string; items: NavigationItem[] }[] = [
  { title: 'Không gian làm việc', items: [
    { title: 'Tổng quan', path: '/dashboard', icon: LayoutDashboard, ready: true },
    { title: 'Tài sản', path: '/assets', icon: Package, ready: false },
    { title: 'Thiết bị', path: '/devices', icon: Monitor, ready: false },
    { title: 'Cơ sở vật chất', path: '/facilities', icon: Building2, ready: false },
  ] },
  { title: 'Vận hành', items: [
    { title: 'Nhập kho', path: '/stock-in', icon: ArrowDownToLine, ready: false },
    { title: 'Xuất kho & bàn giao', path: '/handover', icon: ArrowUpFromLine, ready: false },
    { title: 'Điều chuyển', path: '/transfers', icon: ArrowLeftRight, ready: false },
    { title: 'Bảo trì & sửa chữa', path: '/maintenance', icon: Wrench, ready: false },
    { title: 'Kiểm kê', path: '/inventory', icon: ClipboardCheck, ready: false },
  ] },
  { title: 'Quản trị', items: [
    { title: 'Danh mục', path: '/categories', icon: FolderTree, ready: false },
    { title: 'Báo cáo thống kê', path: '/reports', icon: ChartNoAxesCombined, ready: false },
    // Khớp quyền đọc Users ở Backend. Chưa triển khai giao diện Users trong giai đoạn này.
    { title: 'Người dùng', path: '/users', icon: Users, ready: false, roles: ['admin', 'manager'] },
  ] },
]
