---
paths:
  - "app/**"
---

# 置き場とデータの流れ

- **composable にするのは「reactive / lifecycle を使う」かつ「2箇所以上で使う」ロジックだけ。** どちらも満たさないなら、純粋関数は `app/utils/` へ、1箇所でしか使わないものはそのコンポーネント内に置く。抽出は2回目の使用時に行う。
- **composable は `useXxx` の名前で、state と関数だけを返す。** DOM を作らない。モジュールスコープに可変値を置くのは、クライアントでしか変化しない値（`useProgrammaticScroll`）に限り、spec にその旨を書く。
- **データ取得（`useAsyncData` + `queryCollection`）を呼ぶのはページと、ページの実体である一覧コンポーネント（`AllArticles` `TagArticles` `CategoryArticles`）だけ。** カード・棚・目次などの部品は props で受け取る。
- **記事のクエリは `where('published', '=', true)` と、必要なフィールドだけの `select()` を必ず付ける。** 一覧の並びは `date` の降順。
- **URL で持つべき状態（ページ番号、タグ、カテゴリ）は `route.params` から `computed` で導き、別の state に持たない。** 範囲外は `createError({ statusCode: 404, fatal: true })` で落とす。
- **カテゴリの正本は `content.config.ts` の `z.enum` と `app/utils/category.ts`。** 両方を同時に更新する。
- **スクロール・リサイズの購読は `useScrollFrame(read, enabled)` に集める。** `window.addEventListener('scroll', ...)` を直接書かない。`read` は他の `read` の書き込み結果に依存してはいけない（1フレーム内で続けて呼ばれる）。
- **`lg:` で非表示になるコンポーネントは、`useIsDesktop()` の `isDesktop` / `isMobile` を `enabled` に渡して購読を止める。** 表示の出し分けは Tailwind のままにし、`v-if` に置き換えない（SSR の HTML が変わる）。
- **1コンポーネント1ファイル。** ページのルートファイル（`pages/**/index.vue` と `page/[page].vue`）は実体コンポーネントを描画するだけにし、ロジックを持たせない。
