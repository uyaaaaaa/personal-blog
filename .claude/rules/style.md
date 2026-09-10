---
paths:
  - "app/**/*.vue"
  - "app/**/*.css"
  - "theme/**"
  - "tailwind.config.ts"
---

# スタイルのルール

色・フォント・サイズの値は `theme/tokens.ts`、大方針と根拠は [docs/DESIGN_GUIDELINE.md](../../docs/DESIGN_GUIDELINE.md)。ここには判断だけを書く。

- **色・フォントは `theme/tokens.ts` が単一情報源。**
- **表示・非表示の切り替えはクラスで行う。** scoped CSS の `display` で出し分けない。
- **ページ内リンクの着地位置は CSS で一元管理する。** JS 側でオフセットを足さない。
