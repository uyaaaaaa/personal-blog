# エラー

全画面エラー（`app/error.vue` → `app/components/error/`）と、記事詳細のページ内カード（`ArticleFallback`）。2系統の使い分けは [ArticleFallback](#articlefallback) の冒頭に書いてある。

---

## ErrorView

`app/components/error/ErrorView.vue`

エラーページの見た目とボタン挙動の実体。`NotFound` / `Server` は文言を渡すだけのラッパーで、
スタイルはこのコンポーネントだけが持つ。

**Props**

| 名前 | 型 | 説明 |
| :--- | :--- | :--- |
| `code` | `number \| string` | 大きく表示するエラーコード |
| `message` | `string` | 見出しの一文 |
| `description` | `string` | 補足の説明文 |

**表示要件**

中央寄せの縦積み。最小高 `60vh` / 最大幅 `600px`。色とフォントはデザイントークン
（`--color-main` / `--color-sub` / `--font-sans` / `--font-mono` / `--color-accent` / `--color-accent-hover` / `--color-accent-contrast`）を参照する。

| 要素 | 要件 |
| :--- | :--- |
| エラーコード | `8rem` / `700` / 等幅フォント / 字間 `-5px` / `line-height: 1` |
| メッセージ | `2rem` / `600` |
| 説明文 | `1rem` / サブテキスト色 / `line-height: 1.6` |
| ボタン | `Back to Top`。背景はアクセント色、ホバーで `--color-accent-hover`。押下で `clearError({ redirect: '/' })` を実行しトップへ戻す |

---

## NotFound / Server

`app/components/error/NotFound.vue` / `app/components/error/Server.vue`
（`app/error.vue` が `statusCode === 404` で振り分ける）

`ErrorView` に文言を渡すだけのコンポーネント。

| コンポーネント | Props | `ErrorView` へ渡す値 |
| :--- | :--- | :--- |
| `NotFound` | — | `404` / `Page Not Found` / 該当ページが存在しない旨の説明 |
| `Server` | `statusCode: number` | `statusCode` / `An Error Occurred` / 時間をおいて再試行する旨の説明 |

---

## ArticleFallback

`app/components/article/ArticleFallback.vue`

記事詳細ページで本文を表示できないときに、本文の代わりに出すカード。
`app/error.vue` 経由の全画面エラーとは別物で、**ヘッダー・フッターを保ったままページ内に留まる**。

サイトには「全画面エラー（`ErrorView`）」と「ページ内カード（本コンポーネント）」の2系統がある。
記事詳細は読者が続きを選べるよう後者を使い、`/tags/[tag]` の0件など**そのページ自体が成立しない場合**は
前者へ送る。文言はどちらも英語に統一する。

**Props**

| 名前 | 型 | 説明 |
| :--- | :--- | :--- |
| `variant` | `'error' \| 'not-found'` | `error`: 取得に失敗した / `not-found`: 取得できたが記事が存在しない |
| `path` | `string` | 開いていたURL。`not-found` のときだけ表示する |
| `pending` | `boolean` | 再試行の実行中。ページ側が `useAsyncData` の `status === 'pending'` を渡す |

**Emits**

| 名前 | 説明 |
| :--- | :--- |
| `retry` | `variant="error"` の再試行ボタン押下。ページ側で `useAsyncData` の `refresh()` を呼ぶ |

**状態の切り分け**

判定はページ側（`app/pages/article/[_slug].vue`）が持つ。`error` を捨てると通信失敗と記事なしが
同じ `null` に潰れて誤った文言を出すため、必ず両方を受け取って区別する。

| 条件 | 表示 | HTTPステータス |
| :--- | :--- | :--- |
| `data` あり | 記事本文 | 200 |
| `status` が `error` | `ArticleFallback variant="error"` | 500 |
| `status` が `success` かつ `data` なし | `ArticleFallback variant="not-found"` | 404 |
| 取得が未確定（`pending` / `idle`） | **何も出さない** | — |

**確定するまでカードを出さない。** Cloudflare 上の SSR は `@nuxt/content` のクエリが失敗しうる
（→ 記事「Nuxt Contentの記事がSSR時に取得できない問題とその解決策」）。この失敗はクライアントの
再取得で復帰するため、確定前にカードを描画すると「一瞬エラー/404 → 記事」というちらつきになる。

**パスは末尾スラッシュを落として揃える。** Cloudflare Pages は `/article/foo` を `/article/foo/` へ
リダイレクトするが、記事のパスとプリレンダ済みペイロードのキーは末尾スラッシュを持たない。
`route.path` をそのまま使うとハイドレーション時にクエリが一致せず、記事があるのに404と判定される。

**表示要件**

| 要素 | 要件 |
| :--- | :--- |
| 幅 | 本文と同じ `max-w-3xl`(768px) に揃え、中央寄せにする。サイドバーが無いぶんコンテナ幅いっぱいに広げない |
| カード | 破線1px（`border-dashed` / ボーダー色）+ カード角丸 `10px` + サーフェス色背景。中央寄せの縦積み |
| 見出し | `text-xl` / `700` / メイン色。`error` は `Unable to Load Article`、`not-found` は `Article Not Found` |
| パス表示 | `not-found` のみ。等幅フォント / `text-xs` / サブテキスト色 / 淡いサーフェス（`bg-surface-subtle`）の小角丸チップ |
| 説明文 | `text-sm` / サブテキスト色 / `max-w-sm` |
| 再試行ボタン | `error` のみ。背景はアクセント色、ホバーで `accent-hover`（`ErrorView` のボタンと同じ扱い）。文言は `Retry`。`pending` 中は `disabled` にし、`Retrying...` へ切り替えて不透明度を下げる |
| 戻る導線 | 末尾に `BackButton`（既定の `Back to Articles`） |
| 最近の記事 | `not-found` のみ。カード下に `Recent Articles` として最大3件を日付（等幅）+ タイトルの一覧で表示し、下線で区切る |

**アクセシビリティ**

上端のローディングバー（`NuxtLoadingIndicator`）はルート遷移にしか反応せず、`refresh()` では出ない。
そのため再試行の進行は**このコンポーネントが自前で示す**（ボタンの `disabled` と文言、`aria-busy`）。

| 項目 | 要件 |
| :--- | :--- |
| ライブリージョン | `variant="error"` のときカードを `role="status"` にする。再試行で内容が変わるため、変化を支援技術へ伝える |
| `aria-busy` | `variant="error"` のとき `pending` を反映する |

**最近の記事の取得**

`useLazyAsyncData` で取得し、本文側の描画をブロックしない。
`immediate` は `variant === 'not-found'` のときだけ `true` にする
（取得失敗時は同じ取得経路が不調なので、回遊導線を出さない）。

**SEO**

記事を表示できないページは `og:type` を `website` にし、`article` を名乗らせない
（`article:published_time` / `article:tag` も出さない）。
`not-found` のときは専用の `title`（`Article Not Found`）と `description` を設定する。
