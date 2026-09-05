# 整形は Prettier に任せ、ESLint には持たせない

`.prettierrc` を整形の単一の設定にし、`npm run lint` の先頭で `prettier --check .` を回す。対象はコードだけで、Markdown と `package-lock.json` は `.prettierignore` で外す。

- **検討した案**: (1) Biome。script は整形するが Vue の template を1行も触らない。このリポジトリの不揃いは属性の折り返しに偏っていて template 側にあるため、直したいところが直らない。(2) ESLint Stylistic。template も script も整形でき、新しいコマンドも要らない。ただし整形のルールを1本ずつ議論して足すことになり、「整形を議論しない」という導入の目的と噛み合わない。ARCHITECTURE.md の「ESLint はプリセットを取り込まずルールを1本ずつ足す」方針は、整形を ESLint の外に出すことで守る。(3) Prettier（採用）。
- **対価**: 4つある。(a) `semi: false` はテンプレートのインラインハンドラの `;` も落とすため、`@click="a(); b()"` のような2文のハンドラは書けない（改行区切りの2文になり、Vue のテンプレートコンパイラが式として解釈できずビルドが落ちる）。関数に切り出して渡す。(b) 要素の中身が折り返されると、Vue の `whitespace: 'condense'` が改行とインデントを空白1つに畳むため、テキストの前後に空白が1つ増える。行頭・行末の空白は描画されないので表示は変わらないが、生成物のバイト列は変わる。`singleAttributePerLine` は属性が2つ以上あれば必ず折り返すので、この当たりが広い。(c) その `singleAttributePerLine` も、空白が意味を持つインライン要素（`<time>` `<span>` 等）では折り返せないため、`>{{ x }}</time` の後に `>` だけの行を置く形になる。空白を保つにはこの形しか取れない。(d) `useTabs` はインデント文字をタブにするだけで、見え方は閲覧側の設定で決まる。`tabWidth` は Prettier が `printWidth` を測るときの想定幅で、出力そのものには現れない。
- **戻す条件**: Vue の template を Prettier と同等に整形できる別の formatter が出て、上の対価のどれかが消えたとき。個々の設定値を戻す条件は、その値を選んだ理由（下記）が失効したとき。

## 設定値を選んだ理由

Prettier の既定から動かしたものだけを挙げる。既定のままのものに理由は無い。

| 設定 | 値 | 理由 |
| :--- | :--- | :--- |
| `semi` / `singleQuote` | `false` / `true` | 導入時の既存の書き方に合わせた。script 937行にセミコロン終端は0行、ダブルクォートは1ファイルだけだった |
| `printWidth` | `100` | 80 だと折り返しが増え、120 だと `ArticleCard.vue` の200文字超のクラス属性が結局はみ出して基準にならない |
| `useTabs` / `tabWidth` | `true` / `4` | インデント幅を読み手が選べるようにする。`tabWidth` は `printWidth` を測るときの想定幅 |
| `vueIndentScriptAndStyle` | `true` | `<template>` の中身が1段下がるのに `<script>` だけ下がらない非対称を無くす |
| `singleAttributePerLine` | `true` | 導入の動機が「属性を1行に詰めた要素と、属性ごとに改行した要素の同居」だったので、`printWidth` に収まる場合も含めて機械的に揃える |

## package-lock.json を整形対象から外す理由

生成物なので Prettier に持たせない。ただし**これで字下げが変わらなくなるわけではない**。

npm は `package.json` から検出した字下げを `package-lock.json` にも使う。`package.json` が Prettier でタブになるため、`npm install` がロックファイル全体（17,381行）をタブで書き直す。`package.json` をスペースに戻して `npm install --package-lock-only` を打つとロックファイルもスペースに戻ることを確認した。

書き直しは一度きりで、以後は npm が同じ字下げを保つ。避けるには `package.json` を整形対象から外すことになり、それは本末転倒なので受け入れる。

## Markdown を整形対象から外す理由

Prettier は表のセルを**文字数**で揃える。このリポジトリのドキュメントは日本語なので、全角が混ざると等幅表示ではかえって桁がずれる。
実測では Markdown の変更 312 行のうち 306 行が表の行だった。残りはフェンス内のフロントマター例の引用符で、記事側（`content/` は整形対象外）と食い違う方向に書き換わる。
