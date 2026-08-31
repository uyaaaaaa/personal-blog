# Tech Blog

個人の技術ブログです。Nuxt Content で Markdown 記事を管理し、Cloudflare Pages に静的生成でデプロイしています。

## 技術スタック

| 領域 | 使用技術 |
| :--- | :--- |
| フレームワーク | Nuxt 4 |
| コンテンツ | Nuxt Content 3（Markdown + フロントマター） |
| スタイル | Tailwind CSS 3 + `@tailwindcss/typography` |
| ホスティング | Cloudflare Pages（`nitro.preset: cloudflare-pages`） |

## 開発

```sh
npm install
npm run dev       # 開発サーバー
npm run build     # 本番ビルド
npm run generate  # 静的生成
npm run preview   # ビルド結果のプレビュー
```

## ディレクトリ構成

```
app/
├── components/   # UIコンポーネント（layout / article / content / common / error）
├── composables/  # 共有ロジック（目次追従、スクロール、タグ集計）
├── pages/        # ルーティング
├── utils/        # 日付・タグの整形
└── layouts/      # 全ページ共通レイアウトとCSS変数
content/article/  # 記事（Markdown）
remark/           # Markdown拡張（Obsidian互換Callout）
public/           # favicon・PWAアイコン等の静的ファイル
docs/             # 設計ドキュメント
```

## 記事の追加

`content/article/` に Markdown を追加します。フロントマターのスキーマは `content.config.ts` で定義しています。

```md
---
title: "記事タイトル"
emoji: "🐬"
description: "一覧に表示する説明文。"
published: true
date: 2026-08-31
tags:
  - mysql
  - index
category: blog
---
```

| 項目 | 必須 | 説明 |
| :--- | :--- | :--- |
| `title` | ✓ | 記事タイトル |
| `description` | ✓ | 一覧・Heroに表示する説明文 |
| `published` | ✓ | `false` の記事は一覧・詳細ともに表示されない |
| `date` | ✓ | 公開日。一覧はこの降順で並ぶ |
| `emoji` | | サムネイル代わりの絵文字。省略時は `📝` |
| `tags` | | タグ。`/tags` での集計対象になる |
| `category` | | `blog` または `book` |
| `image` | | サムネイル画像。指定するとHeroで絵文字の代わりに表示される |

## ドキュメント

| ドキュメント | 内容 |
| :--- | :--- |
| [docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md) | デザインの大方針。コンセプト、デザイントークン、レイアウト原則、UX要件。 |
| [docs/COMPONENT_SPEC.md](./docs/COMPONENT_SPEC.md) | コンポーネント定義。各コンポーネントの props、表示要件、インタラクション。 |
| [docs/ICON_GUIDELINE.md](./docs/ICON_GUIDELINE.md) | アイコン定義。`u/` モノグラムの仕様と favicon 一式の生成手順。 |

UI を変更した際は、該当するドキュメントも併せて更新してください。

## タスク管理

やることは [GitHub Issues](https://github.com/uyaaaaaa/personal-blog/issues) で管理しています。
