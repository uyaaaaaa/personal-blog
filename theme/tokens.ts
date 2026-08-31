/**
 * デザイントークンの単一情報源。
 *
 * ここに定義した値から、tailwind.config.ts が
 * 「Tailwindのユーティリティクラス」と「`:root` のCSS変数」の両方を生成する。
 * トークンを追加・変更するときはこのファイルだけを書き換える（→ docs/DESIGN_GUIDELINE.md）。
 *
 * CSS変数名はキーからそのまま導出される（`main` → `--color-main`、`sans` → `--font-sans`）。
 */

/** 配色。Tailwind: `text-main` `bg-accent` など / CSS変数: `var(--color-main)` など */
export const colors = {
  /** ページ背景。`body` の背景色 */
  bg: '#F9F9F9',
  /** ヘッダーの検索ボックス背景（ページ背景ではない → #44） */
  base: '#FAF5FF',
  /** 見出し・本文の文字色 */
  main: '#1A1A1A',
  /** 投稿日、キャプション、説明文などのサブテキスト */
  sub: '#888888',
  /** リンク、タグ枠、アクティブ状態。唯一の色要素 */
  accent: '#8B5CF6',
  /** アクセント色で塗りつぶした面のホバー時 */
  'accent-hover': '#7C3AED',
  /** カード枠線、セクション区切り、ヘッダー下線 */
  border: '#E5E5E5',
  /** インラインコード、コードブロックの背景色 */
  'code-bg': '#F5F5F5',
} as const

/** フォント。Tailwind: `font-sans` `font-mono` / CSS変数: `var(--font-sans)` `var(--font-mono)` */
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

/**
 * トークンを `:root` に流し込むCSS変数の宣言に変換する。
 * `<style scoped>` を持つコンポーネントはこの変数を参照する。
 */
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
