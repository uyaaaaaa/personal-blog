---
title: "render-markdown.nvimでlinkがうまくレンダリングされなくなった"
description: ""
published: true
date: 2026-01-18
tags:
  - neovim
  - plugins
  - beginner
layout: default
---

## 事象

markdownファイルのプレビューには長らく[render-markdown.nvim](https://github.com/MeanderingProgrammer/render-markdown.nvim)を使っていたが、
ある日を境にURLのレンダリングがされなくなった

## 原因

`lazy.nvim`を使った`treesitter`の設定が問題だったっぽい
※ render-markdownの設定ではなかった...

```lua
{
    "nvim-treesitter/nvim-treesitter",
    lazy = true,
    build = ":TSUpdate",
    opts = {
        indent = { enable = true },
        sync_install = false,
        ensure_installed = { "html", "css" },  -- 例
    },
}
```

## 解決方法1

`nvim-treesitter`の設定を以下のようにする

```lua
{
   "nvim-treesitter/nvim-treesitter",
   lazy = true,
   build = ":TSUpdate",
   main = "nvim-treesitter.configs",   -- これが大事
   opts = {
       highlight = { enable = true },  -- これが大事2
       indent = { enable = true },
       sync_install = false,
       ensure_installed = { "html", "css" },
   },
}
```

## 解決方法2

`:TSEnable highlight`を実行する

## 結論

Plugin側の問題ではなく、lazy.nvimにおける `nvim-treesitter` の設定の問題だった模様。

ちなみに私はこの問題を半年弱放置していました...

## 参考

- <https://github.com/MeanderingProgrammer/render-markdown.nvim/issues/28>
- <https://zenn.dev/atoyr/articles/8802733f238e6d>
