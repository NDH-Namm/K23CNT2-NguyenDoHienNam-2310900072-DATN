import type { LucideIcon } from 'lucide-react'

export function EmptyState({ icon: Icon, description }: { icon: LucideIcon; description: string }) {
  return <div className="empty-state">
    <div className="empty-state-icon"><Icon size={27} strokeWidth={1.5} aria-hidden="true" /></div>
    <h3>Chưa có dữ liệu</h3><p>{description}</p>
  </div>
}
