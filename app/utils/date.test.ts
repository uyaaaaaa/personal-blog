import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDate, formatRelativeDate } from './date'

const NOON_UTC = Date.UTC(2025, 5, 15, 12)

describe('formatDate', () => {
  it('ドット区切りのゼロ埋めで返す', () => {
    expect(formatDate('2025-06-15')).toBe('2025.06.15')
    expect(formatDate('2025-01-05')).toBe('2025.01.05')
  })

  it('Date でも文字列と同じ結果になる', () => {
    expect(formatDate(new Date('2025-01-05'))).toBe('2025.01.05')
  })

  it('日付が無いときは空文字を返す', () => {
    expect(formatDate(undefined)).toBe('')
    expect(formatDate(null)).toBe('')
    expect(formatDate('')).toBe('')
  })
})

describe('formatRelativeDate', () => {
  it('日付が無いときと解釈できないときは空文字を返す', () => {
    expect(formatRelativeDate(undefined, NOON_UTC)).toBe('')
    expect(formatRelativeDate(null, NOON_UTC)).toBe('')
    expect(formatRelativeDate('', NOON_UTC)).toBe('')
    expect(formatRelativeDate('去年', NOON_UTC)).toBe('')
  })

  it('now が null の間は年つきの絶対表記を返す', () => {
    expect(formatRelativeDate('2025-06-15', null)).toBe('Jun 15, 2025')
    expect(formatRelativeDate('2024-12-31', null)).toBe('Dec 31, 2024')
  })

  it('当日と未来は today', () => {
    expect(formatRelativeDate('2025-06-15', NOON_UTC)).toBe('today')
    expect(formatRelativeDate('2025-06-16', NOON_UTC)).toBe('today')
  })

  it('6日前までは日数で出す', () => {
    expect(formatRelativeDate('2025-06-14', NOON_UTC)).toBe('1d ago')
    expect(formatRelativeDate('2025-06-09', NOON_UTC)).toBe('6d ago')
  })

  it('7日前からは週数を切り捨てて出す', () => {
    expect(formatRelativeDate('2025-06-08', NOON_UTC)).toBe('1w ago')
    expect(formatRelativeDate('2025-06-02', NOON_UTC)).toBe('1w ago')
    expect(formatRelativeDate('2025-06-01', NOON_UTC)).toBe('2w ago')
    expect(formatRelativeDate('2025-05-17', NOON_UTC)).toBe('4w ago')
  })

  it('30日前からは絶対表記に変わり、同じ年なら年を出さない', () => {
    expect(formatRelativeDate('2025-05-16', NOON_UTC)).toBe('May 16')
  })

  it('絶対表記は年をまたぐときだけ年を出す', () => {
    expect(formatRelativeDate('2024-12-31', NOON_UTC)).toBe('Dec 31, 2024')
  })
})

describe('タイムゾーンをまたぐ', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(['UTC', 'America/Los_Angeles', 'Asia/Tokyo'])('%s でも記事の日付は暦日のまま読む', (timeZone) => {
    vi.stubEnv('TZ', timeZone)

    expect(formatDate('2025-06-15')).toBe('2025.06.15')
    expect(formatRelativeDate('2025-06-15', null)).toBe('Jun 15, 2025')
    expect(formatRelativeDate('2025-06-15', NOON_UTC)).toBe('today')
    expect(formatRelativeDate('2025-06-14', NOON_UTC)).toBe('1d ago')
  })
})
