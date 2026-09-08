---
title: "ESLintとPrettierをBiomeやoxlintに乗り換えられるか試す"
emoji: "🦀"
description: "速度だけ見て決めると痛い目に遭います"
published: true
date: 2026-09-07
tags:
  - eslint
  - biome
  - nuxt.js
category: blog
---

## はじめに

みなさん、ESLint と Prettier、使っていますか？

Biome や oxlint が「Rust製で爆速」という話を聞くたびに、乗り換えたくなってきませんか？私はなります。

というわけで、このブログ（Nuxt 4）で実際に試してみました。結論から言うと**乗り換えませんでした**。理由が速度とは全然違うところにあったので、その話をします。

## 今の構成

- Nuxt 4.2 / ESLint 10.9 / Prettier 3.9 + `prettier-plugin-tailwindcss` / Tailwind 3.4
- 対象は `app/` の86ファイル、約2,200行
- ESLint はスタイルガイドのプリセットを一切入れておらず、自分で足したルールだけが入っている

※ 86ファイルなので、正直なところ lint が何秒かかろうと体感は変わりません。完全に趣味です😇

足したルールはこういうやつです。`no-restricted-syntax` にセレクタを書いて「この構文は書くな」を表現しています。

```js [eslint.config.mjs]
{
  // bfcache を壊すため、離脱時の処理は pagehide / visibilitychange に置く
  selector:
    'CallExpression[callee.property.name=/^(add|remove)EventListener$/] > Literal[value=/^(before)?unload$/]',
  message: 'unload / beforeunload は購読しない。',
}
```

これが8本。あとは `<template>` の Tailwind 任意値（`w-[264px]`）を禁止するものと、`<style>` の色とサイズの直値を禁止する自作ルール（198行）があります。

## まずはformatterから

Prettier で整形済みのリポジトリに別の formatter をかけ、出力が変わるか見てみます。

[oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) には `.prettierrc` を読む移行コマンドがありました。親切ですね。

```sh
$ oxfmt --migrate=prettier
Migrated prettier-plugin-tailwindcss options to sortTailwindcss
Migrated ignore patterns from `.prettierignore`

$ oxfmt --write .
Finished in 2123ms on 112 files using 4 threads.
```

結果、**112ファイルすべてで差分ゼロ**！！`prettier-plugin-tailwindcss` のクラス並べ替えまで内蔵していて、`tailwind.config.ts` を勝手に見つけて同じ順序を出してくれます。すごい。

一方 [markup_fmt](https://github.com/g-plane/markup_fmt)（dprint 経由）は、104ファイル中56ファイルがずれました。

```diff [app/components/article/ArticleShelf.vue]
   <NuxtLink
     :to="viewAllPath"
     class="transition-colors duration-200 hover:text-accent"
-    >{{ title }}</NuxtLink
-  >
+    >{{ title }}</NuxtLink>
```

※ こちらは Prettier 互換を名乗っていないので、不具合ではなくそういう設計です。むしろ人間の目には markup_fmt のほうが読みやすい気も...

→ **formatter は oxfmt を選べば、そのまま移せそう**

## oxlintを試す

問題は lint でした。設定を書いて実行したら、いきなりこうなります。

```txt
Failed to parse oxlint configuration file.
  x Rule 'no-restricted-syntax' not found in plugin 'eslint'
```

`no-restricted-syntax` が**実装されていません**。ファイルを1つも読まずに落ちます...

`no-restricted-imports` は動きました。ただ `require-v-for-key` も `no-v-html` も `no-undef-components` も軒並み `not found` で、`<template>` を見るルールは1本もありません。

## Biomeを試す

[Biome](https://biomejs.dev/) は良さそうでした。GritQL でルールを自作できます。

```txt [plugins/no-user-agent.grit]
`$obj.userAgent` as $match where {
  register_diagnostic(span = $match, message = "navigator.userAgent で分岐しない。")
}
```

`.ts` でも `.vue` の `<script>` でもちゃんと発火しました。`overrides` で当てる範囲も絞れるので、「`components/` の中だけ `route.params` を禁止」も書けます。

→ **`<script>` を見るルールは全部移せる**

ところが `<template>` の class を見るルールは、うんともすんとも言いません...

```txt [plugins/no-arbitrary.grit]
language html

`class=$value` where { ... }
```

`.vue` でも `.html` でも、`html.experimentalFullSupportEnabled` を立てても、診断は1件も出ません。`<style>` に至っては CSS 用の入口自体がありませんでした。

> [!HELP] 疑問
> formatter は同じSFCを整形できているのに、なぜ lint からは `<template>` が見えないのか...?

パーサが無いわけではなさそうなので、プラグインから触れる形にまだなっていないのだと思います。

## 分かったこと

移せるかどうかは、**そのルールがSFCのどこを見ているか**で決まっていました。

1. `<script>` / `.ts` を見るルール
    - import 制限、AST パターン、パス限定 → **Biome に移せる**
2. `<template>` を見るルール
    - Tailwind の任意値、未定義コンポーネントの検出 → **移せない**
3. `<style>` を見るルール
    - 色とサイズの直値 → **移せない**

このブログは 2 と 3 を持っていました。どちらもデザインの一貫性を機械に守らせるためのもので、手放すと目視に戻ります。さすがに速度と引き換えにはできないので、ESLint 続投です！！

※ 逆に言うと、2 と 3 が1本も無いなら乗り換えの障害は無さそうです。ベンチマークを読む前に、自分の設定を上の3つに仕分けてみてください。

## おわりに

formatter だけ先に移す手もありますね。oxfmt が Prettier と同じ出力を出す以上、**lint は ESLint のまま、整形だけ oxfmt** が普通に成立します。

そのうちやるかもしれません😴

## 参考

- [Oxfmt | The JavaScript Oxidation Compiler](https://oxc.rs/docs/guide/usage/formatter.html)
- [markup_fmt](https://github.com/g-plane/markup_fmt)
- [Biome — Language support](https://biomejs.dev/internals/language-support/)
- [このブログの eslint.config.mjs](https://github.com/uyaaaaaa/personal-blog/blob/main/eslint.config.mjs)
