import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, LoaderCircle, Mail } from 'lucide-react'
import { useAuth } from '../../../contexts/auth-context'
import { Alert } from '../../../components/Alert'
import { PasswordField } from '../../../components/PasswordField'
import { apiErrorMessage, apiFieldErrors } from '../../../services/api-error'
import { validateLogin } from '../validation'
import type { LoginCredentials } from '../types/auth.types'
import type { FieldErrors } from '../validation'

export function LoginForm() {
  const { login } = useAuth()
  const [values, setValues] = useState<LoginCredentials>({ email: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors<LoginCredentials>>({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const update = (field: keyof LoginCredentials, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const validation = validateLogin(values)
    setErrors(validation)
    setError('')
    if (Object.keys(validation).length) return
    setPending(true)
    try { await login(values) } catch (failure) {
      setError(apiErrorMessage(failure))
      setErrors(apiFieldErrors(failure, ['email', 'password']))
    } finally { setPending(false) }
  }
  return <form onSubmit={submit} noValidate className="auth-form" aria-busy={pending}>
    {error && <Alert>{error}</Alert>}
    <div className="form-field">
      <label htmlFor="login-email">Email</label>
      <div className={`input-wrap ${errors.email ? 'input-invalid' : ''}`}>
        <Mail className="input-icon" size={18} aria-hidden="true" />
        <input id="login-email" name="email" type="email" autoComplete="username" autoCapitalize="none"
          spellCheck={false} placeholder="ban@devmaster.vn" value={values.email} disabled={pending}
          aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined}
          onChange={(event) => update('email', event.target.value)} />
      </div>
      {errors.email && <p className="field-error" id="email-error">{errors.email}</p>}
    </div>
    <PasswordField id="login-password" name="password" label="Mật khẩu" placeholder="Nhập mật khẩu của bạn"
      autoComplete="current-password" value={values.password} disabled={pending} error={errors.password}
      onChange={(event) => update('password', event.target.value)} />
    <button type="submit" className="btn btn-primary submit-button" disabled={pending}>
      {pending ? <><LoaderCircle className="spin" size={19} aria-hidden="true" /> Đang đăng nhập…</>
        : <>Đăng nhập <ArrowRight size={19} aria-hidden="true" /></>}
    </button>
  </form>
}
