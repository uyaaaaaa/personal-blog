---
title: "Nuxt Contentの記事がSSR時に取得できない問題とその解決策"
description: ""
published: true
date: 2026-02-07
tags:
  - nuxt.js
  - cloudflare
  - "@nuxt/content"
layout: default
---

## 前提条件・環境

- 概要: Nuxt.jsで作られた個人ブログ（URL: <https://tech-blog-efb.pages.dev/>）
- 技術スタック
    - 言語: `Vue.js`, `TypeScript`
    - コンテンツ管理: `@nuxt/content`
    - スタイリング: `Tailwind CSS`
- デプロイ環境
    - `Cloudflare Pages`

## 発生した問題

本番環境（`Cloudflare Pages`）において、アプリケーションの初回アクセス時やリロード時（サーバーサイドレンダリング、`SSR`）に、`@nuxt/content`で管理している記事コンテンツが正常に取得・表示されませんでした。

一方、クライアント側での画面遷移（`CSR`）時には、コンテンツが問題なく取得・表示されていました。。なぜ？？

## 原因

この問題の主な原因は、`Cloudflare Pages`の実行環境が`better-sqlite3`のようなネイティブ`Node.js`モジュールに対応していない点にありました。`@nuxt/content`は内部でデータベース接続やクエリ実行に`better-sqlite3`を利用するケースがあり、`SSR`時にこれらの処理が失敗することで、コンテンツが空の状態でレンダリングされていたようです。

一方、クライアントサイドでの遷移時には、NuxtがAPI経由または事前にフェッチされたペイロードを利用してデータを取得するため、この互換性問題の影響を受けずに正常にコンテンツが表示されていたと考えられます。

## 解決策

この問題を解決するために、ビルド時にページを**プリレンダリング（SSG: Static Site Generation）**する方針に変更しました。これにより、`Node.js`が動作するビルド環境で事前にHTMLとデータペイロードを生成し、`Cloudflare Pages`上ではこれらの純粋な静的ファイルとして配信することで、実行環境の制約を回避します。

具体的な変更としては、`nuxt.config.ts`に以下の`nitro`設定と`features`オプションを追加しました。

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: [
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
  ],
  nitro: {
    preset: 'cloudflare-pages',
    prerender: {
      crawlLinks: true,
      routes: ['/'] // アプリケーションのルートパスもプリレンダリング対象に含める
    }
  },
  features: {
    inlineStyles: true // CSSをインライン化し、FOUC（Flash Of Unstyled Content）を防ぐ
  }
})
```

この設定により、`@nuxt/content`で生成されるコンテンツを含むページがビルド時に静的ファイルとして出力され、`Cloudflare Pages`での表示問題が解消されます！！

## 参考リンク

- <https://github.com/uyaaaaaa/personal-blog>
- <https://tech-blog-efb.pages.dev>
