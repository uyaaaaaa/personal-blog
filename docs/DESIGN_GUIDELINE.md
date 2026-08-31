# Design Guideline

このドキュメントは、当ブログのデザイン定義（Single Source of Truth）です。
**実装が正**であり、実装を変更した際は本ドキュメントも併せて更新してください。

- 最終更新: 2026-08-31
- 対象: Nuxt 4 / Nuxt Content 3 / Tailwind CSS 3 (+ @tailwindcss/typography)

---

## 1. デザインコンセプト

| 項目 | 詳細 |
| :--- | :--- |
| **コアコンセプト** | **「Functional Minimalism for Experts」**<br>無駄な装飾を徹底的に排除し、コードと情報の高速な認知に特化した機能美を追求する。 |
| **ムード** | 洗練、プロフェッショナル、クリーン、高速。 |
| **表現方法** | 白ベースのフラットデザイン。1pxのボーダーと余白でセクションを区切り、色彩はアクセント1色に限定する。 |

---

## 2. デザイントークン

### A. 定義場所と単一情報源のルール

色・フォントは以下の2箇所に定義があり、**現状は二重管理**になっています。

| 定義場所 | 形式 | 主な参照元 |
| :--- | :--- | :--- |
| `tailwind.config.ts` | Tailwind theme (`text-main`, `bg-accent` など) | 各コンポーネントのユーティリティクラス |
| `app/layouts/default.vue` の `:root` | CSS変数 (`var(--color-accent)` など) | `<style scoped>` を持つコンポーネント |

**ルール**: 色を追加・変更する場合は `tailwind.config.ts` を先に更新し、`:root` の対応する CSS 変数を同じ値に揃えること。
将来的には CSS 変数側を Tailwind theme から生成し、二重管理を解消することを推奨します（→ 7章）。

### B. 配色（Color Palette）

| 役割 | 値 | Tailwind | CSS変数 | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| **ページ背景** | `#F9F9F9` | — | `--color-bg` | `body` の背景色。 |
| **サーフェス** | `#FFFFFF` | `bg-white` | — | カード、ヘッダー、モバイルドロワー、TOCドロップダウンの背景。 |
| **メイン（文字色）** | `#1A1A1A` | `text-main` | `--color-text-main` | 見出し・本文の文字色。 |
| **サブテキスト** | `#888888` | `text-sub` | `--color-text-sub` | 投稿日、キャプション、説明文、非アクティブなTOC項目。 |
| **アクセント** | `#8B5CF6` | `text-accent` / `border-accent` | `--color-accent` | リンク、タグ枠、ホバー、アクティブなTOC項目。**唯一の色要素**。 |
| **ボーダー** | `#E5E5E5` | `border-border` | `--color-border` | カード枠線、セクション区切り、ヘッダー下線。 |
| **コード背景** | `#F5F5F5` | `bg-code-bg` | `--color-code-bg` | インラインコード、コードブロックの背景色。 |
| **サブサーフェス** | `#F3F4F6` | `bg-gray-100` | — | 記事カードの絵文字タイル、Heroのサムネイル枠、モバイルTOCバー。 |

> **注意**: Tailwind の `base` (`#FAF5FF` / 淡い紫) は「ページ背景」ではなく、
> ヘッダーの検索ボックス背景にのみ使用されています。`--color-bg` (`#F9F9F9`) とは別物です。
> 名称が紛らわしいため、リネームを検討してください（→ 7章）。

### C. タイポグラフィ

