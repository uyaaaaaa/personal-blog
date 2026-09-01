# Component Spec

各コンポーネントの**詳細要件**を定めるドキュメントです。
props、表示要件、状態とインタラクションを、実装単位で記述します。

サイト全体の大方針（コンセプト、デザイントークン、レイアウト原則）は **[DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md)** を参照してください。
本書に出てくる色名・サイズ名（アクセント、サブテキスト、カード角丸 など）は、すべてガイドラインで定義されたトークンを指します。

**実装が正**です。コンポーネントを変更した際は本書も併せて更新してください。

- 最終更新: 2026-08-31

---

## 目次

- [1. レイアウト](#1-レイアウト)
  - [Header](#header) / [HeaderNavigation](#headernavigation) / [Footer](#footer)
- [2. 記事表示](#2-記事表示)
  - [Hero](#hero) / [ArticleList](#articlelist) / [ArticleCard](#articlecard) / [Toc](#toc) / [TocMobile](#tocmobile) / [Sidebar](#sidebar) / [BackButton](#backbutton)
- [3. 記事本文（Markdown）](#3-記事本文markdown)
  - [Markdownスタイル](#markdownスタイル) / [Callout](#callout) / [脚注](#脚注) / [ProseA](#prosea)
- [4. エラー](#4-エラー)
  - [ErrorView](#errorview) / [NotFound / Server](#notfound--server) / [ArticleFallback](#articlefallback)
- [5. 共有ロジック](#5-共有ロジック)

---

## 1. レイアウト

### Header

`app/components/layout/Header.vue`

サイト全ページ共通のグローバルヘッダー。

**表示要件**

| 項目 | 要件 |
| :--- | :--- |
| 配置 | `position: sticky` / `top: 0` / `z-index: 100` |
| 高さ | `64px` 固定 |
| 背景 | `rgba(255, 255, 255, 0.9)` + `backdrop-filter: blur(10px)` |
| ボーダー | 下端に1px（ボーダー色） |
| 内側 | `.container`（最大1200px）で左右に振り分ける |

**構成要素**

| 要素 | 要件 |
| :--- | :--- |
| **ロゴ** | 左寄せ。`u/` モノグラムのインラインSVG（26px / 角丸タイル版）と `Tech Blog` のテキストを `0.5rem` の間隔で横並びにする。テキストは等幅フォント / `700` / `1.25rem` / 字間 `-0.5px`。クリックで `/` へ遷移し、モバイルメニューが開いていれば閉じる。`z-index: 102` でドロワーより前面に置く。マークの仕様は [ICON_GUIDELINE.md](./ICON_GUIDELINE.md) を参照。 |
| **検索ボックス** | 中央。`md` 以上でのみ表示（`hidden md:flex`）。最大幅 `28rem`。虫眼鏡アイコン + `Search...` を左、`Cmd+K` バッジを右に配置。ホバーで枠線とアイコンがアクセント色になる。**現状はUIのみで検索機能は未実装**（[#13](https://github.com/uyaaaaaa/personal-blog/issues/13) / [#15](https://github.com/uyaaaaaa/personal-blog/issues/15)）。 |
| **ナビゲーション** | 右寄せ。`HeaderNavigation` に委譲する。 |

**状態**

- `isMenuOpen`: モバイルメニューの開閉状態を保持する。
- メニューを開いている間は `document.body.style.overflow = 'hidden'` で背後のスクロールを固定し、閉じる際に必ず解除する。

---

### HeaderNavigation

`app/components/layout/HeaderNavigation.vue`

ヘッダー内のナビゲーション。デスクトップとモバイルで表示形態を切り替える。

**Props / Emits**

| 名前 | 型 | 説明 |
| :--- | :--- | :--- |
| `isOpen` | `boolean` | モバイルドロワーの開閉状態（親が保持） |
| `@toggle` | — | ハンバーガーボタン押下 |
| `@close` | — | オーバーレイ・リンク押下による閉じる要求 |

**メニュー項目**

`Articles` (`/article`) / `Tags` (`/tags`)。

**デスクトップ（`md` = 768px以上）**

- 右寄せに横並び。`font-weight: 500` / `0.95rem` / 項目間 `1.5rem`。
- ホバーでアクセントカラーに変化する。
- 表示の切り替えは Tailwind のブレークポイントで行う（デスクトップ: `hidden md:flex` / モバイル: `md:hidden`）。ヘッダー検索ボックスと同じ `md` 境界に揃える。

**モバイル（`md` 未満 = 767px以下）**

| 項目 | 要件 |
| :--- | :--- |
| **ハンバーガーボタン** | 3本線（`20 × 15px` / 線幅2px）。開くと上下の線が回転して×印になり、中央の線が消える（`300ms`）。`z-index: 102`。 |
| **オーバーレイ** | ヘッダー直下（`top: 64px`）から画面下端まで。`rgba(0, 0, 0, 0.5)`。タップで閉じる。`opacity` と `visibility` を `300ms` で遷移させる。`overflow: hidden` で画面外に退避したドロワーを切り取る（**外すとページ全体が横スクロールする**）。 |
| **ドロワー** | **右端からスライドイン**（`translateX(100%)` → `0`）。幅 `80%` / 最大 `320px`。背景白、左端に1pxボーダー。内容が多い場合は縦スクロールする。 |

**ドロワーの中身**

1. **ナビゲーションリンク** — `1.25rem` / `700` の縦並び。下端に区切りボーダー。
2. **Tags セクション** — 見出し `Tags`（`0.8rem` / 大文字 / 字間広め / サブテキスト色）。
   - 記事数の多い順に**上位10件**を表示（`TOP_TAGS_LIMIT = 10`）。
   - 各行はタグ名（等幅フォント）を左、記事数バッジ（枠線付きのピル）を右に配置。
   - ホバーで文字がアクセント色、背景が淡いサーフェス色になる。
   - 末尾に `View all tags →` を置き `/tags` へ誘導する。
3. リンクをタップしたら必ずドロワーを閉じる。

---

### Footer

`app/components/layout/Footer.vue`

**表示要件**

- 上端に1pxボーダー、上下パディング `2rem`、中央寄せ。
- サブテキスト色 / `0.9rem`。
- コピーライトとコンセプト文のみを表示し、リンクは持たない。

---

## 2. 記事表示

### Hero

`app/components/Hero.vue`

トップページ最上部のピックアップ記事。最新1件を大きく見せる。

**Props**

| 名前 | 型 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `article` | `{ path, title, description, date, tags?, image?, emoji? }` | ✓ | 表示する記事 |

**表示要件**

| 項目 | 要件 |
| :--- | :--- |
| 枠 | 白背景 / 1pxボーダー / カード角丸(`10px`) / `overflow: hidden` |
| レイアウト | SPは縦積み、`lg` 以上で左右2分割（サムネイル / コンテンツ） |
| サムネイル | 高さ SP `10rem` / lg以上は `min-height: 230px` で追従。背景はサブサーフェス色。 |
| サムネイルの中身 | `image` があれば `object-cover` の画像、なければ**絵文字を大きく表示**（`text-7xl`〜`8xl`、既定 `📝`） |
| コンテンツ余白 | SP `1.25rem` / lg以上 `2.5rem` |

**コンテンツの構成（上から）**

1. `PICKUP` ラベル（アクセント色 / 等幅 / 太字 / 字間広め）+ 先頭タグ1件（アクセント色の枠線チップ）+ 日付（サブテキスト色 / 等幅）
2. タイトル（`h2` / SP `1.25rem`・lg `1.875rem` / 太字）
3. 説明文（サブテキスト色 / `0.875rem` / SP 2行・lg 3行でクランプ）
4. `Read Article` + 右矢印アイコン（アクセント色 / 太字）

**インタラクション**

カード全体がクリック可能（`navigateTo`）。ホバー時に以下が同時に起きる。

- 影が `shadow-md` に変化（`300ms`）
- 画像は `scale-105`（`500ms`）/ 絵文字は `scale-110`（`300ms`）
- タイトルがアクセント色に変化
- `Read Article` の行が右に `translate-x-2` 移動（`200ms`）

---

### ArticleList

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

記事一覧のグリッドは本コンポーネントに集約しています。`index.vue`・`article/index.vue`・`tags/[tag].vue` はいずれも `articles` を渡すだけで、`ArticleCard` へのマッピングは本コンポーネントが行います。

---

### ArticleCard

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
| 枠 | 白背景 / 1pxボーダー / カード角丸(`10px`) / パディング `1rem`（SP）・`1.25rem`（md以上） |
| 構造 | 縦フレックス、要素間 `0.75rem` |
| **上段** | 左に `48px` の絵文字タイル（サブサーフェス色 / `rounded-lg` / 絵文字 `28px`）、右に日付（サブテキスト色 / 等幅 / `0.875rem`） |
| **中段** | タイトル（`h3` / `1rem` / 太字 / 2行でクランプ）。`min-height: 2.6em` で**カードの高さを揃える** |
| **下段** | タグチップ（`0.75rem` / アクセント色の枠線と文字 / 等幅 / 白背景 / 小角丸）。`mt-auto` で下端に固定 |

**インタラクション**

ホバーで枠線とタイトルがアクセント色になり、`shadow-sm` が付く（`200ms`）。

**日付の形式**

`formatDate()` により `YYYY.MM.DD`（ゼロ埋め・ドット区切り）で表示する。

---

### Toc

`app/components/article/Toc.vue`

PC版サイドバーに表示する目次。

**Props**

| 名前 | 型 | 説明 |
| :--- | :--- | :--- |
| `links` | `TocLink[]` | Nuxt Content が生成した目次データ（`children` に h3 を含む）。脚注セクションの `sr-only` 見出しは `[_slug].vue` の側で除外済み（→ [脚注](#脚注)） |

**表示要件**

| 項目 | 要件 |
| :--- | :--- |
| 見出し | `目次`（太字 / メイン文字色） |
| コネクタ線 | 項目リストの左端に縦線（幅2px / サブサーフェス色 / `-z-10`） |
| h2 項目 | `0.875rem` / 左パディング `1rem` / 左ボーダー2px。コネクタ線に重ねる |
| h3 項目 | h2 の下に入れ子。1段インデント / `0.75rem`。**左ボーダーは持たない**（コネクタ線から外れた位置に2本目の縦線が出るため） |
| 非アクティブ | サブテキスト色 / h2 の左ボーダーは透明 |
| **アクティブ** | アクセント色の文字 + `font-medium`。h2 はさらに左ボーダーがアクセント色になる |
| ホバー / フォーカス | アクセント色の文字。h2 はボーダーも変化する |

**スクロール挙動**

- 目次が長い場合、**サイドバー全体ではなく目次自身が内部スクロール**する（`overflow-y: auto` / `overscroll-contain`）。
- **縦だけをスクロールさせる。** `overflow-y` だけを指定すると `overflow-x` も `auto` に計算されるため、`overflow-x: hidden` を明示する。あわせて項目に `break-words` を与え、分割できない長い語（識別子・URLなど）を含む見出しも折り返す。
- スクロールバーは幅4pxの細いもの（`#d1d5db` / 角丸 / トラックは透明）。
- 読み進めてアクティブ項目がスクロール領域の外に出たら、**自動で領域の中央付近へ追従スクロール**する。
- 項目クリックで該当見出しへスムーズスクロール。**着地位置のオフセットはコンポーネント側では持たず**、記事本文の見出しに指定した `scroll-margin-top` が決める（→ [Markdownスタイル](#markdownスタイル)）。

---

### TocMobile

`app/components/article/TocMobile.vue`

SP版の目次。記事タイトル直下に置く sticky バー。`lg` 以上では非表示。

**Props**

`links`（`Toc` と同じ）

**表示要件**

| 項目 | 要件 |
| :--- | :--- |
| 配置 | `sticky` / `top: 74px` / `z-index: 40` |
| バー | サブサーフェス色 / 1pxボーダー / `rounded-lg`。`目次` ラベルとシェブロンを左右に配置 |
| sticky 到達時 | `shadow-sm` を付与 |
| ドロップダウン | バー直下に**オーバーレイ表示**（`absolute`）。白背景 / 影 / 下側だけ角丸。最大高 `60vh` |

**インタラクション**

| 挙動 | 要件 |
| :--- | :--- |
| 開閉 | バーのタップでトグル。シェブロンが180度回転（`200ms`） |
| **記事を押し下げない** | ドロップダウンは `absolute` のオーバーレイとし、本文レイアウトを変化させない |
| スクロール連動 | sticky 状態のとき、**下スクロールで隠れ（`-translate-y-[120px]` + `opacity-0`）、上スクロールで再表示**。開いている間は隠れない |
| ジャンプ中の挙動 | ページ内ジャンプ中は、**方向によらずバーを隠す**。上方向へジャンプした際にバーが現れて着地した見出しや脚注に被るのを防ぐ。`isVisible` が `isProgrammaticScroll` を直接見るため、目次・見出しのスクロール（`useScrollTo`）と脚注のフラグメント遷移（`beginProgrammaticScroll`）の両方で効く |
| 開いた時の位置合わせ | 開いた時点でアクティブな見出しが**領域の中央付近に来るよう内部スクロール**する |
| スクロール貫通の抑止 | `overscroll-contain` で、目次内のスクロールが端に達しても背後のページを動かさない |
| 横スクロールの抑止 | `Toc` と同じく `overflow-x: hidden` + 項目の `break-words` で、長い見出しがあっても横に伸びない |
| 閉じる | 背景（`rgba(0,0,0,0.2)`）のタップ、または項目のタップ |
| 項目タップ時のオフセット | **コンポーネント側では計算しない**。着地位置は見出しの `scroll-margin-top` が決める。ジャンプ中はバーが隠れるため、バーの高さを加味する必要がない |

**sticky 判定の注意**

隠れるアニメーション中は `translateY` がかかるため、`DOMMatrixReadOnly` で変換量を打ち消してから位置を判定する。

---

### Sidebar

`app/components/common/Sidebar.vue`

記事詳細ページの右カラム。`lg` 以上でのみ表示。

**表示要件**

- 幅 `300px` 固定（`flex-shrink-0`）。SPでは幅100%。
- `sticky top-24` / 最大高 `calc(100vh - 6rem)` / 下パディング `2rem`。
- 縦フレックスで要素間 `2rem`。

**スロット**

| 名前 | 用途 |
| :--- | :--- |
| `toc` | 目次。`min-h-0` を与え、**目次側だけが縮んで内部スクロール**するようにする（下のウィジェットが押し出されないため） |

**固定ウィジェット**

`Design Philosophy` ボックス（1pxボーダー / `rounded-lg` / パディング `1.5rem`）。見出しとコンセプト文を表示し、`flex-shrink-0` で縮まない。

---

### BackButton

`app/components/common/BackButton.vue`

記事詳細ページの戻る導線。記事本文の**上下両方**に配置する。

**Props**

| 名前 | 型 | 既定値 |
| :--- | :--- | :--- |
| `to` | `string \| object` | `'/article'` |
| `label` | `string` | `'Back to Articles'` |

**表示要件**

左矢印アイコン（18px）+ ラベル（`0.875rem` / サブテキスト色）。
ホバーで文字がアクセント色になり、**矢印が左に `-translate-x-1` 移動**する（`200ms`）。

---

## 3. 記事本文（Markdown）

### Markdownスタイル

`prose prose-slate` をベースに、`tailwind.config.ts` の `typography` 拡張で差分を上書きする。

| 要素 | 要件 |
| :--- | :--- |
| **見出し (H2, H3)** | `prose` の既定に準拠。本文中の `h2`〜`h6` は**クリックで該当位置へスクロール**する。カーソルは `pointer`。 |
| **コードブロック** | Nuxt Content のシンタックスハイライトを使用（テーマ **`github-light`**）。背景 `#F5F5F5` / 文字色 `#24292E` / 1pxボーダー。モバイルでは横スクロール。**行番号は表示しない**。 |
| **インラインコード** | Obsidian風。淡いサーフェス色 + 1pxボーダー + 小角丸。パディング 上下 `0.125rem` / 左右 `0.375rem`。`font-weight: 400`、文字色は周囲から継承。**バッククォート（`code::before` / `code::after`）は非表示**にする。 |
| **リンク** | アクセントカラーで表示し、ホバーでアンダーラインを付与。見出しは Nuxt Content が `<a>` で包むため対象外とし、見出しの色を継承したままホバーでのみアクセントカラーに変化する。 |
| **引用 (Blockquote)** | `prose` の既定に準拠。 |

**対応言語**

`js` `ts` `json` `html` `css` `vue` `shell` `sh` `bash` `md` `mdc` `yaml` `vim` `lua` `sql` `php`

新しい言語を使う場合は `nuxt.config.ts` の `content.build.markdown.highlight.langs` に追加すること。**追加を忘れるとハイライトが効かない。**

---

### Callout

`app/components/content/Callout.vue` / `remark/obsidian-callout.mjs`

Obsidian の `> [!TYPE]` 記法に対応した注釈ブロック。remark プラグインが記法を解析し、本コンポーネントが描画する。

**Props**

| 名前 | 型 | 説明 |
| :--- | :--- | :--- |
| `type` | `string?` | Callout の種類。省略時は `note` |
| `title` | `string?` | タイトル。省略時は**タイプ名の先頭を大文字にして表示**（Obsidianと同じ挙動） |
| `fold` | `string?` | `'-'` なら初期状態で閉、`'+'` なら初期状態で開。それ以外は折りたたみ不可 |

**表示要件**

| 項目 | 要件 |
| :--- | :--- |
| 枠 | `rounded-lg` / パディング `0.75rem` / 上下マージン `1.25rem` / `0.875rem` |
| 背景 | タイプ色の**10%不透明度**（`rgba(var(--callout-rgb), 0.1)`） |
| タイトル行 | タイプ色の実色 + 太字。左にアイコン（lucide のインラインSVG / 18px） |
| 本文 | 通常の文字色。`prose` 由来の余白は先頭・末尾で詰める |

**タイプと配色**

| 色 | RGB | タイプ |
| :--- | :--- | :--- |
| ブルー | `8, 109, 221` | `note` `info` `todo` |
| シアン | `0, 191, 188` | `abstract` `tip` |
| グリーン | `8, 185, 78` | `success` |
| オレンジ | `236, 117, 0` | `question` `warning` |
| レッド | `233, 49, 71` | `failure` `danger` `bug` |
| パープル | `120, 82, 238` | `example` |
| グレー | `158, 158, 158` | `quote` |

**エイリアス（Obsidian互換）**

| エイリアス | 解決先 |
| :--- | :--- |
| `summary` `tldr` | `abstract` |
| `hint` `important` | `tip` |
| `check` `done` | `success` |
| `help` `faq` | `question` |
| `caution` `attention` | `warning` |
| `fail` `missing` | `failure` |
| `error` | `danger` |
| `cite` | `quote` |

タイプ名は大文字小文字を区別しない。**未知のタイプは `note` にフォールバック**する。

**折りたたみ**

- 折りたたみ可能な場合、タイトル行が `<button type="button">` になり `aria-expanded` を持つ。
- 右端にシェブロンを表示し、開いている間は90度回転させる（`200ms`）。
- 折りたたみ不可の場合はタイトル行を `<div>` として描画し、ボタン化しない。

**記述例**

```md
> [!warning] 注意
> 本文をここに書く。

> [!tip]- 初期状態で閉じるTips
> 折りたたまれた状態で表示される。
```

---

### 脚注

`app/pages/article/[_slug].vue`（スタイル・目次のフィルタ・ジャンプ時のリスナー） / `tailwind.config.ts`（`safelist`）

GFM の脚注記法（`[^1]` と `[^1]: 脚注の本文`）をそのまま使う。remark-gfm が本文に参照リンクを、
記事末尾に脚注セクションを生成する。

| 要素 | セレクタ |
| :--- | :--- |
| 本文の参照 | `sup > a[data-footnote-ref]`（`id="user-content-fnref-N"`） |
| 脚注セクション | `section[data-footnotes]` |
| 脚注の定義 | `[data-footnotes] li`（`id="user-content-fn-N"`） |
| 本文へ戻るリンク | `a.data-footnote-backref`（`↩`） |

**要件**

| 項目 | 要件 |
| :--- | :--- |
| 着地位置 | 参照・定義の両方に見出しと同じ `scroll-margin-top` を効かせ、固定ヘッダーに潜り込ませない（→ [5. 共有ロジック](#5-共有ロジック) の「ページ内リンクの着地位置」） |
| ジャンプ先の強調 | `:target` で示す。定義は番号（`::marker`）をアクセント色 + `font-weight: 700`、本文の参照は `font-weight: 700` + アンダーライン。次のフラグメント遷移まで残す |
| ジャンプの経路 | 参照 ↔ 定義の往復はブラウザ標準のフラグメント遷移に任せる（→ [ProseA](#prosea)）。`:target` が更新されるのはこの経路とURLハッシュの直接オープンだけ |
| モバイル目次バーの退避 | 脚注リンクの `pointerdown` / `click` で `beginProgrammaticScroll()` を呼び、ジャンプ中はバーを隠す（→ [TocMobile](#tocmobile)）。**これが無いと上方向のジャンプでバーが現れ、着地した参照（`88px`）をバー（`74`〜`120px`）が覆う** |
| リスナーの張り方 | 上記は本文のリンクに直接張らず、`.prose` のラッパーでイベント委譲する。ContentRenderer の出力が差し替わっても張り直しが要らない |
| セクション見出し | remark-gfm が生成する `<h2 id="footnote-label" class="sr-only">Footnotes</h2>` は**読み上げ用のラベル**として隠す（各参照が `aria-describedby` で指す）。視覚的な区切りは直前の `<hr>` が担う |
| `sr-only` の生成 | 上の `sr-only` はソースコードに現れずパージされるため、`tailwind.config.ts` の `safelist` で残す。**外すと見出しが可視になる** |
| 目次からの除外 | 上の `sr-only` 見出しを目次から除く。読者に見えない見出しが目次に並ぶのを防ぐため |

---

### ProseA

`app/components/content/ProseA.vue`

Nuxt Content が本文中の `<a>` に使用するコンポーネント。

**Props**

| 名前 | 型 | 既定値 |
| :--- | :--- | :--- |
| `href` | `string` | `''` |
| `target` | `string?` | `undefined` |
| `rel` | `string?` | `undefined` |

**要件**

- `href` が `http://` / `https://` / `//` で始まる場合を**外部リンク**と判定する。
- 外部リンクには `target="_blank"` と `rel="noopener noreferrer"` を自動付与する。
- `rel` は**上書きせず合流させる**。Nuxt Content（rehype-external-links）が外部リンクに `rel="nofollow"` を付けるため、出力は `rel="nofollow noopener noreferrer"` になる。
  `target` と同じく `rel` を props として宣言しているのは、**宣言しないとフォールスルー属性がテンプレートの `:rel` を上書きし、`noopener noreferrer` が消えるため**。
- 内部リンクは `NuxtLink` によるクライアントサイド遷移にする。
- `#` で始まる**同一ドキュメント内のハッシュリンクだけは素の `<a>`** で描画し、`NuxtLink` を通さない。
  ルーターの `pushState` ではブラウザの `:target` が更新されず、脚注のジャンプ先を強調できないため（→ [脚注](#脚注)）。
- `target` が明示的に渡された場合はそちらを優先する。

---

## 4. エラー

### ErrorView

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
（`--color-main` / `--color-sub` / `--font-sans` / `--font-mono` / `--color-accent` / `--color-accent-hover`）を参照する。
ボタンの文字色 `#FFFFFF` だけは直値（→ [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md) のトークン例外）。

| 要素 | 要件 |
| :--- | :--- |
| エラーコード | `8rem` / `700` / 等幅フォント / 字間 `-5px` / `line-height: 1` |
| メッセージ | `2rem` / `600` |
| 説明文 | `1rem` / サブテキスト色 / `line-height: 1.6` |
| ボタン | `Back to Top`。背景はアクセント色、ホバーで `--color-accent-hover`。押下で `clearError({ redirect: '/' })` を実行しトップへ戻す |

### NotFound / Server

`app/components/error/NotFound.vue` / `app/components/error/Server.vue`
（`app/error.vue` が `statusCode === 404` で振り分ける）

`ErrorView` に文言を渡すだけのコンポーネント。

| コンポーネント | Props | `ErrorView` へ渡す値 |
| :--- | :--- | :--- |
| `NotFound` | — | `404` / `Page Not Found` / 該当ページが存在しない旨の説明 |
| `Server` | `statusCode: number` | `statusCode` / `An Error Occurred` / 時間をおいて再試行する旨の説明 |

### ArticleFallback

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
| カード | 破線1px（`border-dashed` / ボーダー色）+ カード角丸 `10px` + 白背景。中央寄せの縦積み |
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

---

## 5. 共有ロジック

コンポーネント間で再利用する composable / utility。表示要件を実現する挙動の実体です。

| 名前 | ファイル | 役割 |
| :--- | :--- | :--- |
| `useTocActive(links, offset)` | `app/composables/useTocActive.ts` | 現在読んでいる見出しのIDを追跡する。ビューポート上端から `offset` px を最後に通過した見出しを採用。**ページ最下部では最後の見出しを強制的にアクティブ**にする。既定 `offset` は `140`（`Toc` は `100`、`TocMobile` は `140` を渡す） |
| `useScrollDirection(threshold)` | `app/composables/useScrollDirection.ts` | スクロール方向（`'up'` / `'down'`）を追跡する。`threshold`（既定 `8px`）未満の移動は無視してちらつきを防ぐ。iOSのラバーバンドで負値になるため `scrollY` を0でクランプする。**プログラムスクロール中は方向によらず `'down'` を返す** |
| `useScrollTo()` | `app/composables/useScrollTo.ts` | `scrollTo(id)` は指定IDへ `scrollIntoView({ behavior: 'smooth' })` でスクロールし、`history.pushState` で**ジャンプせずにURLハッシュを更新**する。**オフセットは受け取らない**（着地位置は `scroll-margin-top` が決める）。`beginProgrammaticScroll()` は**スクロールせずジャンプ中フラグだけを立てる**入口で、ブラウザ標準のフラグメント遷移（脚注）をこの仕組みに乗せるために使う |
| `isProgrammaticScroll` | `app/composables/useScrollTo.ts` | ページ内ジャンプが進行中かを表す共有 `ref`。スクロールイベントが `150ms` 止まったら終了とみなす（`scrollend` は Safari の対応が新しいためデバウンスで代用）。`useScrollDirection` と `TocMobile` が参照する |
| `useArticleTags()` | `app/composables/useArticleTags.ts` | 公開記事のフロントマターからタグを集計し、`{ name, slug, count }` を**記事数の降順（同数なら名前順）**で返す |
| `usePageSeo(input)` | `app/composables/usePageSeo.ts` | title / description と OGP・Twitter Card のメタタグをまとめて出力する。title は `<ページ名> \| Tech Blog`（省略時はサイト名のみ）、description は空ならサイト共通の説明文にフォールバックする。`og:image` は記事の `image`、無ければ `/ogp.png`。`og:image` と `og:url` は `runtimeConfig.public.siteUrl` を基準に絶対URL化する。`type: 'article'` のときだけ `article:published_time` / `article:tag` を出す（→ [ICON_GUIDELINE.md](./ICON_GUIDELINE.md)） |
| `formatDate(date)` | `app/utils/date.ts` | 日付を `YYYY.MM.DD` 形式に整形する（`ja-JP` ロケール / ゼロ埋め / ドット区切り）。空値は空文字を返す |
| `tagToSlug(tag)` | `app/utils/tag.ts` | タグ名をURLセーフなスラグに変換する。小文字化し、英数字以外の連続を `-` に置換、前後の `-` を除去（例: `@nuxt/content` → `nuxt-content`） |

**ページ内リンクの着地位置**

固定ヘッダーとの重なりは、**呼び出し側のオフセット計算ではなく着地する要素側の `scroll-margin-top` で一元管理**します。定義は `app/pages/article/[_slug].vue` の非scopedスタイルにあり、値は `.prose` に置いた `--landing-offset` を見出しと脚注で共有します。

| 画面幅 | `--landing-offset` | 内訳 |
| :--- | :--- | :--- |
| 〜1023px | `88px` | ヘッダー64 + 余白24 |
| 1024px〜 | `96px` | ヘッダー64 + 余白32 |

適用先は本文の `h2`〜`h6`、脚注の参照（`[data-footnote-ref]`）、脚注の定義（`[data-footnotes] li`）です。

CSSで持つことで、**JSによるスクロール（目次・見出しクリック）、ブラウザ標準のフラグメント遷移（脚注）、URLハッシュの直接オープンのすべてに同じ着地位置が効きます**。オフセットを変えたい場合は、各コンポーネントではなくこのスタイルを修正してください。
