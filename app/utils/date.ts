export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '.')
}

// zenn.dev-style relative date: "n分前" / "n時間前" / "n日前", falls back to
// "YYYY/MM/DD" beyond 30 days
export const formatRelativeDate = (date: string | Date | undefined | null): string => {
  if (!date) return ''
  const target = new Date(date)
  const diffMs = Date.now() - target.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'たった今'
  if (diffMinutes < 60) return `${diffMinutes}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays <= 30) return `${diffDays}日前`

  return target.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
