import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> & {
  id: string; label: string; error?: string; hint?: string
}
export function PasswordField({ id, label, error, hint, ...props }: Props) {
  const [visible, setVisible] = useState(false)
  return <div className="form-field">
    <label htmlFor={id}>{label}</label>
    <div className={`input-wrap ${error ? 'input-invalid' : ''}`}>
      <LockKeyhole className="input-icon" size={18} aria-hidden="true" />
      <input {...props} id={id} type={visible ? 'text' : 'password'} className="password-input"
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />
      <button type="button" className="password-toggle" onClick={() => setVisible(!visible)}
        aria-label={`${visible ? 'Ẩn' : 'Hiển thị'} ${label.toLowerCase()}`} aria-pressed={visible}>
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
    {error ? <p id={`${id}-error`} className="field-error">{error}</p>
      : hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
  </div>
}
