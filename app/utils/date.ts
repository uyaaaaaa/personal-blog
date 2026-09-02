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
const RELATIVE_DATE_MAX_DAYS = 30

const startOfDay = (value: Date): number =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()

const formatShortDate = (target: Date, now: Date | null): string =>
  target.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(now && target.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })

export const formatRelativeDate = (date: string | Date | undefined | null, now: number | null): string => {
  if (!date) return ''

  const target = new Date(date)
  if (Number.isNaN(target.getTime())) return ''
  if (now === null) return formatShortDate(target, null)

  const today = new Date(now)
  const days = Math.round((startOfDay(today) - startOfDay(target)) / DAY_MS)

  if (days >= RELATIVE_DATE_MAX_DAYS) return formatShortDate(target, today)
  if (days <= 0) return 'today'
  if (days < DAYS_IN_WEEK) return `${days}d ago`
  return `${Math.floor(days / DAYS_IN_WEEK)}w ago`
}
