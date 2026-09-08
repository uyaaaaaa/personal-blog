# Tech Blog

個人の技術ブログです。Nuxt 4 + Nuxt Content 3 で Markdown 記事を管理し、Cloudflare Pages に静的生成でデプロイしています。

## 開発

```sh
npm install
npm run dev
```

コマンドの一覧は `package.json` の `scripts`、記事のフロントマターのスキーマは `content.schema.ts` にあります。

`npm install` で Git フック（`.githooks/`）が有効になり、commit のたびに `npm run lint` とコミットメッセージの形式の検査が走ります。テストはフックに載せていないので、ローカルでは手で打つか PR に任せます。整形で落ちたときは `npm run format` を実行してから commit し直してください。整形の対象はコードだけで、記事と設計ドキュメントの Markdown は含みません。

Prettier 導入時の一括整形は独立した1コミットにしてあります。clone したら次を1回実行すると、`git blame` がそのコミットを飛ばします。

```sh
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## プレビュー環境

Cloudflare Pages の Git 連携が有効なため、Pull Request を作ると自動でプレビューがデプロイされます。リポジトリ側にワークフローの設定は不要です。PR では GitHub Actions の `Lint` と `Test` が並列に走ります（build は Actions では回しません）。

ビルド完了後、Cloudflare のボットが2種類の URL をコメントします。

| 種類 | 形式 | 性質 |
| :--- | :--- | :--- |
| デプロイ単位 | `https://<デプロイID>.tech-blog-efb.pages.dev` | そのコミットに固定。後から push しても変わらない |
| ブランチ単位 | `https://<ブランチ名>.tech-blog-efb.pages.dev` | 常にそのブランチの最新コミットを指す |

ブランチ名の `/` は `-` に変換され、長い名前は 28 文字で切り詰められます。ブランチ単位の URL を人に渡すときは、ボットのコメントに出た実際の URL を使ってください。

プレビューは本番と同じ静的生成の出力を配信します。`main` にマージすると本番 <https://tech-blog-efb.pages.dev> に反映されます。

## ドキュメント

ドキュメントは原則書かず、方針を変えたときだけ該当する文書を同じ変更で直します（基準は [.claude/rules/docs.md](./.claude/rules/docs.md)）。

| ドキュメント | 内容 |
| :--- | :--- |
| [docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md) | デザインの判断基準。コンセプトと原則 |
| [docs/DECISIONS.md](./docs/DECISIONS.md) | ADR の索引。思想が反映され、簡単には変えられない判断だけを置く |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 層と依存方向・不変条件の全体図と、検査の置き場 |
| [docs/ICON_GUIDELINE.md](./docs/ICON_GUIDELINE.md) | `u/` モノグラムの仕様と、favicon 一式・OGP 画像の生成手順 |

コーディングルールは `.claude/rules/`、作業手順は `.claude/skills/` にあります。

## タスク管理

やることは [GitHub Issues](https://github.com/uyaaaaaa/personal-blog/issues) で管理しています。