| 項目 | 指定 | Tailwind | CSS変数 |
| :--- | :--- | :--- | :--- |
| **見出し / 本文** | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | `font-sans` | `--font-base` |
| **コード / 技術用語** | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` | `font-mono` | `--font-mono` |

OSネイティブフォントを優先し、Webフォントは読み込まない（表示速度を最優先するため）。

`font-mono` は技術的な記号性を出す目的で、コード以外にも以下へ適用します。
ロゴ、日付、タグ名、`Articles` 等のセクション見出し、`PICKUP` ラベル。

**行間**: `body` に `line-height: 1.6` を指定。

### D. 角丸・余白・エフェクト

| 項目 | 値 | 適用箇所 |
| :--- | :--- | :--- |
| **カード角丸** | `10px` | 記事カード、Hero |
| **標準角丸** | `0.5rem` (`rounded-lg`) | Callout、モバイルTOC、絵文字タイル |
| **小角丸** | `0.25rem` (`rounded`) | タグ、インラインコード |
| **コンテナ最大幅** | `1200px` | `.container`（左右パディング `1rem`） |
| **ホバー** | 影の付与 + アクセント色への変化 + 矢印の `translate-x` | カード、リンク |
| **トランジション** | `200ms`（色・影）/ `300ms`（変形・開閉） | 全般 |

影は `shadow-sm` / `shadow-md` のみを使用し、常時影のついた要素は作らない（フラットさの維持）。

---

## 3. レイアウトと構造

### A. 共通ヘッダー（`app/components/layout/Header.vue`）

高さ `64px` の sticky ヘッダー。背景は `rgba(255,255,255,0.9)` + `backdrop-filter: blur(10px)`、下端に1pxボーダー。

| 要素 | PC版 (≥769px) | SP版 (≤768px) |
| :--- | :--- | :--- |
| **ロゴ** | 左寄せで `</> Tech Blog`。`font-mono` / `700` / `1.25rem`。 | 同左（テキストも表示）。 |
| **検索** | ヘッダー中央に検索ボックス。`Cmd+K` バッジを表示。**UIのみで未実装**（→ 7章）。 | 非表示。 |
| **ナビゲーション** | 右寄せに `Articles` / `Tags`。 | ハンバーガーメニューに収納。 |
| **ダークモード** | **未実装**（→ 7章）。 | 同左。 |

### B. モバイルドロワー（`app/components/layout/HeaderNavigation.vue`）

- ハンバーガーボタンは3本線。開くと×印にアニメーション（`300ms`）。
- ヘッダー直下（`top: 64px`）から**右側にスライドイン**。幅 `80%` / 最大 `320px`。
- 背景オーバーレイ（`rgba(0,0,0,0.5)`）をタップで閉じる。開いている間は `body` のスクロールを固定。
- 中身: ナビゲーションリンク → 区切り線 → **Tags セクション**（記事数上位10件 + 件数バッジ + `View all tags →`）。

### C. トップページ（`app/pages/index.vue`）

最新10件を取得し、先頭1件を **Hero**、残り9件を **記事一覧グリッド**として表示。

### D. 記事一覧（`app/components/ArticleList.vue`）

グリッドレイアウト。`1カラム` (SP) → `2カラム` (md) → `3カラム` (lg)。ギャップ `1rem`〜`1.5rem`。

### E. 記事詳細（`app/pages/article/[_slug].vue`）

| 要素 | 要件 |
| :--- | :--- |
| **カラム構成** | PC版 (lg以上) は2カラム（メインコンテンツ + 右サイドバー `300px`）。SP版は1カラム。 |
| **本文幅** | `max-w-3xl`（768px）。適度な行長を確保する。 |
| **記事ヘッダー** | 日付・タグ（`#tag` 形式）・カテゴリバッジ → タイトル (H1) → 説明文。下端に1pxボーダー。 |
| **戻る導線** | 記事の上下両方に `Back to Articles` を配置。ホバーで矢印が左に動く。 |
| **見出しクリック** | 本文中の `h2`〜`h6` はクリックで当該位置へスクロール（オフセット: PC `80px` / SP `130px`）。 |

### F. タグページ（`app/pages/tags/`）

- `/tags`: 全タグを枠線付きチップで一覧表示（タグ名 + 記事数）。ホバーでアクセント色。
- `/tags/[tag]`: 見出しに `#タグ名`（`#` のみアクセント色）、記事数、該当記事のグリッド。0件は404。

### G. フッター（`app/components/layout/Footer.vue`）

上端に1pxボーダー、中央寄せ、サブテキスト色、`0.9rem`。コピーライトとコンセプト文のみ。

---

## 4. コンポーネント仕様

### A. Hero（`app/components/Hero.vue`）

トップページ最上部のピックアップ記事。白背景・1pxボーダー・角丸 `10px`。

- **レイアウト**: SP は縦積み、lg以上は左右2分割（サムネイル / コンテンツ）。
- **サムネイル**: `image` があれば画像、なければ **絵文字を大きく表示**（`text-7xl`〜`8xl`、デフォルト `📝`）。背景 `bg-gray-100`。
- **コンテンツ**: `PICKUP` ラベル（アクセント色・`font-mono`・字間広め） + 先頭タグ + 日付 → タイトル (H2) → 説明文（2〜3行でクランプ） → `Read Article` リンク。
- **ホバー**: 影が濃くなり、画像は `scale-105`、絵文字は `scale-110`、タイトルがアクセント色、矢印が右に動く。

### B. 記事カード（`app/components/article/ArticleCard.vue`）

白背景・1pxボーダー・角丸 `10px`・パディング `1rem`〜`1.25rem`。

