# 記事一覧

TOP ページと一覧ページ（`/article` `/tags/[tag]` `/category/[category]`）で記事を並べる部品。`Hero.vue` `ArticleList.vue` と `app/components/article/` の一覧系、`common/Pagination.vue` に対応する。

一覧のグリッドや棚の全体ルールは [DESIGN_GUIDELINE.md](../DESIGN_GUIDELINE.md) の 3-C / 3-D を参照。

---

## Hero

`app/components/Hero.vue`

トップページ最上部のピックアップ記事。最新1件を大きく見せる。

**Props**

| 名前 | 型 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `article` | `{ path, title, description, date, tags?, image?, emoji? }` | ✓ | 表示する記事 |

**表示要件**

| 項目 | 要件 |
| :--- | :--- |
| 枠 | サーフェス色背景 / 1pxボーダー / カード角丸(`10px`) / `overflow: hidden` |
| レイアウト | SPは縦積み、`lg` 以上で左右2分割（サムネイル / コンテンツ） |
| サムネイル | 高さ SP `10rem` / lg以上は `min-height: 230px` で追従。背景はサブサーフェス色。 |
| サムネイルの中身 | `image` があれば `object-cover` の画像、なければ**絵文字を大きく表示**（`text-7xl`〜`8xl`、既定 `📝`） |
| コンテンツ余白 | SP `1.25rem` / lg以上 `2.5rem` |

**コンテンツの構成（上から）**

1. `PICKUP` ラベル（アクセント色 / 等幅 / 太字 / 字間広め）+ 先頭タグ1件（アクセント色の枠線チップ）+ 日付（サブテキスト色 / 等幅）
2. タイトル（`h2` / SP `1.25rem`・lg `1.875rem` / 太字）
3. 説明文（サブテキスト色 / `0.875rem` / SP 2行・lg 3行でクランプ）
4. `more` + 細い右矢印（等幅 / `0.75rem` / 字間広め / サブテキスト色）。テキストのみで、背景も枠線も持たない

**インタラクション**

カード全体がクリック可能（`navigateTo`）。ホバー時に以下が同時に起きる。

- 影が `shadow-md` に変化（`300ms`）
- 画像は `scale-105`（`500ms`）/ 絵文字は `scale-110`（`300ms`）
- タイトルがアクセント色に変化
- `more` がメインテキスト色に変化し、矢印が右に `translate-x-1` 移動（`200ms`）

---

## ArticleShelf

`app/components/article/ArticleShelf.vue`

TOPページで、1カテゴリ分の記事を横並びに見せる棚。見出し・`View All` 導線と、カードの列で構成する。

**Props**

| 名前 | 型 | 説明 |
| :--- | :--- | :--- |
| `title` | `string` | 棚の見出し（カテゴリの表示名） |
| `articles` | `Array<{ path, title, date, emoji?, tags? }>` | 並べる記事。上限の適用は呼び出し側 |
| `total` | `number` | そのカテゴリの公開記事の総数。`View All` を出すかどうかの判定にだけ使い、画面には出さない |
| `viewAllPath` | `string` | `View All` の遷移先 |

**表示要件**

| 項目 | 要件 |
| :--- | :--- |
| 見出し | `h2` / 等幅 / 太字 / `1.5rem`。見出し自体が `viewAllPath` へのリンクで、ホバーでアクセント色になる |
| `View All` | 見出しの右端。アクセント色・太字。ホバーで矢印が `translate-x-2`。**棚に出ていない記事が無いとき（`total <= articles.length`）は出さない** |
| **〜1023px** | 横スクロールの列。カード幅 `264px` 固定、ギャップ `1rem`。左右 `-1rem` のネガティブマージンで画面端まで抜き、内側に `1rem` のパディングを戻す |
| **1024px〜** | 4カラムのグリッド（ギャップ `1.5rem`）に切り替え、横スクロールを解除。5件目以降は `lg:hidden` で落とす |

**スクロールの挙動（〜1023px）**

- `scroll-snap-type: x mandatory` + カードの `snap-start` でカード単位にスナップする。
- スナップ位置は**パディングボックス基準**で決まるため、`scroll-padding-left` を左パディングと同じ `1rem` に合わせる。これが無いと、初期表示でコンテナのパディングが無視され、先頭カードだけが画面端に張り付いて見出しと揃わない。

**取得件数との関係**

呼び出し側は常に6件を渡し、1024px以上では5・6件目をCSSで落とす。ビューポート幅で取得件数を変えると静的生成できないため、DOMには2枚多く残る。

**カテゴリページへの導線**

`View All` は棚に収まりきらない記事があるときだけ出すため、全件が棚に出ているカテゴリでは消える。導線が無くならないよう、見出し自体を同じ `viewAllPath` へのリンクにしている。

---

## ArticleList

`app/components/ArticleList.vue`

記事カードを並べるグリッド。

**Props**

| 名前 | 型 | 説明 |
| :--- | :--- | :--- |
| `articles` | `Array<{ path, title, date, emoji?, tags? }>` | 表示する記事の配列 |

**表示要件**

