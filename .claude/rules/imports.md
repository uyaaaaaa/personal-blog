---
paths:
  - "app/**"
---

# import と依存のルール

Nuxt の auto-import は有効のまま使う。ただし**自作モジュール間の依存は必ず `import` 文に現れる**ようにする。
依存グラフに現れない依存があると、次に入れる循環検出・依存方向の lint が無言で無効になる（[docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)）。

- **自作の components / composables / utils は明示 import する。** パスは `~/components/...` のように `~/` で書く。同じディレクトリ内だけ `./`。`@/` と `../` は使わない。
- **Nuxt / Vue の組み込み（`ref` `computed` `watch` `useRoute` `useAsyncData` `queryCollection` `createError` `useHead` など）は auto-import に任せ、書かない。**
- **`theme/tokens.ts` は `~~/theme/tokens` で参照する**（`app/` の外にあるため）。
- **barrel file（再エクスポートだけの `index.ts`）を作らない。**
- **循環依存を作らない。** 型だけの依存は `import type` にする。
- **置き場**: 表示だけの部品は `app/components/<領域>/`（`layout` `article` `content` `common` `error`）、reactive / lifecycle を使う共有ロジックは `app/composables/`、純粋関数は `app/utils/`。

置き場の判定は [structure.md](./structure.md)。
