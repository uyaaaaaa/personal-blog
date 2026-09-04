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
npm run format    # Prettier で整形
npm run lint      # Prettier(--check) + ESLint + dependency-cruiser
npm test          # テスト（Vitest）
```

`npm install` で pre-commit フック（`.githooks/`）が有効になり、commit のたびに `npm run lint` が走ります。テスト（`npm test`）はフックに載せていないため、ローカルでは手で打つか PR に任せます。
整形で落ちたときは `npm run format` を実行してから commit し直してください。整形の対象はコードだけで、記事や設計ドキュメントの Markdown は含みません。

Prettier 導入時の一括整形は独立した1コミットにしてあり、そのハッシュを `.git-blame-ignore-revs` に置いています。clone したら次を1回実行すると、`git blame` がそのコミットを飛ばします。

```sh
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## プレビュー環境

Cloudflare Pages の Git 連携が有効なため、Pull Request を作ると自動でプレビューがデプロイされます。リポジトリ側にワークフローの設定は不要です。

PR では GitHub Actions の `Lint`（`npm run lint`）と `Test`（`npm test`）が並列に走ります。build は Actions では回しません。

PR に `Cloudflare Pages` チェックが追加され、ビルド完了後に Cloudflare のボットが以下2種類の URL をコメントします。

| 種類 | 形式 | 性質 |
| :--- | :--- | :--- |
| デプロイ単位 | `https://<デプロイID>.tech-blog-efb.pages.dev` | そのコミットに固定。後から push しても変わらない |
| ブランチ単位 | `https://<ブランチ名>.tech-blog-efb.pages.dev` | 常にそのブランチの最新コミットを指す |

ブランチ名の `/` は `-` に変換され、長い名前は 28 文字で切り詰められます（例: `claude/issue-39-l2z4fz` → `claude-issue-39-l2z4fz`、`claude/past-session-review-43ngoq` → `claude-past-session-review-4`）。ブランチ単位の URL を人に渡すときは、ボットのコメントに出た実際の URL を使ってください。

プレビューは本番と同じ静的生成の出力を配信するため、記事のプリレンダリング結果やスタイルの最終確認に使えます。`main` にマージすると本番 <https://tech-blog-efb.pages.dev> に反映されます。

## ディレクトリ構成

```
app/
├── components/   # UIコンポーネント（layout / article / content / common / error）
├── composables/  # 共有ロジック（目次追従、スクロール、タグ集計、SEOメタタグ）
├── pages/        # ルーティング
├── utils/        # 日付・タグの整形
└── layouts/      # 全ページ共通レイアウトとベーススタイル
content/article/  # 記事（Markdown）
theme/            # デザイントークン（色・フォントの単一情報源）
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
| `category` | ✓ | 記事の区分。`blog` / `book` のいずれか（`content.config.ts` の `z.enum`）。TOP の棚の分類と記事詳細のバッジに使う |
| `image` | | サムネイル画像。指定するとHeroで絵文字の代わりに表示される |

## ドキュメント

| ドキュメント | 内容 |
| :--- | :--- |
| [docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md) | デザインの大方針。コンセプト、デザイントークン、レイアウト原則、UX要件。 |
| [docs/DECISIONS.md](./docs/DECISIONS.md) | 判断の記録。画面・機能ごとに、実装を読んでも分からない「なぜ」だけ。値や構造は実装が正。 |
| [docs/ICON_GUIDELINE.md](./docs/ICON_GUIDELINE.md) | アイコン定義。`u/` モノグラムの仕様と、favicon 一式・OGP 画像の生成手順。 |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 現状の構造、依存方向、データとスタイルの流れ、強制手段の状態。 |

UI を変更した際は、該当するドキュメントも併せて更新してください。コーディングルールは `.claude/rules/`、作業手順は `.claude/skills/` にあります。

## タスク管理

やることは [GitHub Issues](https://github.com/uyaaaaaa/personal-blog/issues) で管理しています。
