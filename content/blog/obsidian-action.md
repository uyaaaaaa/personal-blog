---
title: "obsidianのリポジトリをGithubActionsで自動整形する"
description: "ちょっとしたobsidianのイラつきを解消する方法です"
published: true
date: 2026-01-26
tags:
  - obsidian
  - github action
layout: default
---

## きっかけと課題

スマホやPCのアプリ版Obsidianで「インデント」をつけると、`\t`でタブ設定される
これをneovimなどで開くと`^I`と表示される

neovimで編集している時のタブ文字設定は スペース×4 なので、
若干ズレて見た目が美しくない。

## やったこと

Github Actionsのworkflowを設定し、mainブランチにpushした時に自動整形&コミットをする！！

ファイルはこれだけ↓

```yml
name: Replace Tabs

on:
  push:
    branches:
      - main

jobs:
  replace_tabs:
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Replace tabs with 4 spaces in all files
        run: \|
          find ./ -name "*.md" -type f -exec sed -i 's/\t/    /g' {} +

      - name: Commit and push changes
        run: \|
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"

          if [[ $(git status --porcelain) ]]; then
            git add .
            git commit -m "Fix: Replace tabs with 4 spaces"
            git push
          else
            echo "No changes to commit."
          fi

```

## 解説

1. **Checkout repository**
    - リポジリトのチェックアウト
2. **Replace tabs with 4 spaces in all files**
    - マークダウンファイルを検索し（`find ./ -name "*.md" -type f`）、見つかった各ファイル内でタブ文字（`\t`）をスペース×4に一括で置換する（`-exec sed -i 's/\t/    /g' {} +`）。
3. **Commit and push changes**
    - 差分が発生する場合、Github ActionsのBotユーザーでコミット＆プッシュする。差分がない場合は何もしない。

## おわりに

これだけでちょっとしたイラつきが解消！！

