import axios from 'axios'

export function apiErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.'
  if (!error.response) return 'Không thể kết nối đến hệ thống. Vui lòng kiểm tra kết nối và thử lại.'
  if (error.response.status === 429) return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ một lát rồi thử lại.'
  if (error.response.status >= 500) return 'Hệ thống tạm thời không khả dụng. Vui lòng thử lại sau.'
  const message: unknown = error.response.data?.message
  return typeof message === 'string' && message.length <= 300
    ? message : 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.'
}

export function apiFieldErrors<T extends string>(error: unknown, allowedFields: readonly T[]): Partial<Record<T, string>> {
  const result: Partial<Record<T, string>> = {}
  if (!axios.isAxiosError(error) || error.response?.status !== 400) return result
  const issues: unknown = error.response.data?.errors
  if (!Array.isArray(issues)) return result
  for (const issue of issues) {
    if (issue && allowedFields.includes(issue.field) && typeof issue.message === 'string' && issue.message.length <= 300) {
      result[issue.field as T] = issue.message
    }
  }
  return result
}
