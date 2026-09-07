---
title: "ESLintからBiomeに移せるかは、templateを見ているルールがあるかで決まる"
emoji: "🦀"
description: "乗り換えの可否を決めるのは速度でもファイル数でもなく、自分のlintルールがSFCのどこを見ているか"
published: false
date: 2026-09-07
tags:
  - eslint
  - biome
  - nuxt.js
category: blog
---

ESLint と Prettier、使っていますか。Biome や oxlint が速いという話を聞くたびに、乗り換えを検討しては戻ってきていませんか。

このブログもそうでした。ただ、戻ってきた理由は速度ではありません。**見るべきなのは、自分の lint ルールが Vue SFC のどこを見ているかです。**

## 前提: プリセットを取り込まない ESLint 設定

このブログの `eslint.config.mjs` は、スタイルガイドのプリセットを1つも取り込んでいません。規約を機械に落とすために1本ずつ足したもので、中身のほとんどが `no-restricted-syntax` の [esquery](https://github.com/estools/esquery) セレクタです。

```js [eslint.config.mjs]
{
	// bfcache を壊すため、離脱時の処理は pagehide / visibilitychange に置く
	selector:
		'CallExpression[callee.property.name=/^(add|remove)EventListener$/] > Literal[value=/^(before)?unload$/]',
	message: 'unload / beforeunload は購読しない。',
}
```

同じ調子のルールが `<template>` と `<style>` にもあります。Tailwind の任意値（`w-[264px]`）を禁止するもの、`<style>` の色とサイズの直値を禁止するもの。後者は198行の自作ルールです。

対象は `app/` で86ファイル、約2,200行。**この規模なら lint が何秒かかろうと体感は変わりません。** それでも試したのは、Rust 製のツールが Vue SFC を扱えるようになったと聞いたからでした。

## formatter は、もう完全に移せた

Prettier で整形済みのリポジトリに別の formatter をかけ、出力が1バイトでも変わるかを見ます。

[oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) 0.66.0 には、`.prettierrc` を読む移行コマンドがあります。

```sh
$ oxfmt --migrate=prettier
Migrated prettier-plugin-tailwindcss options to sortTailwindcss
Migrated ignore patterns from `.prettierignore`

$ oxfmt --write .
Finished in 2123ms on 112 files using 4 threads.
```

結果は **112ファイルすべてで差分ゼロ**。`semi: false` や `singleAttributePerLine` はもちろん、`prettier-plugin-tailwindcss` のクラス並べ替えまで組み込みの `sortTailwindcss` が引き継ぎ、`tailwind.config.ts` を自動で見つけて同じ順序を出します。

一方 [markup_fmt](https://github.com/g-plane/markup_fmt) 0.27.3（dprint 経由）は、設定を寄せても **104ファイル中56ファイル・835行**がずれました。

```diff [Prettierとの差分]
 				<NuxtLink
 					:to="viewAllPath"
 					class="transition-colors duration-200 hover:text-accent"
-					>{{ title }}</NuxtLink
-				>
+				>{{ title }}</NuxtLink>
```

閉じタグの `>` の置き方、`<script setup lang="ts">` を属性ごとに改行する挙動、長い属性が1つの要素を折り返さない挙動。markup_fmt は Prettier 互換を名乗っていないので、これは不具合ではなく設計の違いです。

**少なくとも oxfmt を選ぶ限り、formatter は乗り換えの障害ではなくなっています。**

## 移せるルールと、移せないルールがあった

問題は lint 側でした。ルールを1本ずつ実際に走らせます。

[oxlint](https://github.com/oxc-project/oxc) 1.81.0 は、設定を読んだ時点で止まりました。

```txt
Failed to parse oxlint configuration file.
  x Rule 'no-restricted-syntax' not found in plugin 'eslint'
```

**`no-restricted-syntax` が実装されていません。** 主力が丸ごと書けないので、ここで終わりです。

[Biome](https://biomejs.dev/) 2.5.12 は違いました。GritQL のプラグインで AST のパターンを自分で書けます。

```txt [plugins/no-user-agent.grit]
`$obj.userAgent` as $match where {
	register_diagnostic(span = $match, message = "navigator.userAgent で分岐しない。")
}
```

これは `.ts` でも `.vue` の `<script>` でも発火しました。`overrides` の `includes` でプラグインを当てる範囲も絞れるので、「`components/` の中だけ `route.params` を禁止する」も書けます。

ところが、`<template>` の class 属性を見るプラグインは**発火しません**。

```txt [plugins/no-arbitrary.grit]
language html

`class=$value` where { ... }
```

`.vue` でも `.html` でも、`html.experimentalFullSupportEnabled` を立てても、診断は1件も出ませんでした。`<style>` に至っては、GritQL に CSS 用の入口がありません。

## 分かれ目は script / template / style だった

| ルールが見ているもの | oxlint 1.81 | Biome 2.5.12 |
| :--- | :--- | :--- |
| `<script>` と `.ts`（import 制限、AST パターン、パス限定） | 一部のみ | **移せる** |
| `<template>`（Tailwind の任意値、未定義コンポーネント） | 未実装 | 移せない |
| `<style>`（色とサイズの直値） | 未実装 | 移せない |

**Rust 製のツールは、SFC の `<script>` を JavaScript として取り出すところまでは来ています。** 止まっているのは `<template>` と `<style>` の構文木を lint に開くところで、formatter は同じ SFC を整形できている以上、パーサが無いわけではありません。プラグインから触れる形になっていないのだと思います（推測です）。

つまり「ESLint に規約を寄せるほど乗り換えが遠のく」ではありません。**`<template>` と `<style>` を見に行った瞬間に、ESLint から出られなくなります。**

このブログの2本は、どちらもデザインの一貫性を機械に守らせるために入れたものでした。手放せば規約が目視に戻るので、速度と引き換えにはできません。ESLint が残った理由はこれだけです。

## 自分の設定を仕分ける

乗り換えを検討しているなら、ベンチマークを読む前に設定を3つに分けてください。

1. **プリセット由来のルール** — 同等品が移行先にあるかを見る
2. **`<script>` / `.ts` だけを見る自作ルール** — import 制限、AST パターン、パス限定。Biome なら移せる
3. **`<template>` / `<style>` を見るルール** — 1本でもあれば、その時点で ESLint は残ります

3 が無ければ、あとは速度と好みの話です。1本でもあれば、速度をいくら比べても結論は変わりません。

なお formatter はこの判断と独立に動かせます。oxfmt が Prettier と同じ出力を出す以上、**lint を ESLint に残したまま整形だけ移す構成が成立します。**

## 参考

- [Oxfmt | The JavaScript Oxidation Compiler](https://oxc.rs/docs/guide/usage/formatter.html)
- [markup_fmt](https://github.com/g-plane/markup_fmt)
- [Biome v2.4 — Embedded Snippets, HTML Accessibility, and Better Framework Support](https://biomejs.dev/blog/biome-v2-4/)
- [Biome — Language support](https://biomejs.dev/internals/language-support/)
- [このブログの eslint.config.mjs](https://github.com/uyaaaaaa/personal-blog/blob/main/eslint.config.mjs)
- [ADR 12: scoped CSS の値も Tailwind の語彙に限り、ESLint で落とす](https://github.com/uyaaaaaa/personal-blog/blob/main/docs/adr/12-style-block-token-lint.md)
