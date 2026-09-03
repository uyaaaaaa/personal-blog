---
paths:
  - "app/**/*.vue"
  - "app/**/*.css"
  - "theme/**"
  - "tailwind.config.ts"
---

# スタイルのルール

根拠と値の一覧は [docs/DESIGN_GUIDELINE.md](../../docs/DESIGN_GUIDELINE.md)。ここには判断だけを書く。

- **色・フォントは `theme/tokens.ts` が単一情報源。** コンポーネントには `text-main` `bg-surface` などのクラスか `var(--color-*)` で書く。hex や `rgba()` を直接書いてよいのは DESIGN_GUIDELINE 2-A の例外表にあるもの（白黒の透過、ロゴの SVG）だけ。
- **ダークテーマはトークンの再定義で成立させる。** `dark:` をコンポーネントに書くのは、テーマで DOM を出し分ける場合（ThemeToggle のアイコン、`dark:prose-invert`）に限る。色の分岐には使わない。
- **サイズの任意値（`w-[300px]` `rounded-[10px]` など）は DESIGN_GUIDELINE 2-D にある値だけ。** 新しい値が要るなら、まず 2-D に追加する。
- **ブレークポイントは Tailwind の `md:`（768px）と `lg:`（1024px）だけ。** scoped CSS に独自の境界値を書かない。表示・非表示の切り替えも `hidden md:flex` のようにクラスで行う。
- **`prefers-reduced-motion` を参照しない。** `@media` も `matchMedia` も置かない（意図的な判断。DESIGN_GUIDELINE 2-D）。トランジションは `200ms`（色・影）/ `300ms`（変形・開閉）/ `500ms`（画像）。
- **ページ内リンクの着地位置は `app/pages/article/[_slug].vue` の `scroll-margin-top` が決める。** JS 側でオフセットを足さない。
- **`!important` を書かない。** 第三者由来のインラインスタイルを打ち消す場合だけ許し、理由を spec に書く。
