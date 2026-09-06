# CLAUDE.md

Nuxt 4 + Nuxt Content 3 の個人技術ブログ。Cloudflare Pages に静的生成でデプロイしている。

## 進め方

依頼の型ごとの手順は `.claude/skills/` にあり、どの依頼で使うかは各スキルの description が持つ。

## ドキュメント

**実装が正**で、ドキュメントは原則書かない。残すのは方針レベルのものだけで、方針を変えたら同じ変更で直す。基準は `.claude/rules/docs.md`。

| いつ | 読む先 |
| :--- | :--- |
| 方針を覆すとき / 方針レベルの判断を記録するとき | [docs/DECISIONS.md](./docs/DECISIONS.md)（ADR の索引） |
| デザインの判断に迷ったとき | [docs/DESIGN_GUIDELINE.md](./docs/DESIGN_GUIDELINE.md) |
| 構造・依存方向・検査の置き場を変えるとき | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| favicon / OGP を作り直すとき | [docs/ICON_GUIDELINE.md](./docs/ICON_GUIDELINE.md) |
