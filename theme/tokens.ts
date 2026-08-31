export const colors = {
  bg: '#F9F9F9',
  main: '#1A1A1A',
  sub: '#888888',
  accent: '#8B5CF6',
  'accent-hover': '#7C3AED',
  border: '#E5E5E5',
  'surface-subtle': '#F5F5F5',
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

export function toCssVariables(): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(colors).map(([name, value]) => [`--color-${name}`, value]),
    ),
    ...Object.fromEntries(
      Object.entries(fontFamily).map(([name, stack]) => [`--font-${name}`, stack.join(', ')]),
    ),
  }
}
