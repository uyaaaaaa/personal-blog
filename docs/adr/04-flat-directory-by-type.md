# ディレクトリは型別のフラット構成を維持する

`app/` 直下を `components` / `composables` / `utils` で分け、`features/<name>/` のような機能単位の分割はしない。

- **検討した案**: 機能単位（`features/article/`, `features/navigation/`）。退避した汎用規約の前提だった（[#105](https://github.com/uyaaaaaa/personal-blog/issues/105)）。1人で保守する静的サイトでは、feature 分割で得られる「削除可能性」より、ディレクトリとファイルが増えるコストのほうが大きい。
- **対価**: 領域の境界がディレクトリ名（`components/layout/` 等）でしか表現されない。依存方向は `pages → components → composables → utils` の一方向で守る。
- **戻す条件**: 同じ領域のファイルが `components` / `composables` / `utils` の3箇所に跨って増え、1つの変更で常に3ディレクトリを触るようになったとき。目安は同一領域のファイルが8を超えたら。