- **上段**: 48px の絵文字タイル（`bg-gray-100` / 角丸）と、右寄せの日付（`font-mono`）。
- **中段**: タイトル (H3)。太字、2行でクランプ、`min-h-[2.6em]` で高さを揃える。
- **下段**: タグ（アクセント色の枠線 + アクセント色の文字 + `font-mono`）。
- **ホバー**: 枠線とタイトルがアクセント色になり、`shadow-sm` が付く。
- サムネイル画像は使用せず、**絵文字とテキスト情報**で構成する。

### C. 目次 / TOC（`app/components/article/Toc.vue`）

PC版はサイドバー内に追従表示（`sticky top-24`）。

- 左端に縦のコネクタライン（`bg-gray-100` / 2px）。
- 各項目は左ボーダー2px。**アクティブ項目**はアクセント色の文字 + アクセント色の左ボーダー + `font-medium`。
- h3 は入れ子で1段インデントし、文字サイズを一段小さくする。
- 目次が長い場合は**サイドバー全体ではなく目次自身が内部スクロール**する（幅4pxの細いスクロールバー）。
- 読み進めてアクティブ項目がスクロール領域外に出たら、自動で中央付近へ追従スクロールする。

### D. モバイル目次（`app/components/article/TocMobile.vue`）

記事タイトル直下の sticky バー（`top-[74px]`、`bg-gray-100`）。

- タップで**オーバーレイのドロップダウン**として開く（記事本文を押し下げない）。最大高 `60vh` で内部スクロール。
- sticky 状態のとき、**下スクロールで隠れ、上スクロールで再表示**される。開いている間は隠れない。
- 開いた時点でアクティブな見出しが見える位置まで内部スクロールする。
- 背景タップで閉じる。項目タップ時はヘッダーと目次バーの高さを考慮したオフセットでスクロールする。

### E. サイドバー（`app/components/common/Sidebar.vue`）

PC版のみ表示。幅 `300px`。`sticky top-24`。TOC スロットと補助ウィジェットを縦に並べる。
現在の補助ウィジェットは「Design Philosophy」ボックスのみ（枠線 + 角丸）。

---

## 5. 記事内要素（Markdownスタイル）

本文は `@tailwindcss/typography` の `prose prose-slate` をベースとし、差分を `tailwind.config.ts` の `typography` 拡張で上書きします。

| 要素 | 要件 |
| :--- | :--- |
| **見出し (H2, H3)** | `prose` のデフォルトに準拠。クリックで該当位置にスクロールする。 |
| **コードブロック** | Nuxt Content のシンタックスハイライトを使用（テーマ: **`github-light`**）。背景 `#F5F5F5`、文字色 `#24292E`、1pxボーダー。モバイルでは横スクロール。行番号は表示しない。 |
| **インラインコード** | Obsidian風。`#F5F5F5` 背景 + 1pxボーダー + 角丸 `0.25rem`、上下 `0.125rem` / 左右 `0.375rem` のパディング。`font-weight: 400`、文字色は周囲から継承。**バッククォート（`::before` / `::after`）は非表示**にする。 |
| **リンク** | 色は `prose-slate` の既定色。ホバーでアクセントカラーに変化する。**外部リンクは自動的に `target="_blank"` + `rel="noopener noreferrer"`** を付与する（`app/components/content/ProseA.vue`）。 |
| **引用 (Blockquote)** | `prose` のデフォルトに準拠。 |
| **対応言語** | `js` `ts` `json` `html` `css` `vue` `shell` `sh` `bash` `md` `mdc` `yaml` `vim` `lua` `sql` `php`。新しい言語を使う場合は `nuxt.config.ts` の `langs` に追加すること。 |

### Callout（Obsidian互換）

`remark/obsidian-callout.mjs` が `> [!TYPE]` 記法を解析し、`app/components/content/Callout.vue` が描画します。

- **配色**: Obsidian デフォルトテーマ準拠。背景は各タイプ色の **10%不透明度**、タイトルとアイコンは各タイプ色の実色。本文は通常の文字色。
- **アイコン**: lucide のアイコンをインラインSVG（18px）で表示。
- **タイプと色**:

  | 色 | RGB | タイプ |
  | :--- | :--- | :--- |
  | ブルー | `8, 109, 221` | `note` `info` `todo` |
  | シアン | `0, 191, 188` | `abstract` `tip` |
  | グリーン | `8, 185, 78` | `success` |
  | オレンジ | `236, 117, 0` | `question` `warning` |
  | レッド | `233, 49, 71` | `failure` `danger` `bug` |
  | パープル | `120, 82, 238` | `example` |
  | グレー | `158, 158, 158` | `quote` |

