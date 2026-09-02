export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '.')
}

const DAY_MS = 24 * 60 * 60 * 1000
const DAYS_IN_WEEK = 7
const DAYS_IN_MONTH = 30
const DAYS_IN_YEAR = 365

const startOfDay = (value: Date): number =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()

export const formatRelativeDate = (date: string | Date | undefined | null, now: number): string => {
  if (!date) return ''

  const target = new Date(date)
  if (Number.isNaN(target.getTime())) return ''

  const days = Math.round((startOfDay(new Date(now)) - startOfDay(target)) / DAY_MS)

  if (days <= 0) return '今日'
  if (days === 1) return '昨日'
  if (days < DAYS_IN_WEEK) return `${days}日前`
  if (days < DAYS_IN_MONTH) return `${Math.floor(days / DAYS_IN_WEEK)}週間前`
  if (days < DAYS_IN_YEAR) return `${Math.floor(days / DAYS_IN_MONTH)}ヶ月前`
  return `${Math.floor(days / DAYS_IN_YEAR)}年前`
}
