# CLAUDE.md

Nuxt 4 + Nuxt Content 3 で構築した個人技術ブログ。Cloudflare Pages に静的生成でデプロイしています。

## コマンド

```sh
npm run dev       # 開発サーバー
npm run build     # 本番ビルド
npm run generate  # 静的生成
npm run preview   # ビルド結果のプレビュー
npm run format    # Prettier で整形
npm run lint      # Prettier(--check) + ESLint + dependency-cruiser + タグの検査。落ちたら npm run format
npm test          # Vitest。テストがあるのは app/utils/ の純粋関数だけ
```

UI と生成物は自動テストで守れないため、`npm run lint` と `npm run build` が通ることと、開発サーバーでの目視でしか確認できません。
lint / テスト / CI の内訳は [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md#強制手段の現状)。

## 進め方

手順は `.claude/skills/` にあります。

| 依頼 | スキル |
| :--- | :--- |
| 課題感を issue にする依頼 | `create-issues` |
| issue 番号のある依頼 | `assign` |
| UI・スタイルの追加変更、表示の不具合 | `ui-change` |
| 記事の執筆・レビュー | `article` |
| 変更を実測で確かめる | `verify` |
| PR を作る | `pr` |

コーディングルールは `.claude/rules/`（`comment` / `style` / `imports` / `structure` / `docs`）にあり、対象ファイルを触るときに自動で読み込まれます。

## ドキュメント

**実装が正**で、ドキュメントは原則書きません。残すのは方針レベルのものだけで、方針を変えたら同じ変更で直します。何を書き、何を書かないかは `.claude/rules/docs.md`。

| いつ | 読む先 |
| :--- | :--- |
| 方針を覆すとき / 方針レベルの判断を記録するとき | [docs/DECISIONS.md](./docs/DECISIONS.md)（ADR の索引） |
| トークン・レイアウト原則・UX 要件に触れるとき | [docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md) |
| 構造・依存方向・lint の範囲を変えるとき | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| favicon / OGP を作り直すとき | [docs/ICON_GUIDELINE.md](./docs/ICON_GUIDELINE.md) |
