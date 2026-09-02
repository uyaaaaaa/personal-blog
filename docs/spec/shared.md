# 共有ロジック

コンポーネント間で再利用する composable / utility（`app/composables/` `app/utils/`）。表示要件を実現する挙動の実体です。

ページ内リンクの着地位置（`scroll-margin-top`）は composable ではなく CSS で決めている。→ [article-detail.md](./article-detail.md#ページ内リンクの着地位置)

---

| 名前 | ファイル | 役割 |
| :--- | :--- | :--- |
| `useTocActive(links, offset)` | `app/composables/useTocActive.ts` | 現在読んでいる見出しのIDを追跡する。ビューポート上端から `offset` px を最後に通過した見出しを採用。**ページ最下部では最後の見出しを強制的にアクティブ**にする。既定 `offset` は `140`（`Toc` は `100`、`TocMobile` は `140` を渡す） |
| `useScrollDirection(threshold)` | `app/composables/useScrollDirection.ts` | スクロール方向（`'up'` / `'down'`）を追跡する。`threshold`（既定 `8px`）未満の移動は無視してちらつきを防ぐ。iOSのラバーバンドで負値になるため `scrollY` を0でクランプする。**プログラムスクロール中は方向によらず `'down'` を返す** |
| `useScrollTo()` | `app/composables/useScrollTo.ts` | JSからのスクロールをまとめる。`scrollTo(id)` は指定IDへ `scrollIntoView` でスクロールし、`history.pushState` で**ジャンプせずにURLハッシュを更新**する。**オフセットは受け取らない**（着地位置は `scroll-margin-top` が決める）。`scrollToTop()` はページ先頭へスクロールする。`clearHash()` は `history.replaceState` で**ハッシュを取り除いたURLに戻す**（履歴を増やさないため、戻る操作は記事の1つ前へ抜ける）。スクロールと履歴操作を別の関数に分けているのは、ハッシュを消したいのが `ScrollToTopButton` だけのため。**`behavior: 'smooth'` は常に指定する**（`prefers-reduced-motion` は参照しない → [DESIGN_GUIDELINE.md](../DESIGN_GUIDELINE.md) の 2-D） |
| `isProgrammaticScroll` / `beginProgrammaticScroll()` | `app/composables/useProgrammaticScroll.ts` | 「いま起きているスクロールをプログラムが起こしたか」を表す共有 `ref` と、それを立てる関数。スクロールイベントが `150ms` 止まったら終了とみなす（`scrollend` は Safari の対応が新しいためデバウンスで代用）。**生産側**は `useScrollTo` の各関数と、ブラウザ標準のフラグメント遷移（脚注）を乗せるために直接呼ぶ `[_slug].vue`。**消費側**は `useScrollDirection` と `TocMobile`。「スクロールさせること」とは別の関心事なので `useScrollTo` から切り出している |
| `useArticleTags()` | `app/composables/useArticleTags.ts` | 公開記事のフロントマターからタグを集計し、`{ name, slug, count }` を**記事数の降順（同数なら名前順）**で返す |
| `usePagination(items, perPage)` | `app/composables/usePagination.ts` | 一覧を1ページ `ARTICLES_PER_PAGE`（既定 `9`）件に区切る。現在ページは `route.params.page` からの `computed`（無ければ1）で、状態を別に持たない。`2` のような正の整数の表記だけを受け付け、範囲外のページ番号・`/page/1`・`2.0` のような別表記は404にする（`basePath` が剥がせる形とページ番号として認める形を一致させるため）。`basePath` はページ番号を除いた一覧のパスで、`Pagination` のリンク組み立てに渡す |
| `usePageSeo(input)` | `app/composables/usePageSeo.ts` | title / description と OGP・Twitter Card のメタタグをまとめて出力する。title は `<ページ名> \| Tech Blog`（省略時はサイト名のみ）、description は空ならサイト共通の説明文にフォールバックする。`og:image` は記事の `image`、無ければ `/ogp.png`。`og:image` と `og:url` は `runtimeConfig.public.siteUrl` を基準に絶対URL化する。`type: 'article'` のときだけ `article:published_time` / `article:tag` を出す（→ [ICON_GUIDELINE.md](../ICON_GUIDELINE.md)） |
| `formatDate(date)` | `app/utils/date.ts` | 日付を `YYYY.MM.DD` 形式に整形する（`ja-JP` ロケール / ゼロ埋め / ドット区切り）。空値は空文字を返す |
| `formatRelativeDate(date, now)` | `app/utils/date.ts` | 記事の日付を **GitHub の表記に合わせて**整形する。直近30日（`RELATIVE_DATE_MAX_DAYS`）は相対表記、それより古いものは月日の絶対表記に切り替える。日単位で比較するため、時刻ではなく**その日の0時同士**を突き合わせる。`now` を引数で受け取るのは、**静的生成でビルド時刻が焼き付くのを避ける**ため（呼び出し側が `onMounted` で `Date.now()` を渡す。`null` の間は年つきの絶対表記を返す。パネルもドロワーも初期状態は閉じているので、切り替わりは画面に出ない）<br><br>`today` / `1d ago`〜`6d ago` / `1w ago`〜`4w ago` / `Feb 18`（同じ年）/ `Feb 18, 2025`（別の年）|
| `tagToSlug(tag)` | `app/utils/tag.ts` | タグ名をURLセーフなスラグに変換する。小文字化し、英数字以外の連続を `-` に置換、前後の `-` を除去（例: `@nuxt/content` → `nuxt-content`） |
| `CATEGORY_LABELS` / `CATEGORIES` / `isCategory(value)` | `app/utils/category.ts` | カテゴリの正本。`content.config.ts` の `z.enum` と同じキーを持ち、表示名（`Blog` / `Books`）と TOP の棚の並び順を定義する。`isCategory` はルートパラメータの検証に使う |
