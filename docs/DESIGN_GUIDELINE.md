# Design Guideline

当ブログのデザイン**大方針**を定めるドキュメントです。
コンセプト、デザイントークン、レイアウト原則、UX要件といった「サイト全体に横断的に効くルール」を扱います。

個々のコンポーネントの詳細な表示要件・インタラクション仕様は **[COMPONENT_SPEC.md](./COMPONENT_SPEC.md)** に分離しています。

| ドキュメント | 扱う範囲 |
| :--- | :--- |
| **DESIGN_GUIDELINE.md**（本書） | 大方針。コンセプト、デザイントークン、レイアウト原則、UX要件、既知の課題。 |
| **[COMPONENT_SPEC.md](./COMPONENT_SPEC.md)** | コンポーネント定義。各コンポーネントの props、表示要件、状態とインタラクション。 |

**実装が正**です。実装を変更した際は該当するドキュメントも併せて更新してください。

- 最終更新: 2026-08-31
- 対象: Nuxt 4 / Nuxt Content 3 / Tailwind CSS 3 (+ @tailwindcss/typography)

---

## 1. デザインコンセプト

| 項目 | 詳細 |
| :--- | :--- |
| **コアコンセプト** | **「Functional Minimalism for Experts」**<br>無駄な装飾を徹底的に排除し、コードと情報の高速な認知に特化した機能美を追求する。 |
| **ムード** | 洗練、プロフェッショナル、クリーン、高速。 |
| **表現方法** | 白ベースのフラットデザイン。1pxのボーダーと余白でセクションを区切り、色彩はアクセント1色に限定する。 |

### 設計原則

新しい要素をデザインする際は、以下の原則に従います。

1. **色ではなくボーダーと余白で区切る。** 面を塗って区切らない。常時影のついた要素は作らない。
2. **アクセントカラーは1色のみ。** 意味のある箇所（リンク、アクティブ状態、ホバー）にのみ使い、装飾には使わない。
3. **画像よりテキスト。** サムネイル画像に依存せず、絵文字とテキスト情報で記事を識別させる。
4. **Webフォントを読み込まない。** 表示速度を優先し、OSネイティブフォントで完結させる。
5. **技術的な情報には等幅フォントを使う。** 日付、タグ、ロゴ、セクション見出しなど。

---

## 2. デザイントークン

### A. 定義場所と単一情報源のルール

色・フォントは以下の2箇所に定義があり、**現状は二重管理**になっています。

| 定義場所 | 形式 | 主な参照元 |
| :--- | :--- | :--- |
| `tailwind.config.ts` | Tailwind theme (`text-main`, `bg-accent` など) | 各コンポーネントのユーティリティクラス |
| `app/layouts/default.vue` の `:root` | CSS変数 (`var(--color-accent)` など) | `<style scoped>` を持つコンポーネント |

**ルール**

- 色を追加・変更する場合は `tailwind.config.ts` を先に更新し、`:root` の対応する CSS 変数を同じ値に揃える。
- コンポーネント内で**カラーコードを直接書かない**。必ずトークン経由で参照する。
- 将来的には CSS 変数側を Tailwind theme から生成し、二重管理を解消することを推奨します（→ 6章）。

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
> 名称が紛らわしいため、リネームを検討してください（→ 6章）。

Callout は例外的に Obsidian デフォルトテーマ準拠の独自パレットを持ちます（→ [COMPONENT_SPEC.md](./COMPONENT_SPEC.md)）。

### C. タイポグラフィ

