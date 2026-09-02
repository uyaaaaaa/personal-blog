# Spec

各コンポーネント・ページ・共有ロジックの**詳細要件**を、実装単位で記述するドキュメント群です。
props、表示要件、状態とインタラクション、そして**実装だけを読んでも分からない「なぜ」**を置きます。

サイト全体の大方針（コンセプト、デザイントークン、レイアウト原則、UX要件）は [DESIGN_GUIDELINE.md](../DESIGN_GUIDELINE.md) にあります。
本書群に出てくる色名・サイズ名（アクセント、サブテキスト、カード角丸 など）は、すべてそこで定義されたトークンを指します。

## 構成

画面・機能の単位で分けています。1つの変更で触るファイルが同じ1枚に収まることを優先し、`app/components/` のディレクトリとは一致させていません。

| ファイル | 範囲 | 主な実装 |
| :--- | :--- | :--- |
| [layout.md](./layout.md) | ヘッダー、ナビゲーション（Explore / ドロワー）、テーマトグル、フッター | `app/components/layout/` |
| [article-list.md](./article-list.md) | TOP の Hero と棚、一覧グリッド、記事カード、ページャ | `Hero.vue` `ArticleList.vue` `article/ArticleShelf.vue` `article/ArticleCard.vue` `common/Pagination.vue` |
| [article-detail.md](./article-detail.md) | 記事ヘッダー、目次（PC / SP）、サイドバー、戻る導線、先頭に戻る、ページ内リンクの着地位置 | `pages/article/[_slug].vue` `article/Toc*.vue` `common/` |
| [content.md](./content.md) | Markdown のスタイル、Callout、脚注、本文中のリンクとテーブル | `components/content/` `remark/` `tailwind.config.ts` |
| [error.md](./error.md) | 全画面エラーと、記事詳細のページ内フォールバック | `error.vue` `components/error/` `article/ArticleFallback.vue` |
| [shared.md](./shared.md) | composable / utility の一覧 | `composables/` `utils/` |

## 書き方の約束

- **実装が正**です。コンポーネントを変更した際は該当ファイルも併せて更新してください。更新日は書きません（Git が持っています）。
- 値はトークン名で書きます（`アクセント色`、`カード角丸`）。hex 値や px の直値は、トークンに無いものだけ書きます。
- **理由はここに書きます。** リポジトリを読めば分かることをコードコメントに書かない方針（[.claude/rules/comment.md](../../.claude/rules/comment.md)）のため、
  「一見不要に見える指定が必要な理由」「試して戻した案」のような、実装から読み取れない背景はコードではなくこの spec に残します。
- 1コンポーネントは `##` 見出し1つ。冒頭にファイルパスを書き、**Props / 表示要件 / インタラクション**の順に並べます。
  ページ固有の仕組み（脚注、着地位置など）はコンポーネントと同じ粒度の `##` として扱います。
