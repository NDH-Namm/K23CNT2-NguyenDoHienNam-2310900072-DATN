import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, KeyRound, LoaderCircle, LogOut } from 'lucide-react'
import { useAuth } from '../../../contexts/auth-context'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { PasswordField } from '../../../components/PasswordField'
import { Alert } from '../../../components/Alert'
import { PageTitle } from '../../../components/PageTitle'
import { apiErrorMessage, apiFieldErrors } from '../../../services/api-error'
import { passwordByteLength, validatePasswordChange } from '../validation'
import type { FieldErrors, PasswordForm } from '../validation'

export function ChangePasswordPage() {
  const { state, changePassword, logout } = useAuth()
  const [values, setValues] = useState<PasswordForm>({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [errors, setErrors] = useState<FieldErrors<PasswordForm>>({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const required = state.user?.mustChangePassword !== false
  const update = (field: keyof PasswordForm, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return
    const validation = validatePasswordChange(values)
    setErrors(validation)
    setError('')
    if (Object.keys(validation).length) return
    setPending(true)
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
    } catch (failure) {
      setError(apiErrorMessage(failure))
      setErrors(apiFieldErrors(failure, ['currentPassword', 'newPassword']))
    } finally { setPending(false) }
  }
  return <AuthLayout>
    <PageTitle title="Đổi mật khẩu" />
    <div className="auth-heading-icon"><KeyRound size={26} strokeWidth={1.6} /></div>
    <div className="section-kicker">BẢO VỆ TÀI KHOẢN CỦA BẠN</div>
    <h2 className="auth-title">{required ? 'Tạo mật khẩu riêng.' : 'Đổi mật khẩu.'}</h2>
    <p className="auth-description">{required
      ? 'Trước khi bắt đầu, hãy thay mật khẩu được cấp bằng mật khẩu của riêng bạn.'
      : 'Chọn mật khẩu mới để bảo vệ không gian làm việc của bạn.'}</p>
    <form onSubmit={submit} noValidate className="auth-form" aria-busy={pending}>
      {error && <Alert>{error}</Alert>}
      <input className="sr-only" name="username" autoComplete="username" value={state.user?.email || ''} readOnly tabIndex={-1} aria-label="Email tài khoản" />
      <PasswordField id="current-password" label="Mật khẩu hiện tại" name="currentPassword" autoComplete="current-password"
        value={values.currentPassword} error={errors.currentPassword} disabled={pending} placeholder="Nhập mật khẩu hiện tại"
        onChange={(event) => update('currentPassword', event.target.value)} />
      <PasswordField id="new-password" label="Mật khẩu mới" name="newPassword" autoComplete="new-password"
        value={values.newPassword} error={errors.newPassword} disabled={pending} placeholder="Tạo mật khẩu mới"
        onChange={(event) => update('newPassword', event.target.value)} />
      <PasswordField id="confirm-password" label="Xác nhận mật khẩu mới" name="confirmPassword" autoComplete="new-password"
        value={values.confirmPassword} error={errors.confirmPassword} disabled={pending} placeholder="Nhập lại mật khẩu mới"
        onChange={(event) => update('confirmPassword', event.target.value)} />
      <div className="password-rules" aria-label="Yêu cầu mật khẩu">
        <span className={values.newPassword.length >= 8 && values.newPassword.trim() ? 'rule-met' : ''}><Check size={14} /> Ít nhất 8 ký tự, không chỉ gồm khoảng trắng</span>
        <span className={values.newPassword && passwordByteLength(values.newPassword) <= 72 ? 'rule-met' : ''}><Check size={14} /> Tối đa 72 byte UTF-8 (ký tự có dấu dùng nhiều byte)</span>
      </div>
      <button className="btn btn-primary submit-button" disabled={pending} type="submit">
        {pending ? <><LoaderCircle size={18} className="spin" /> Đang cập nhật…</> : <>Cập nhật mật khẩu <ArrowRight size={18} /></>}
      </button>
      <p className="form-note">Sau khi cập nhật, bạn sẽ đăng nhập lại bằng mật khẩu mới.</p>
    </form>
    <div className="auth-bottom-actions">
      {!required && <Link className="text-button" to="/dashboard"><ArrowLeft size={16} /> Về tổng quan</Link>}
      <button className="text-button" type="button" onClick={() => logout()}><LogOut size={16} /> Đăng xuất</button>
    </div>
  </AuthLayout>
}
