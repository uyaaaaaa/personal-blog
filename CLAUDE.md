# CLAUDE.md

Nuxt 4 + Nuxt Content 3 で構築した個人技術ブログ。Cloudflare Pages に静的生成でデプロイしています。
プロジェクトの全体像・記事の書き方・プレビュー環境については [README.md](./README.md) を参照してください。

## コーディングルール

@.claude/rules/comment.md

## 記事を書くとき

`content/article/` の記事を書く・レビューする・リライトするときは [.claude/skills/article/SKILL.md](./.claude/skills/article/SKILL.md) の方針に従ってください。素材の所在（業務・手元の環境・読んだ本など、多くはリポジトリ外）を見極めるところから、質問で1本に詰めるフェーズ、型別の全体構成、削るものの基準、フロントマターと callout の作法までをまとめています。

## コマンド

```sh
npm run dev       # 開発サーバー
npm run build     # 本番ビルド
npm run generate  # 静的生成
npm run preview   # ビルド結果のプレビュー
```

テストランナーと Lint は未導入です。変更の確認は `npm run build` が通ることと、開発サーバーでの目視で行います。

## 設計上の約束事

- **色・フォントは `theme/tokens.ts` が単一情報源。** ここから `tailwind.config.ts` が Tailwind のユーティリティクラスと `:root` の CSS 変数の両方を生成します。パレットにある色はコンポーネントに直接書かず、`text-main` などのクラスか `var(--color-accent)` を使ってください。白黒や外部テーマ由来の値など、パレット外の例外は [docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md) にまとめています。
- **ページ内リンクの着地位置は `app/pages/article/[_slug].vue` の `scroll-margin-top` で決まります。** JS 側（`useScrollTo`）でオフセットを足さないでください。
- **記事のフロントマターのスキーマは `content.config.ts`** で定義しています。項目を増やすときはここから。
- **Markdown の Obsidian 互換 callout** は `remark/obsidian-callout.mjs` と `app/components/content/Callout.vue` の組み合わせで実装しています。

## ドキュメント

| ドキュメント | 内容 |
| :--- | :--- |
| [docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md) | デザインの大方針。コンセプト、デザイントークン、レイアウト原則、UX要件。 |
| [docs/COMPONENT_SPEC.md](./docs/COMPONENT_SPEC.md) | コンポーネント定義。各コンポーネントの props、表示要件、インタラクション。 |
| [docs/ICON_GUIDELINE.md](./docs/ICON_GUIDELINE.md) | アイコン定義。`u/` モノグラムの仕様と、favicon 一式・OGP 画像の生成手順。 |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | フロントエンド設計原則。**このリポジトリには未適用**で、これから寄せていく先。 |
| [docs/rules/](./docs/rules/) | 上記から導かれる個別の規約。同じく**未適用**で、強制する lint も未導入。 |

UI を変更したら、該当するドキュメントも併せて更新してください。**実装が正**です。

`docs/ARCHITECTURE.md` と `docs/rules/` は現行のコードベースの説明ではありません。実装や指摘の根拠にせず、寄せる作業を明示的に依頼されたときだけ参照してください。
