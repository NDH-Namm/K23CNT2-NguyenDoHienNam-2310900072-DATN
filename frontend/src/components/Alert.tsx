import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'

export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' | 'info' }) {
  const Icon = tone === 'success' ? CircleCheck : CircleAlert
  return <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <Icon size={18} aria-hidden="true" /><div>{children}</div>
  </div>
}
