# エラー

## 2系統の使い分け

- **全画面エラー（`ErrorView`）とページ内カード（`ArticleFallback`）の2系統を持つ。** 記事詳細は読者が続きを選べるよう後者を使い、`/tags/[tag]` の0件のようにそのページ自体が成立しない場合は前者へ送る。文言はどちらも英語（DESIGN_GUIDELINE 5 の UI 文言）。
- **スタイルは `ErrorView` だけが持ち、`NotFound` / `Server` は文言を渡すラッパー。**

## ArticleFallback

- **確定するまで出さない・失敗と記事なしを区別する。** 理由は[構造に関わる判断](../adr/06-article-detail-fetch-states.md)。
- **パスは末尾スラッシュを落として揃える。** Cloudflare Pages は `/article/foo` を `/article/foo/` へリダイレクトするが、記事のパスとプリレンダ済みペイロードのキーは末尾スラッシュを持たない。`route.path` をそのまま使うとハイドレーション時にクエリが一致せず、記事があるのに404と判定される。
- **再試行の進行はこのコンポーネントが自前で示す（`disabled`、文言、`aria-busy`、`role="status"`）。** 上端のローディングバー（`NuxtLoadingIndicator`）はルート遷移にしか反応せず、`refresh()` では出ない。
- **最近の記事は `not-found` のときだけ取得する。** 取得失敗時は同じ取得経路が不調なので回遊導線を出さない。`useLazyAsyncData` で本文側の描画をブロックしない。
- **記事を表示できないページは `og:type` を `website` にし、`article` を名乗らせない。**
