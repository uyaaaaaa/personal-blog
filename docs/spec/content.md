# 記事本文（Markdown）

Nuxt Content が描画する本文のスタイルと、本文中の要素を差し替えるコンポーネント（`app/components/content/`）。脚注は remark-gfm の出力を `[_slug].vue` 側で扱うため、ここにまとめる。

本文の方針（タイポグラフィのベースに任せる、Obsidian 互換を優先する）は [DESIGN_GUIDELINE.md](../DESIGN_GUIDELINE.md) の 4 を参照。

---

## Markdownスタイル

`prose prose-slate` をベースに、`tailwind.config.ts` の `typography` 拡張で差分を上書きする。

| 要素 | 要件 |
| :--- | :--- |
| **見出し (H2, H3)** | `prose` の既定に準拠。本文中の `h2`〜`h6` は**クリックで該当位置へスクロール**する。カーソルは `pointer`。 |
| **コードブロック** | Nuxt Content のシンタックスハイライトを使用（テーマはライト **`github-light`** / ダーク **`github-dark`** のデュアル指定で、`.dark` クラスに追従）。背景 `var(--color-surface-subtle)` / 文字色 `var(--color-code-text)` / 1pxボーダー。モバイルでは横スクロール。**行番号は表示しない**。 |
| **インラインコード** | Obsidian風。淡いサーフェス色 + 1pxボーダー + 小角丸。パディング 上下 `0.125rem` / 左右 `0.375rem`。`font-weight: 400`、文字色は周囲から継承。**バッククォート（`code::before` / `code::after`）は非表示**にする。 |
| **リンク** | アクセントカラーで表示し、ホバーでアンダーラインを付与。見出しは Nuxt Content が `<a>` で包むため対象外とし、見出しの色を継承したままホバーでのみアクセントカラーに変化する。`overflow-wrap: break-word` で**URLをそのまま書いたリンクを折り返す**（`<https://...>` の自動リンクはリンクテキスト自体が長いため、折り返さないとSP幅でページ全体が横スクロールする）。 |
| **引用 (Blockquote)** | `prose` の既定に準拠。 |
| **テーブル** | `prose` の既定に準拠。列幅が収まらない場合は**テーブル単体で横スクロール**する（→ [ProseTable](#prosetable)）。セルの折り返しは既定のままで、まず折り返し、それでも収まらない時だけスクロールが出る。 |

**対応言語**

`js` `ts` `json` `html` `css` `vue` `shell` `sh` `bash` `md` `mdc` `yaml` `vim` `lua` `sql` `php`

新しい言語を使う場合は `nuxt.config.ts` の `content.build.markdown.highlight.langs` に追加すること。**追加を忘れるとハイライトが効かない。**

---

## Callout

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

Obsidian デフォルトテーマの色相をベースに、10%不透明度の背景に載るタイトル文字が両テーマで
コントラスト比 **4.5:1 以上**になるよう、テーマごとに明度を調整した独自の値を使う。
ライトの値はインラインの `--callout-rgb-light`、ダークは `--callout-rgb-dark` に出力し、
`html.dark` 配下では `--callout-rgb` の参照先をダーク側へ切り替える。

| 色 | ライト RGB | ダーク RGB | タイプ |
| :--- | :--- | :--- | :--- |
| ブルー | `7, 102, 206` | `28, 132, 247` | `note` `info` `todo` |
| シアン | `0, 117, 115` | `0, 191, 188` | `abstract` `tip` |
| グリーン | `5, 121, 51` | `8, 185, 78` | `success` |
| オレンジ | `165, 82, 0` | `236, 117, 0` | `question` `warning` |
| レッド | `202, 22, 43` | `235, 72, 92` | `failure` `danger` `bug` |
| パープル | `111, 70, 237` | `144, 112, 241` | `example` |
| グレー | `104, 104, 104` | `158, 158, 158` | `quote` |

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

## 脚注

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
| 着地位置 | 参照・定義の両方に見出しと同じ `scroll-margin-top` を効かせ、固定ヘッダーに潜り込ませない（→ [ページ内リンクの着地位置](./article-detail.md#ページ内リンクの着地位置)） |
| ジャンプ先の強調 | `:target` で示す。定義は番号（`::marker`）をアクセント色 + `font-weight: 700`、本文の参照は `font-weight: 700` + アンダーライン。次のフラグメント遷移まで残す |
| ジャンプの経路 | 参照 ↔ 定義の往復はブラウザ標準のフラグメント遷移に任せる（→ [ProseA](#prosea)）。`:target` が更新されるのはこの経路とURLハッシュの直接オープンだけ |
| モバイル目次バーの退避 | 脚注リンクの `pointerdown` / `click` で `beginProgrammaticScroll()` を呼び、ジャンプ中はバーを隠す（→ [TocMobile](./article-detail.md#tocmobile)）。**これが無いと上方向のジャンプでバーが現れ、着地した参照（`88px`）をバー（`74`〜`120px`）が覆う** |
| リスナーの張り方 | 上記は本文のリンクに直接張らず、`.prose` のラッパーでイベント委譲する。ContentRenderer の出力が差し替わっても張り直しが要らない |
| セクション見出し | remark-gfm が生成する `<h2 id="footnote-label" class="sr-only">Footnotes</h2>` は**読み上げ用のラベル**として隠す（各参照が `aria-describedby` で指す）。視覚的な区切りは直前の `<hr>` が担う |
| `sr-only` の生成 | 上の `sr-only` はソースコードに現れずパージされるため、`tailwind.config.ts` の `safelist` で残す。**外すと見出しが可視になる** |
| 目次からの除外 | 上の `sr-only` 見出しを目次から除く。読者に見えない見出しが目次に並ぶのを防ぐため |

---

## ProseA

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

## ProseTable

`app/components/content/ProseTable.vue`

Nuxt Content が本文中の `<table>` に使用するコンポーネント。既定の実装は `<table>` を直接出力するだけで、`@tailwindcss/typography` もコードブロック（`pre`）と違ってテーブルにはスクロール領域を与えない。そのため列幅の合計がビューポートを超えると**ページ全体が横にはみ出し**、右端の列が読めなくなる。これを防ぐため、`overflow-x: auto` の `div` で包む。

**要件**

| 項目 | 要件 |
| :--- | :--- |
| ラッパー | `<table>` を `overflow-x: auto` の `div` で包む。はみ出しはテーブル内で閉じ、ページ全体の横スクロールは発生させない。 |
| セルの折り返し | 既定のまま（`nowrap` にしない）。狭い画面ではまず折り返し、それでも収まらない時だけスクロールする。 |
| 余白 | `overflow-x: auto` がBFCを作るため、`prose` がテーブルに与える上下マージンはラッパー内に保持される。ラッパー側で余白を指定しない。 |
| 幅が足りる画面 | テーブルは `width: 100%` のままで、スクロールは発生しない。 |
