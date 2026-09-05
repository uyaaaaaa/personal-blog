# 判断の記録

**実装を読んでも分からない「なぜ」**だけを置くドキュメントの索引です。
値・構造・props は書きません（実装が正です）。「一見不要に見える指定が必要な理由」「試して戻した案」「ブラウザ・ライブラリ・Cloudflare の都合」が対象です。

サイト全体に横断する方針（トークン、ブレークポイント、モーション、レイアウト原則）は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md) にあります。
書き方（1項目の型、2つの粒度と置き場）は [.claude/rules/docs.md](../.claude/rules/docs.md) にあります。

## 構造に関わる判断

動く選択肢が2つ以上あったうえで選んだもの。1判断1ファイルで `docs/adr/` に置きます。

- [ページ番号をクエリではなくパスで持つ](./adr/01-page-number-in-path.md)
- [`prefers-reduced-motion` を参照しない](./adr/02-no-prefers-reduced-motion.md)
- [自作モジュールの auto-import を止める](./adr/03-no-auto-import.md)
- [スクロールの購読をアプリ全体で1本にし、非表示のコンポーネントでは止める](./adr/04-single-scroll-subscription.md)
- [メニューの先読みをホバー / フォーカスまで遅らせる](./adr/05-menu-prefetch-on-interaction.md)
- [記事詳細は取得が確定するまで何も出さず、失敗と記事なしを区別する](./adr/06-article-detail-fetch-states.md)
- [ディレクトリは型別のフラット構成を維持する](./adr/07-flat-directory-by-type.md)
- [カテゴリは `z.enum` で固定し、値をそのまま URL セグメントにする](./adr/08-category-enum-as-url.md)
- [プリレンダ済みパスの除外をワイルドカードで畳む](./adr/09-prerender-exclude-wildcard.md)
- [カテゴリの索引をTOPの棚からヘッダーに移す](./adr/10-category-index-in-header.md)
- [コードブロックの表示を `ProsePre.vue` に集約する](./adr/11-prose-pre-owns-code-block.md)
- [コンポーネントの仕様書を持たず、判断の理由だけを残す](./adr/12-no-component-spec.md)
- [整形は Prettier に任せ、ESLint には持たせない](./adr/13-prettier-owns-formatting.md)
- [テストは実装の隣に置く](./adr/14-tests-next-to-source.md)
- [Nuxt を起こすのはコンポーネントのテストだけにする](./adr/15-nuxt-environment-per-file.md)
- [lint とテストを別のワークフローに分ける](./adr/16-separate-lint-and-test-workflows.md)
- [テストを2回目の使用とみなして抽出する](./adr/17-test-as-second-use.md)

## 画面・機能ごとの制約

そうするしかない実装上の制約。画面・機能の単位でまとめています。

- [ヘッダーとナビゲーション](./decisions/header.md)
- [記事一覧](./decisions/article-list.md)
- [記事詳細](./decisions/article-detail.md)
- [記事本文（Markdown）](./decisions/markdown.md)
- [エラー](./decisions/error.md)
- [ビルドと配信](./decisions/build.md)
- [共有ロジック](./decisions/shared.md)
