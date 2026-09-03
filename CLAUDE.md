# CLAUDE.md

Nuxt 4 + Nuxt Content 3 で構築した個人技術ブログ。Cloudflare Pages に静的生成でデプロイしています。
プロジェクトの全体像・記事の書き方・プレビュー環境については [README.md](./README.md) を参照してください。

## コマンド

```sh
npm run dev       # 開発サーバー
npm run build     # 本番ビルド
npm run generate  # 静的生成
npm run preview   # ビルド結果のプレビュー
```

テストランナーと Lint は未導入です。変更の確認は `npm run build` が通ることと、開発サーバーでの目視で行います。

## ルールとスキル

コーディングルールは `.claude/rules/` にあり、対象ファイルを触るときに自動で読み込まれます。

| ファイル | 範囲 |
| :--- | :--- |
| `comment.md` | コメントを書かない方針と、書いてよい例外 |
| `style.md` | トークン経由の色指定、ブレークポイント、モーション、着地位置 |
| `imports.md` | 自作モジュールの明示 import と依存方向 |
| `structure.md` | composable / utils の判定、データ取得の場所、URL 状態 |
| `docs.md` | UI を変えたら spec を直す義務と、理由の置き場 |

手順は `.claude/skills/` にあります。UI の追加・変更は `ui-change`、記事の執筆・レビューは `article`。

## ドキュメント

**実装が正**です。UI や構造を変えたら、該当するドキュメントを同じ変更で更新してください。

| ドキュメント | 内容 |
| :--- | :--- |
| [docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md) | デザインの大方針。コンセプト、デザイントークン、レイアウト原則、UX要件、既知の課題。 |
| [docs/spec/](./docs/spec/README.md) | コンポーネント定義。画面・機能ごとに1ファイルで、props、表示要件、インタラクション、実装から読み取れない理由。 |
| [docs/ICON_GUIDELINE.md](./docs/ICON_GUIDELINE.md) | アイコン定義。`u/` モノグラムの仕様と、favicon 一式・OGP 画像の生成手順。 |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 現状の構造、依存方向、データとスタイルの流れ、強制手段の状態。 |
