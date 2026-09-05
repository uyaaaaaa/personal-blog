---
paths:
  - "app/**/*.vue"
  - "app/**/*.css"
  - "theme/**"
  - "tailwind.config.ts"
---

# スタイルのルール

色・フォント・サイズの値は `theme/tokens.ts`、大方針と根拠は [docs/DESIGN_GUIDELINE.md](../../docs/DESIGN_GUIDELINE.md)。ここには判断だけを書く。

- **色・フォントは `theme/tokens.ts` が単一情報源。** コンポーネントにはトークン由来のクラスか CSS 変数で書き、直値はガイドラインが例外として挙げているものだけにする。
- **ダークテーマはトークンの再定義で成立させる。** `dark:` を書くのはテーマで DOM を出し分ける場合だけで、色の分岐には使わない。
- **サイズは Tailwind のスケールか `theme/tokens.ts` の `sizes` の名前で書く。** スケールに無い値が要るなら、先に `sizes` へ名前を足してから使う。
- **ブレークポイントは Tailwind の `md:` と `lg:` だけ。** scoped CSS に独自の境界値を書かない。表示・非表示の切り替えもクラスで行う。
- **`prefers-reduced-motion` を参照しない。** 意図的な判断なので、`@media` も `matchMedia` も置かない。トランジションの長さはガイドラインの段階から選ぶ。
- **ページ内リンクの着地位置は CSS で一元管理する。** JS 側でオフセットを足さない。
- **コードブロックの見た目は `app/components/content/ProsePre.vue` が持つ。** `tailwind.config.ts` の `typography` 拡張で `pre` を触らない。
- **`!important` を書かない。** 第三者由来のインラインスタイルを打ち消す場合だけ許し、理由を残す。
