export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand">
    <svg className="brand-mark" width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="currentColor" fillOpacity=".12" />
      <path d="M10 11h8l7 9-7 9h-8l7-9-7-9Z" fill="currentColor" />
      <path d="m22 11 8 9-8 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <div><span className="brand-name">Dev<span>Master</span></span>
      {!compact && <span className="brand-caption">QUẢN LÝ TÀI SẢN DOANH NGHIỆP</span>}
    </div>
  </div>
}
