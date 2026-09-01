---
title: "Tailwindのトークンを1箇所にまとめても、ダークモードは切り替わらない"
emoji: "🌓"
description: "ダークテーマが簡単に入るかどうかは、実装当日ではなく、色の参照をCSS変数に一本化できているかで決まっている"
published: true
date: 2026-09-01
tags:
  - tailwindcss
  - nuxt.js
  - css
category: blog
---

このブログにダークテーマを入れた。作業自体は数時間で終わっている。

ただ、この短さは当日の実装がうまくいったからではない。前日に「色の定義を1箇所にまとめる」リファクタを済ませていて、しかもそれだけでは足りず、もう一段の作り直しが挟まっている。難所は実装ではなく、その手前にあった。

## トークンを1箇所にまとめても、テーマは切り替わらない

前日のリファクタでやったのは、`tailwind.config.ts` と レイアウトの `:root` に別々に書かれていた色を、`theme/tokens.ts` に集約することだった。

```ts
// theme/tokens.ts
export const colors = {
  main: '#1A1A1A',
  accent: '#8B5CF6',
  border: '#E5E5E5',
  'surface-subtle': '#F5F5F5',
} as const

export function toCssVariables(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([name, value]) => [`--color-${name}`, value]),
  )
}
```

```ts
// tailwind.config.ts
const cssVariables = plugin(({ addBase }) => {
  addBase({ ':root': toCssVariables() })
})

export default <Config>{
  theme: {
    extend: {
      colors,
    },
  },
  plugins: [cssVariables],
}
```

`:root` のCSS変数も、`text-main` のようなユーティリティクラスも、どちらも `tokens.ts` から生成される。二重管理は消えた。

ここまで来れば、あとは `.dark` で変数を上書きすれば全体が切り替わる。そう思っていた。

```css
.dark {
  --color-main: #E5E5E5;
}
```

切り替わったのは `var(--color-main)` と直接書いた箇所だけで、`text-main` は黒のままだった。

## ユーティリティクラスにはhexが焼き込まれている

Tailwindはユーティリティクラスをビルド時に生成する。`extend.colors` に渡した `colors` は生のhexのオブジェクトなので、出てくるCSSはこうなる。

```css
.text-main {
  color: #1A1A1A;
}
```

`var()` がどこにもない。`:root` の変数と `.text-main` の値はどちらも `tokens.ts` から出ているのに、**生成された時点で切り離されている**。実行時に変数を上書きしても、`.text-main` はそれを見ていない。

同じことがTailwindの設定の中でも起きていた。typographyプラグインの設定では、色をテンプレートリテラルで埋め込んでいる。

```ts
pre: {
  backgroundColor: colors['surface-subtle'],
  color: '#24292E',
  border: `1px solid ${colors.border}`,
},
```

これも生成時に確定する。`tokens.ts` を参照してはいるが、出てくるのはhexの文字列でしかない。

> [!WARNING] 「単一情報源にした」と「実行時に切り替わる」は別の話
> 前者はビルド時の入力を1つにすること、後者は出力されたCSSが `var()` を参照していること。
> 前者だけを満たしても、テーマは切り替わらない。

## 参照をCSS変数に変える

やることは単純で、`extend.colors` にhexではなく `var()` を渡す。

```ts
export function toTailwindColors(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([name]) => [name, `var(--color-${name})`]),
  )
}
```

これで `.text-main { color: var(--color-main) }` が出力され、`.dark` の上書きが効くようになる。

ただしこれだけだと不透明度修飾子が壊れる。`bg-accent/10` はTailwindが色の値からアルファ付きの色を組み立てる書き方だが、`var(--color-accent)` はTailwindから見ると中身の分からない文字列なので、そこにアルファを差し込めない。

Tailwindはこのために `<alpha-value>` というプレースホルダを用意している。定義にこれを含めておくと、修飾子の値がその位置に差し込まれる。差し込む先を作るには、色を `26 26 26` のような空白区切りのチャンネル値でも持っておく必要がある。

```ts
const isHex = (value: string) => value.startsWith('#')

function hexToRgbChannels(hex: string): string {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')
}

export function toCssVariables(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).flatMap(([name, value]) => [
      [`--color-${name}`, value],
      ...(isHex(value) ? [[`--color-${name}-rgb`, hexToRgbChannels(value)]] : []),
    ]),
  )
}

export function toTailwindColors(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([name, value]) => [
      name,
      isHex(value) ? `rgb(var(--color-${name}-rgb) / <alpha-value>)` : `var(--color-${name})`,
    ]),
  )
}
```

トークン1つにつき `--color-accent` と `--color-accent-rgb` の2本を出す。前者はCSSから直接 `var()` で使う分、後者はTailwindが組み立てる分。`rgba(0, 0, 0, 0.5)` のようなhexでない値にはチャンネル版を作れないので、`isHex` で分岐している。

出力はこうなる。

```css
.bg-accent      { background-color: rgb(var(--color-accent-rgb) / 1); }
.bg-accent\/10  { background-color: rgb(var(--color-accent-rgb) / 0.1); }
```

あとは `darkMode: 'class'` を足して、`.dark` に暗い側の値を並べればテーマ全体が切り替わる。

## パレット外の色は、変数化しても残る

ここまでで `tokens.ts` に載っている色は全部切り替わるようになる。裏を返すと、載っていない色は切り替わらない。

`bg-white` や `bg-gray-100` はTailwindの組み込みパレットなので、`tokens.ts` の管轄外にある。CSSに直接書いた `#fff` も同じ。当時これらをコンポーネント9ファイルで使っていた。

```html
<div class="... bg-white border border-border ...">
  <div class="... bg-gray-100">
```

`border-border` は `tokens.ts` 由来なので切り替わるが、`bg-white` は白のまま残る。ダークにすると、同じカードの中で背景と枠線が食い違う。

`surface` と `surface-muted` をトークンとして新設して、置き換えた。

```html
<div class="... bg-surface border border-border ...">
  <div class="... bg-surface-muted">
```

この洗い出しは自動化できなかった。`tokens.ts` を読んでも「使われていない色」は見えないし、grepするにしても `bg-white` `bg-gray-*` `#fff` `#000` と探す対象を人が列挙することになる。結局コンポーネントを一通り目で見た。

## おわりに

ダークテーマそのものの実装は、色が変数になってさえいれば `.dark` の値を書くだけで終わる。時間がかかるのはその手前、色の参照が本当に一本化されているかのほうだった。

確認は難しくない。DevToolsで `.text-main` の中身を見て、hexが出ていたらまだ土台はできていない。`var()` が出ていれば、あとは値を差し替えるだけになる。

## 参考

- [Using CSS variables - Tailwind CSS](https://v3.tailwindcss.com/docs/customizing-colors#using-css-variables)
