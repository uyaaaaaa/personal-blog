# コードブロックの表示を `ProsePre.vue` に集約する

コードブロック（`pre`）の枠・ラベルバー・行のスタイルは `app/components/content/ProsePre.vue` が持ち、`tailwind.config.ts` の `typography` 拡張は `pre` に触らない。ビルド時の印付け（diff の行）は `app/mdc.config.ts`、色は `theme/tokens.ts`。

- **検討した案**: MDC 既定の `ProsePre` のまま、`typography` 拡張の `pre` にラベルや diff のスタイルを足す。ラベルは `pre` の中に別要素を置けず（内容モデルが phrasing content）不可能で、diff の行背景も `:where()` で包まれる `typography` 側からは Nuxt Content の `html .shiki span` に特異度で負け、`--shiki-*-bg` 変数への値渡しと `pre.language-diff` 限定のパディング移動で回避することになる（[#114](https://github.com/uyaaaaaa/personal-blog/pull/114)）。コードブロックの見た目が typography 拡張・MDC 既定・回避策の3箇所に散る。
- **対価**: `app/components/content/` の auto-import 例外に乗るコンポーネントが1つ増える。MDC の既定（`pre code .line { display: block }` など）を自前で持ち直す必要があり、MDC 側の変更に追従する責任を負う。
- **戻す条件**: Nuxt Content / MDC の既定 `ProsePre` が `filename` を描画するようになり、行のスタイルを差し込む口を持ったとき。
