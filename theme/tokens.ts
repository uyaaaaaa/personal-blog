export const colors = {
  bg: '#F9F9F9',
  main: '#1A1A1A',
  sub: '#888888',
  accent: '#8B5CF6',
  'accent-hover': '#7C3AED',
  'accent-contrast': '#FFFFFF',
  border: '#E5E5E5',
  surface: '#FFFFFF',
  'surface-subtle': '#F5F5F5',
  'surface-muted': '#F3F4F6',
  'header-bg': 'rgba(255, 255, 255, 0.9)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  scrollbar: '#D1D5DB',
  'code-text': '#24292E',
  // github-lightがdiffのトークンに持つ背景色
  'diff-add-bg': '#F0FFF4',
  'diff-remove-bg': '#FFEEF0',
  // GitHubのdiff表示で変化した語に敷く背景色
  'diff-add-word-bg': '#ABF2BC',
  'diff-remove-word-bg': '#FFC1C2',
} as const

export const darkColors: Record<keyof typeof colors, string> = {
  bg: '#121212',
  main: '#E8E8E8',
  sub: '#A0A0A0',
  accent: '#A78BFA',
  'accent-hover': '#C4B5FD',
  'accent-contrast': '#121212',
  border: '#2E2E2E',
  surface: '#1A1A1A',
  'surface-subtle': '#1E1E1E',
  'surface-muted': '#262626',
  'header-bg': 'rgba(18, 18, 18, 0.85)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  scrollbar: '#3A3A3A',
  // github-darkの前景色
  'code-text': '#E6EDF3',
  // GitHubのdiff表示の行背景（github-darkのトークン背景は帯が強すぎる）
  'diff-add-bg': 'rgba(46, 160, 67, 0.15)',
  'diff-remove-bg': 'rgba(248, 81, 73, 0.15)',
  'diff-add-word-bg': 'rgba(46, 160, 67, 0.4)',
  'diff-remove-word-bg': 'rgba(248, 81, 73, 0.4)',
}

export const fontFamily = {
  sans: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ],
  mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
} as const

const isHex = (value: string) => value.startsWith('#')

function hexToRgbChannels(hex: string): string {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')
}

function toColorVariables(palette: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(palette).flatMap(([name, value]) => [
      [`--color-${name}`, value],
      ...(isHex(value) ? [[`--color-${name}-rgb`, hexToRgbChannels(value)]] : []),
    ]),
  )
}

export function toCssVariables(): Record<string, string> {
  return {
    ...toColorVariables(colors),
    ...Object.fromEntries(
      Object.entries(fontFamily).map(([name, stack]) => [`--font-${name}`, stack.join(', ')]),
    ),
  }
}

export function toDarkCssVariables(): Record<string, string> {
  return toColorVariables(darkColors)
}

// Tailwindが不透明度修飾子(bg-accent/10 等)を解決できるのは<alpha-value>プレースホルダを含む定義のみ
export function toTailwindColors(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([name, value]) => [
      name,
      isHex(value) ? `rgb(var(--color-${name}-rgb) / <alpha-value>)` : `var(--color-${name})`,
    ]),
  )
}
