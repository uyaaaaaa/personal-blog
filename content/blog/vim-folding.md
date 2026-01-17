---
title: "neovimのmarkdown折りたたみを改造した"
description: ""
published: true
date: 2026-01-16
tags:
  - vim
  - markdown
layout: default
---

## 課題

markdownでメモをする時、読みやすさのために「見出しごとの折りたたみ」をしたい
しかし、デフォルト設定の挙動がいまいち気に食わなかった...

## やったこと

`treesitter`の設定をいじって折りたたみ(`fold`)ルールを変更する

```~/.config/nvim/after/ftplugin/markdown.lua
vim.treesitter.query.set(
    "markdown",
    "folds",
    "([(fenced_code_block) (indented_code_block) (section)] @fold (#trim! @fold))"
)
```

## 補足

うまく動いているとはいえわかっていない部分が多かったため、Gemini先生に聞いてみました

### `vim.treesitter.query.set()`の解説と意図

このLuaコードは、Vim/Neovimで**treesitter**という構文解析エンジンを使用して、**Markdownファイル**の折りたたみ（fold）ルールを設定しています。

#### コードの概要

簡単に言うと、この設定はMarkdownファイルを開いたときに、以下の要素を自動で折りたためるようにするためのものです。

- **コードブロック**: バッククォート（```）で囲まれたブロック
- **インデントされたコードブロック**: 4つのスペースまたはタブでインデントされたブロック
- **セクション（見出し）**: `#`で始まる見出し

これにより、長いMarkdownドキュメントでも、コードブロックや各セクションを折りたたんで、ドキュメント全体の構造をすばやく把握し、必要な部分だけを表示できるようになります。

---

#### 詳細な説明

##### `vim.treesitter.query.set()`

この関数は、指定された言語とクエリタイプに対して、**treesitterクエリ**を設定するために使用されます。

- `"markdown"`:
  これは、設定を適用する**言語**を指定しています。ここでは、Markdownファイルにこの設定が適用されます。
- `"folds"`:
  これは、設定する**クエリのタイプ**を指定しています。`"folds"`は、テキストの折りたたみルールを定義するためのものです。

```lua
([(fenced_code_block) (indented_code_block) (section)] @fold (#trim! @fold))
```

これが実際の**treesitterクエリ**です。このクエリは、treesitterの構文ツリーを走査して、折りたたむべきノードを特定します。

- `(...)`:
  これは**キャプチャグループ**で、折りたたむノードを特定するためのルールをまとめています。
- `(fenced_code_block)`:
  `fenced_code_block`は、```で囲まれたコードブロックを指します。
- `(indented_code_block)`:
  `indented_code_block`は、インデントされたコードブロックを指します。
- `(section)`:
  `section`は、`#`、`##`などで始まる見出し（ヘッダー）を指します。
- `@fold`:
  これは**キャプチャ**です。`fenced_code_block`、`indented_code_block`、`section`にマッチしたノードに`@fold`という名前を付けています。treesitterは、この`@fold`というキャプチャ名を持つノードを**折りたたみ可能**な要素として認識します。
- `(#trim! @fold)`:
  これは**述語（predicate）**です。`#trim!`は、`@fold`でキャプチャされたノードの**空白行をトリム（削除）**するように指示しています。これにより、折りたたまれたときに余分な空白行が表示されず、見た目がきれいに整います。