| 項目 | 指定 | Tailwind | CSS変数 |
| :--- | :--- | :--- | :--- |
| **見出し / 本文** | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | `font-sans` | `--font-base` |
| **コード / 技術用語** | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` | `font-mono` | `--font-mono` |

OSネイティブフォントを優先し、Webフォントは読み込まない（表示速度を最優先するため）。

`font-mono` は技術的な記号性を出す目的で、コード以外にも以下へ適用します。
ロゴ、日付、タグ名、`Articles` 等のセクション見出し、`PICKUP` ラベル、エラーコード。

**行間**: `body` に `line-height: 1.6` を指定。

### D. 角丸・余白・エフェクト

| 項目 | 値 | 適用箇所 |
| :--- | :--- | :--- |
| **カード角丸** | `10px` | 記事カード、Hero |
| **標準角丸** | `0.5rem` (`rounded-lg`) | Callout、モバイルTOC、絵文字タイル |
| **小角丸** | `0.25rem` (`rounded`) | タグ、インラインコード |
| **コンテナ最大幅** | `1200px` | `.container`（左右パディング `1rem`） |
| **本文最大幅** | `max-w-3xl` (768px) | 記事詳細のメインカラム |
| **サイドバー幅** | `300px` | 記事詳細の右カラム |
| **ヘッダー高さ** | `64px` | sticky ヘッダー |
| **ホバー** | 影の付与 + アクセント色への変化 + 矢印の `translate-x` | カード、リンク |
| **トランジション** | `200ms`（色・影）/ `300ms`（変形・開閉）/ `500ms`（画像ズーム） | 全般 |

影は `shadow-sm` / `shadow-md` のみを使用します。

### E. ブレークポイント

| 名称 | 幅 | 主な切り替え |
| :--- | :--- | :--- |
| `md` | `768px` | 記事グリッドが1→2カラム。ヘッダー検索ボックスの表示。 |
| `lg` | `1024px` | 記事グリッドが2→3カラム。記事詳細が1→2カラム（サイドバー表示）。Hero が縦積み→左右分割。 |

`app/components/layout/HeaderNavigation.vue` のみ scoped CSS のメディアクエリ（`max-width: 768px` / `min-width: 769px`）で切り替えており、Tailwind の `md:`（`min-width: 768px`）と1pxずれています（[#45](https://github.com/uyaaaaaa/personal-blog/issues/45)）。

---

## 3. レイアウトの原則

### A. 全ページ共通

`app/layouts/default.vue` が全ページの土台です。

```
┌─────────────────────────────┐
│ Header (sticky, 64px)       │
├─────────────────────────────┤
│ main .container             │
│   max-width: 1200px         │
│   padding: 2rem 1rem 4rem   │
├─────────────────────────────┤
│ Footer                      │
└─────────────────────────────┘
```

- `min-height: 100vh` の縦フレックスで、コンテンツが短くてもフッターを最下部に配置する。
- ヘッダーは半透明 + `backdrop-filter: blur(10px)` で、スクロール時に背後のコンテンツを透かす。

### B. ページ構成

| ルート | 構成 |
| :--- | :--- |
| `/` | Hero（最新1件） + 記事グリッド（残り9件） |
| `/article` | ページヘッダー + 全記事グリッド |
| `/article/[slug]` | 2カラム（本文 + 右サイドバー）。SPは1カラム。 |
| `/tags` | ページヘッダー + 全タグのチップ一覧 |
| `/tags/[tag]` | ページヘッダー + 絞り込んだ記事グリッド。0件は404。 |

**ページヘッダーの共通形式**: `h1`（`text-3xl` / 太字）+ 説明文（サブテキスト色）+ 下端に1pxボーダー（`pb-8`）。

### C. 記事一覧グリッド

記事の一覧表示は、全ページで同じグリッドを使います。

- `1カラム` (〜767px) → `2カラム` (768px〜) → `3カラム` (1024px〜)
- ギャップ: `1rem` (SP) / `1.5rem` (md以上)
- 並び順は原則 `date` の降順。表示対象は `published: true` の記事のみ。

### D. 記事詳細の2カラム

- PC版 (lg以上) はメインカラム（`max-w-3xl`）と右サイドバー（`300px`）の2カラム。カラム間 `gap-12`。
- サイドバーは `sticky top-24` で追従する。
- SP版は1カラムになり、目次は記事タイトル直下の sticky バーに切り替わる。

---

## 4. 記事本文（Markdown）の方針

本文は `@tailwindcss/typography` の `prose prose-slate` をベースとし、差分を `tailwind.config.ts` の `typography` 拡張で上書きします。

- **ベースに任せる。** 見出し・引用・リストなどは `prose` の既定を使い、独自CSSを増やさない。
- **上書きは最小限に。** 現在の上書きはインラインコードとコードブロックのみ。
- **記法は Obsidian 互換を優先する。** 執筆環境（Obsidian）でそのまま書ける記法を採用する（Callout など）。
- **コードの可読性を最優先する。** ハイライトはライトテーマで統一し、背景とボーダーでコード領域を明示する。

具体的なスタイル値、対応言語、Callout の仕様は [COMPONENT_SPEC.md](./COMPONENT_SPEC.md) を参照してください。

---

## 5. 機能性とUX要件

| 項目 | 要件 | 状態 |
| :--- | :--- | :--- |
| **パフォーマンス** | 表示速度を最優先（Core Web Vitals の高水準達成）。Webフォントを使わず、`inlineStyles` を有効化。 | 実装済 |
| **静的生成** | Cloudflare Pages 向けにプリレンダリング（`nitro.preset: cloudflare-pages`）。 | 実装済 |
| **公開制御** | `published: true` の記事のみを全ページで取得する。 | 実装済 |
| **旧URL互換** | `/blog/**` `/book/**` は `/article/**` へ301リダイレクト。 | 実装済 |
| **タグ機能** | 全タグの一覧ページと、タグによる絞り込みを提供する。 | 実装済 |
| **スクロール追従** | 見出し位置に応じて目次のアクティブ項目をハイライトする。 | 実装済 |
| **スムーズスクロール** | 見出し・目次のクリックは固定ヘッダー分をオフセットして移動し、URLハッシュを更新する。 | 実装済 |
| **検索** | `Cmd/Ctrl + K` で検索モーダルを起動する。 | **未実装** |
| **ダークモード** | ヘッダーから切り替え可能にする。 | **未実装** |

---

## 6. 既知の課題 / 今後の予定

### デザイン定義まわりの技術的負債

| 課題 | 内容 |
| :--- | :--- |
| **色の二重管理** | `tailwind.config.ts` と `app/layouts/default.vue` の `:root` に同じ色が別々に定義されている。CSS変数を Tailwind theme から生成する形に統一したい（[#43](https://github.com/uyaaaaaa/personal-blog/issues/43)）。 |
| **`base` の命名** | Tailwind の `base` (`#FAF5FF`) は名前に反してページ背景ではなく検索ボックス背景専用。`surface-search` 等へのリネームを検討する（[#44](https://github.com/uyaaaaaa/personal-blog/issues/44)）。 |
| **エラーページのトークン非準拠** | `error/NotFound.vue` と `error/Server.vue` が色とフォントをカラーコード直書きで持ち、ボタンが**旧アクセントカラー `#007AFF`（青）**のまま。サイト全体の `#8B5CF6` と矛盾している（[#42](https://github.com/uyaaaaaa/personal-blog/issues/42)）。 |
| **エラーコンポーネントの重複** | `NotFound.vue` と `Server.vue` は文言以外ほぼ同一。共通化の余地がある。 |
| **ブレークポイントの1pxずれ** | `HeaderNavigation.vue` だけ scoped CSS の `max-width: 768px` / `min-width: 769px` で切り替えており、Tailwind の `md:`（`min-width: 768px`）とずれる。幅ちょうど768pxで検索ボックスとハンバーガーが同時に出る（[#45](https://github.com/uyaaaaaa/personal-blog/issues/45)）。 |
| **一覧グリッドの重複定義** | `ArticleList.vue`・`article/index.vue`・`tags/[tag].vue` が同じグリッドをそれぞれ記述している。`ArticleList` に寄せたい（[#46](https://github.com/uyaaaaaa/personal-blog/issues/46)）。 |

### 修正待ちの不具合

| 内容 | Issue |
| :--- | :--- |
| ヘッダーナビが未定義のCSS変数を参照しホバー色が効かない | [#38](https://github.com/uyaaaaaa/personal-blog/issues/38) |
| 幅ちょうど768pxでヘッダーの表示が破綻する | [#45](https://github.com/uyaaaaaa/personal-blog/issues/45) |
| 記事本文のどこにホバーしても全リンクが色変化する | [#39](https://github.com/uyaaaaaa/personal-blog/issues/39) |
| タグページの記事カードで絵文字が常にデフォルトになる | [#40](https://github.com/uyaaaaaa/personal-blog/issues/40) |
| エラーページのボタンが旧アクセントカラーのまま | [#42](https://github.com/uyaaaaaa/personal-blog/issues/42) |
| 脚注とヘッダーの重なり | [#17](https://github.com/uyaaaaaa/personal-blog/issues/17) |
| `` ` `` でリンクを囲めない | [#12](https://github.com/uyaaaaaa/personal-blog/issues/12) |

### 未実装の機能

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
| ダークモード対応 | （Issue未作成） |
