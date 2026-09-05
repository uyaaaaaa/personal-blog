# このブログの Markdown 作法

本文を書くときに読む。書式の話だけで、内容の話はしない。

## フロントマター

スキーマは `content.config.ts`。**スキーマ外のキーは Zod が黙って捨てるので書かない**（`layout` など）。

```md
---
title: "記事タイトル"
emoji: "🐘"
description: "メッセージの1文を縮めたもの"
published: true
date: 2026-09-01
tags:
  - mysql
  - index
category: blog
---
```

`published: false` で下書きとして置ける。`category` は `blog` / `book`。

## 見出し

- `#` は使わない（`title` が h1）。本文は `##` から
- 見出しに「まとめ」ではなく中身を書く。読者は見出しだけ拾う

## コードブロック

言語指定は `nuxt.config.ts` の `langs` にあるものだけ色がつく。

`js` `ts` `json` `html` `css` `vue` `shell` `sh` `bash` `md` `mdc` `yaml` `vim` `lua` `sql` `php` `diff`

プレーンテキストは `txt`。これ以外を使いたいときは `nuxt.config.ts` に追加する。
綴りは `langs` に書いてあるものに揃える（`typescript` や `yml` ではなく `ts` `yaml`）。

**ファイル名は言語の後ろに `[...]` で書く。** コードブロックの上にラベルバーとして出る。言語欄にファイル名を書くとハイライトが効かない。

````md
```lua [~/.config/nvim/after/ftplugin/markdown.lua]
vim.treesitter.query.set(...)
```
````

ファイル名でなくてもよい（`[置換前]` のようなラベルも可）。

**差分は `diff`。** 行頭 `+` / `-` の行に背景が付く。`-` 行のあとに `+` 行を並べると、対応する行の中で変化した語が濃く示される。行内の構文色は付かないので、構文を見せたいときは言語のブロックにする。

## Callout

Obsidian互換。`> [!TYPE] タイトル` で書く。

```md
> [!WARNING] ハマりどころ
> 本文
```

使えるタイプ: `note` `abstract` `info` `todo` `tip` `success` `question` `warning` `failure` `danger` `bug` `example` `quote`
（`summary` `tldr` `hint` `important` `check` `done` `help` `faq` `caution` `attention` `fail` `missing` `error` `cite` はエイリアス。未知のタイプは `note` になる）

`> [!NOTE]- タイトル` で折りたたみ（`-` は初期状態が閉、`+` は開）。

**多用しない。** 1記事に2〜3個まで。全部が強調されている記事は、何も強調されていない。

## リンク

- 外部の一次情報は本文中か「参考」に置く
- 同じ記事内の見出しへのリンクは `[見出し](#見出しのid)`
