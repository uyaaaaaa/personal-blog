---
title: "vimで略語展開設定してみる"
description: ""
published: true
date: 2026-01-17
tags:
  - vim
  - tips
  - beginner
layout: default
---

vimには`abbrev`という機能があるらしい

なにやら便利そうなので、ちょっと調べて使ってみた

## abbrevの概要

> 短縮入力は、挿入モード、置換モード、コマンドラインモードで使えます。短縮入力と
> して登録されている単語を入力すると、それが表す単語に置き換えられます。よく使う
> 長い単語を打ち込むときのタイプ数を減らしたり、明確なスペルミスを自動的に修正す
> るのに使えます。

[vim日本語ドキュメント](https://vim-jp.org/vimdoc-ja/map.html#abbreviations)より

fish(シェルの一種)にも存在する機能。
要は、よく使うキーワードを事前に登録しておけばうまく展開してくれるやつ。

ドキュメントに記載されていた以下の例だと、

```.vimrc
:iab ms Microsoft
:iab tihs this
```

`ms`と入力すると`Microsoft`と展開され、
`tish`(`this`をタイポ)すると`this`と展開される

## neovim(lua)で設定してみた

`vim.cmd()`を使って設定できた

```lua
vim.cmd([[
    "Insert mode
    iabbrev ymd <C-R>=strftime("%Y%m%d")<CR>
    iabbrev ymd- <C-R>=strftime("%Y-%m-%d")<CR>
    iabbrev ymd_ <C-R>=strftime("%Y%m%d_")<CR>
]])
```

現在日付をいろいろな形式で入力しやすくする設定

- `ymd`: YYYYMMDD
- `ymd-`: YYYY-MM-DD
- `ymd_`: YYYYMMDD\_

<br/>

vimは奥が深いなあ...沼。