- `1カラム` → `md: 2カラム` → `lg: 3カラム`
- ギャップ `1rem`（SP）/ `1.5rem`（md以上）

**使用箇所**

記事一覧のグリッドは本コンポーネントに集約しています。`AllArticles.vue`・`TagArticles.vue`・`CategoryArticles.vue` はいずれも `articles` を渡すだけで、`ArticleCard` へのマッピングは本コンポーネントが行います。TOPページはグリッドではなく `ArticleShelf` を使います。

---

## ArticleCard

`app/components/article/ArticleCard.vue`

一覧に並ぶ記事カード。カード全体が記事へのリンク。

**Props**

| 名前 | 型 | 既定値 | 説明 |
| :--- | :--- | :--- | :--- |
| `title` | `string` | — | 記事タイトル（必須） |
| `path` | `string` | — | 遷移先パス（必須） |
| `date` | `string` | `''` | 公開日 |
| `emoji` | `string` | `'📝'` | サムネイル代わりの絵文字 |
| `tags` | `string[]` | `[]` | タグ |

**表示要件**

| 項目 | 要件 |
| :--- | :--- |
| 枠 | サーフェス色背景 / 1pxボーダー / カード角丸(`10px`) / パディング `1rem`（SP）・`1.25rem`（md以上） |
| 構造 | 縦フレックス、要素間 `0.75rem` |
| **上段** | 左に `48px` の絵文字タイル（サブサーフェス色 / `rounded-lg` / 絵文字 `28px`）、右に日付（サブテキスト色 / 等幅 / `0.875rem`） |
| **中段** | タイトル（`h3` / `1rem` / 太字 / 2行でクランプ）。`min-height: 2.6em` で**カードの高さを揃える** |
| **下段** | タグチップ（`0.75rem` / アクセント色の枠線と文字 / 等幅 / サーフェス色背景 / 小角丸）。`mt-auto` で下端に固定 |

**インタラクション**

ホバーで枠線とタイトルがアクセント色になり、`shadow-sm` が付く（`200ms`）。

**日付の形式**

`formatDate()` により `YYYY.MM.DD`（ゼロ埋め・ドット区切り）で表示する。

---

## Pagination

`app/components/common/Pagination.vue`

記事一覧を9件ずつに区切るページャ。`AllArticles.vue`・`TagArticles.vue`・`CategoryArticles.vue` で使う。

**Props**

| 名前 | 型 | 説明 |
| :--- | :--- | :--- |
| `page` | `number` | 現在のページ（1始まり） |
| `totalPages` | `number` | 総ページ数 |
| `basePath` | `string` | ページ番号を除いた一覧のパス（`/article` など）。リンクの組み立てに使う |

**表示要件**

| 項目 | 要件 |
| :--- | :--- |
| 表示条件 | `totalPages` が1のときは何も出さない |
| 並び | 中央寄せ、要素間 `0.5rem`。前へ（`<`）/ ページ番号 / 次へ（`>`）|
| ボタン | 最小幅 `2.25rem` / 高さ `2.25rem` / 1pxボーダー / 小角丸 / サーフェス色背景 / 等幅 / `0.875rem` |
| 現在のページ | ボーダーと文字がアクセント色。`aria-current="page"` を付け、リンクにしない |
| 前後の矢印 | lucide の chevron（18px / `stroke-width: 2`）。BackButton と同じ線のアイコン |
| 端のページ | 進めない側の矢印はリンクにせず、サブテキスト色にする |
| ホバー | リンクのみボーダーと文字がアクセント色（`200ms`） |
| 省略 | ページが多いときは先頭・末尾・現在の前後1ページだけを残し、間を `…` で畳む |

**ページの持ち方**

ページ番号はパスで持ちます（`/article/page/2`）。1ページ目は `/page/1` を持たず、`basePath` そのものへリンクします。

パスで持つことで2ページ目以降もプリレンダの対象になり、`crawlLinks` がページャのリンクを辿って生成します。これは表示だけの都合ではなく**到達性の問題**で、クエリ方式では2ページ目以降が静的生成されず、そこにしか載っていない記事へのリンクがどのHTMLにも現れませんでした（`tags` は任意項目なので、タグの無い記事は完全に孤立し得ます）。

ページ番号はURLだけが持ち、`usePagination` は `route.params.page` から `computed` で導きます。SSRとクライアントの結果が一致するため、ハイドレーションの遅延も先頭へのスクロール処理も要りません（パスが変わるのでルーターが先頭へ戻します）。範囲外のページ番号と `/page/1` は404にします。

1ページ目と2ページ目以降は同じ画面なので、実体を1つのコンポーネントに置き、ルートファイルはそれを描画するだけにしています。

| 画面 | 実体 | ルートファイル |
| :--- | :--- | :--- |
| 全記事 | `app/components/article/AllArticles.vue` | `article/index.vue` / `article/page/[page].vue` |
| タグ絞り込み | `app/components/article/TagArticles.vue` | `tags/[tag]/index.vue` / `tags/[tag]/page/[page].vue` |
| カテゴリ絞り込み | `app/components/article/CategoryArticles.vue` | `category/[category]/index.vue` / `category/[category]/page/[page].vue` |