- **エイリアス**: `summary` `tldr` → `abstract` / `hint` `important` → `tip` / `check` `done` → `success` / `help` `faq` → `question` / `caution` `attention` → `warning` / `fail` `missing` → `failure` / `error` → `danger` / `cite` → `quote`。未知のタイプは `note` にフォールバックする。
- **タイトル**: 省略時はタイプ名の先頭を大文字にして表示する（Obsidianと同じ挙動）。
- **折りたたみ**: `> [!TYPE]-` は初期状態で閉、`> [!TYPE]+` は初期状態で開。折りたたみ可能な場合はタイトル行が `button` になり、右端のシェブロンが回転する。

---

## 6. 機能性とUX要件

| 項目 | 要件 | 状態 |
| :--- | :--- | :--- |
| **パフォーマンス** | 表示速度を最優先（Core Web Vitals の高水準達成）。Webフォントを使わず、`inlineStyles` を有効化。 | 実装済 |
| **静的生成** | Cloudflare Pages 向けにプリレンダリング（`nitro.preset: cloudflare-pages`）。 | 実装済 |
| **公開制御** | `published: true` の記事のみを全ページで取得する。 | 実装済 |
| **旧URL互換** | `/blog/**` `/book/**` は `/article/**` へ301リダイレクト。 | 実装済 |
| **タグ機能** | 全タグの一覧ページと、タグによる絞り込みを提供する。 | 実装済 |
| **スクロール追従** | 見出し位置に応じて目次のアクティブ項目をハイライトする。 | 実装済 |
| **検索** | `Cmd/Ctrl + K` で検索モーダルを起動する。 | **未実装** |
| **ダークモード** | ヘッダーから切り替え可能にする。 | **未実装** |

---

## 7. 既知の課題 / 今後の予定

### デザイン定義まわりの技術的負債

| 課題 | 内容 |
| :--- | :--- |
| **色の二重管理** | `tailwind.config.ts` と `app/layouts/default.vue` の `:root` に同じ色が別々に定義されている。CSS変数を Tailwind theme から生成する形に統一したい。 |
| **`base` の命名** | Tailwind の `base` (`#FAF5FF`) は名前に反してページ背景ではなく検索ボックス背景専用。`surface-search` 等へのリネームを検討する。 |
| **未定義のCSS変数** | `HeaderNavigation.vue` が `var(--color-text)` と `var(--color-primary)` を参照しているが、どちらも `:root` に未定義。そのためデスクトップナビのホバー時アクセント色が効いていない。`--color-text-main` / `--color-accent` へ修正が必要。 |
| **リンクホバーの適用範囲** | `app/pages/article/[_slug].vue` の `hover:prose-a:text-accent` は変換順の都合で「**記事本文のどこかにホバーすると本文中の全リンクがアクセント色になる**」挙動になっている。リンク単体のホバーに限定するなら `prose-a:hover:text-accent` が正しい。 |
| **未使用のprops** | `app/pages/tags/[tag].vue` が `ArticleCard` に `description` を渡しているが、`ArticleCard` は当該propsを持たない。また `emoji` を渡していないため、タグページのカードは常にデフォルト絵文字になる。 |

### 未実装の機能（GitHub Issue）

| 機能 | Issue |
| :--- | :--- |
| コンテンツ検索 | [#13](https://github.com/uyaaaaaa/personal-blog/issues/13) |
| タイトルによる記事検索 | [#14](https://github.com/uyaaaaaa/personal-blog/issues/14) |
| ショートカットキーでのフォーカス（`Cmd/Ctrl + K`） | [#15](https://github.com/uyaaaaaa/personal-blog/issues/15) |
| デフォルトサムネイル | [#4](https://github.com/uyaaaaaa/personal-blog/issues/4) |
| favicon 画像 | [#28](https://github.com/uyaaaaaa/personal-blog/issues/28) |
| OGP 画像 | [#29](https://github.com/uyaaaaaa/personal-blog/issues/29) |
| 記事内への画像配置 | [#10](https://github.com/uyaaaaaa/personal-blog/issues/10) |
| コードブロックのトグル | [#3](https://github.com/uyaaaaaa/personal-blog/issues/3) |
| 脚注とヘッダーの重なり修正 | [#17](https://github.com/uyaaaaaa/personal-blog/issues/17) |
| ダークモード対応 | （Issue未作成） |
