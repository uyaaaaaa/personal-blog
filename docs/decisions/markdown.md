# 記事本文（Markdown）

## Markdown スタイル

- **見出しはリンク色の対象外にする。** Nuxt Content が見出しを `<a>` で包むため、`.prose a` にアクセント色を当てると見出しまで染まる。見出しは色を継承したまま、ホバーでのみアクセント色に変える。
- **リンクに `overflow-wrap: break-word` を付ける。** `<https://...>` の自動リンクはリンクテキスト自体が長いため、折り返さないと SP 幅でページ全体が横スクロールする。
- **新しい言語のコードブロックを使うときは `nuxt.config.ts` の `content.build.markdown.highlight.langs` に追加する。** 追加を忘れるとハイライトが効かず、エラーにもならない。Shiki は文法を読めない言語でも `pre` に `shiki` クラスを付け、中身を属性なしの span 1個にして返すため、ビルド後の HTML で `span.line` の子 span に `class` が付いているかで見分ける。
- **言語名の綴りは `langs` に書いたものに揃える（`ts` / `yaml`）。** `typescript` / `yml` のようなエイリアスは Shiki 側で解決されて動いてしまい、`langs` の記載と食い違ったまま気付きにくい。
- **行番号は表示しない。**

## Callout

- **配色は Obsidian デフォルトテーマの色相をベースにしつつ、テーマごとに明度を調整した独自の値。** 10% 不透明度の背景に載るタイトル文字が、両テーマでコントラスト比 4.5:1 以上になるようにするため。
- **ライトの値を `--callout-rgb-light`、ダークを `--callout-rgb-dark` にインラインで出し、`html.dark` 配下で `--callout-rgb` の参照先を切り替える。** コンポーネント側にテーマ分岐を書かずに済む。
- **未知のタイプは `note` にフォールバックし、タイプ名は大文字小文字を区別しない。** Obsidian と同じ挙動。エイリアス（`tldr` → `abstract` など）も Obsidian 互換。
- **折りたたみ不可の場合はタイトル行を `<div>` として描画し、ボタン化しない。**

## 脚注

GFM の脚注記法をそのまま使い、remark-gfm の出力（`[data-footnote-ref]` `[data-footnotes]` `.data-footnote-backref`）に対して `[_slug].vue` 側でスタイルとリスナーを当てる。

- **参照 ↔ 定義の往復はブラウザ標準のフラグメント遷移に任せ、ジャンプ先を `:target` で強調する。** `:target` が更新されるのはこの経路と URL ハッシュの直接オープンだけ。ルーターの `pushState` では更新されない（→ ProseA）。
- **脚注リンクの `pointerdown` / `click` で `beginProgrammaticScroll()` を呼ぶ。** これが無いと上方向のジャンプでモバイル目次バーが現れ、着地した参照をバーが覆う。
- **リスナーは本文のリンクに直接張らず、`.prose` のラッパーでイベント委譲する。** ContentRenderer の出力が差し替わっても張り直しが要らない。
- **remark-gfm が生成する `<h2 id="footnote-label" class="sr-only">Footnotes</h2>` は消さずに隠す。** 各参照が `aria-describedby` で指す読み上げ用のラベル。視覚的な区切りは直前の `<hr>` が担う。
- **`sr-only` を `tailwind.config.ts` の `safelist` に入れる。** ソースコードに現れないためパージされ、外すと見出しが可視になる。
- **`sr-only` の見出しは目次から除く。** 読者に見えない見出しが目次に並ぶのを防ぐ。
- **着地位置は見出しと同じ `scroll-margin-top`。** 参照・定義の両方に効かせ、固定ヘッダーに潜り込ませない。

## ProseA

- **`rel` は上書きせず合流させる。** Nuxt Content（rehype-external-links）が外部リンクに `rel="nofollow"` を付けるため、出力は `nofollow noopener noreferrer` になる。
- **`target` と同じく `rel` を props として宣言する。** 宣言しないとフォールスルー属性がテンプレートの `:rel` を上書きし、`noopener noreferrer` が消える。
- **`#` で始まる同一ドキュメント内のハッシュリンクだけは素の `<a>` で描画し、`NuxtLink` を通さない。** ルーターの `pushState` ではブラウザの `:target` が更新されず、脚注のジャンプ先を強調できない。

## ProsePre

コードブロックの見た目をここに集約した理由は [構造に関わる判断](../adr/11-prose-pre-owns-code-block.md) にある。

