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
} as const

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
  mono: [
    'ui-monospace',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Consolas',
    'monospace',
  ],
} as const

const isHex = (value: string) => value.startsWith('#')

function hexToRgbChannels(hex: string): string {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')
}

export function toCssVariables(): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(colors).flatMap(([name, value]) => [
        [`--color-${name}`, value],
        ...(isHex(value) ? [[`--color-${name}-rgb`, hexToRgbChannels(value)]] : []),
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(fontFamily).map(([name, stack]) => [`--font-${name}`, stack.join(', ')]),
    ),
  }
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