- **MDC と同じ props（`code` `language` `filename` `highlights` `meta` `class`）をすべて宣言する。** 宣言し忘れた prop（特に `code`）はフォールスルー属性として DOM に出る。`class` と残りの属性は `pre` に渡す。`shiki` クラスは Nuxt Content が出すデュアルテーマの CSS（`html .shiki span { color: var(--shiki-default) }`）の掛かり先なので `pre` から外さない。
- **枠は `figure`、ラベルは `figcaption` にする。** `pre` の内容モデルは phrasing content で、中にラベルの要素を置けない。横スクロールは `pre` 単体で起きるので、ラベルはスクロールせずに残る。
- **上下マージンは `typography` 拡張の `figure` で持ち、コンポーネントの scoped CSS には書かない。** `.prose > :first-child` / `:last-child` の相殺と Callout 内の余白詰めは `:where()`（特異度 0,1,0）で効いている。scoped CSS に書くと特異度で勝ってしまい相殺が効かない。値は以前 `pre` が持っていた余白と同じにしてある。
- **`span.line` は `display: block` を自前で持つ。** MDC 既定の `ProsePre` がグローバル CSS で出していたもので、置き換えると消える。
- **行に左右の負マージンとパディングを持たせ、`code` を `width: max-content` / `min-width: 100%` にする。** 行背景を `pre` のパディングとスクロール領域の端まで届かせるため。`pre` のパディングを行側へ移す案は、ハイライトされない `txt` ブロックに `span.line` が無く、そこだけパディングが消えるので採らなかった。
- **diff の行の印は Shiki の transformer（`app/mdc.config.ts`）で付ける。** `diff` 文法は追加行・削除行を1色に塗るだけで hast に目印を残さない。トークンに付く `s83E4` のようなクラスは色から導出されたハッシュで不安定なため、CSS から掴まない。
- **`github-light` / `github-dark` が diff のトークンに持つ背景色を打ち消す。** そのままだと行背景の上に文字幅の塗りが重なる。Nuxt Content はこの色を `html pre.shiki code .sXXXX { --shiki-default-bg: … }`（特異度 0,2,3）で出すため、`pre.shiki :deep(code .line > span)`（0,3,3）で `--shiki-default-bg` / `--shiki-dark-bg` を `transparent` に戻す。
- **行背景は `--shiki-*-bg` 変数への値渡しではなく `background-color` で直接指定する。** scoped CSS の `:deep()` セレクタは `html.dark .shiki span`（0,2,2）より特異度が高いので直接書ける。`typography` 拡張（`:where()` で 0,1,0）に書くと効かない。
- **行頭の `+` / `-` は transformer で別の span に切り出す。** `diff` 文法は記号を `punctuation.definition.inserted.diff` として別スコープにしているが、GitHub テーマが行本体と同じ色を当てるため Shiki が同色トークンを1つに畳み、1行1 span で出てくる。CSS だけでは記号を掴めない。
- **変化した語は、同じハンクの `-` 行と `+` 行を組にして語単位の差分（jsdiff の `diffWordsWithSpace`）から求める。** 組は「i 番目同士」ではなく**似ている順**に取る。GitHub 式の i 番目同士だと、削除2行のあとに追加4行が続き対応する行がずれている diff（本ブログの実例）で1組も当たらない。共通部分が 50% 未満（`PAIR_SIMILARITY_MIN`）の組は行全体が書き換わったとみなして強調しない。閾値を切ると行のほぼ全部が強調される。
- **`diffWords` ではなく `diffWordsWithSpace` を使う。** `diffWords` は空白の差を無視し、変化なしの断片を新しい方の空白で返すため、返ってきた断片を繋いでも削除行の元の文字列にならない。行内の位置は断片の長さを足して求めているので、組にした2行でインデントや演算子まわりの空白が違うと削除行の強調位置がずれる。空白だけの断片は語として強調しない。
- **行が似ているかは前後の空白を落としてから測る。** 空白を含めて測ると、インデントだけが変わった行のスコアが下がって組にならない。位置合わせに使う差分は行の元の文字列のままなので、この trim は組の判定にしか効かない。
- **語の強調は、トークンの span を範囲の境界で切り分けてクラスを足す形にし、入れ子にしない。** 入れ子にすると `.line > span` の背景打ち消しが外側の span にしか効かず、テーマがトークンに持つ背景が語の背景の上に出る。
- **切り分けた断片が空白だけになるときは直前の断片に繋げる。** 空白だけのテキストを持つ span は Nuxt Content の圧縮で落ち、前後の語が繋がって表示される（`+` だけの行の改行が消える、`foo bar` → `baz qux` の空白が消える）。
- **transformer を変えたら `.data/` を消してから生成する。** Nuxt Content は解析結果を `.data/content/contents.sqlite` に記事の内容をキーとして持ち、`app/mdc.config.ts` の変更では無効にならない。消さないと古い hast のまま出力される。
- **unified diff のファイル名行（`--- a/x` / `+++ b/x`）は語の組から外す。** 互いに似ているため組になり、`a` / `b` だけが変化した語として強調されてしまう。
- **`+` / `-` と変化した語の文字色を本文色にする理由は [DESIGN_GUIDELINE.md](../DESIGN_GUIDELINE.md#b-配色color-palette) が持つ。** 特異度は `html.dark .shiki span`（0,2,2）より高い `pre.shiki :deep(code .diff-marker)`（0,3,2）で当てる。
- **ラベルはファイル名に限定しない。** `置換前` のような見出しも同じ記法で書けるようにし、アイコンや言語名は付けない。

## ProseTable

- **`<table>` を `overflow-x: auto` の `div` で包む。** Nuxt Content の既定は `<table>` を直接出力するだけで、`@tailwindcss/typography` もコードブロックと違ってテーブルにはスクロール領域を与えない。列幅の合計がビューポートを超えるとページ全体が横にはみ出し、右端の列が読めなくなる。
- **セルは `nowrap` にしない。** まず折り返し、それでも収まらない時だけスクロールが出る。
- **ラッパー側で余白を指定しない。** `overflow-x: auto` が BFC を作るため、`prose` がテーブルに与える上下マージンはラッパー内に保持される。
