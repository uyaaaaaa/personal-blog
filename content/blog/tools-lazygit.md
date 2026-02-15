---
title: "おすすめツール紹介 - lazygit編"
description: "gitをかっこよく操作しよう"
published: true
date: 2026-02-10
tags:
  - tool
  - git
  - terminal
layout: default
---
## はじめに

エンジニアなら避けて通れないツールであるgit。

みなさんは、日頃どのようにgit操作をしているのでしょうか？

本記事では、私の"推しツール"である `lazygit` を紹介します。

## lazygitとは？？

TUI（Terminal User Interface）ベースのgitクライアントで、高速・軽量かつ綺麗な見た目が特徴のツールです。

vimライクなキーボード操作でgitコマンドの実行ができますし、ヘルプがリッチなので操作に困ることもほとんどありません。

※ Github: https://github.com/jesseduffield/lazygit

<br/>

実際の見た目は以下のようなイメージです。

![intro](https://github.com/user-attachments/assets/1c5e1cbe-9ecf-4568-a2e7-1f4295ff4a9b)

どうです？カッコいいでしょ...？😎

## インストールと起動

macでは、Homebrewを使ってインストールできます。（windowsは調べてません、、🙇）

```sh
$ brew install lazygit
```

<br/>

起動は `lazygit` とコマンド実行するだけです。引数はありません。git管理されていないディレクトリではエラーとなり、起動できません。

```sh
$ lazygit
```

## 基本操作① : ブランチ作成〜コミットまで

1. 左側ペイン間（`[1]` ~ `[5]`）の移動
    - `h` / `l`
2. ペイン内の上下移動
    - 上下に移動: `j` / `k`
    - タブ[^1]間を移動: `[` / `]`
3. ブランチを切る
    - `[3]` に移動し、ベースブランチ上で `n`
4. 変更をステージする
    - `[2]` に移動し、対象ファイル上で `space`
    - すべての差分をステージしたい場合は `[2]` で `a` を押下
5. コミットする
    - `[3]` で `c` → コミットメッセージを入力して `Enter`

ここまでの流れを一連で操作すると、以下のようになります。カッコいいですね。

![base-1](https://github.com/user-attachments/assets/46bf3da2-f043-49e2-a761-7087c5687a8a)

## 基本操作② : リモートリポジトリへのプッシュ・プル + PR作成

1. リモートリポジトリに変更を `push` する
    - `[3]` 上で `P`
2. Pull Requestを作成する（ブラウザを開く）
    - 該当のブランチ上で `o`
3. リモートブランチをローカルに `pull` する
    - `[3] Remotes` に移動し、対象のリモート（`origin`など）を選択 →  任意のブランチで `space` 押下して `New local branch` を選択
4. ローカルブランチを削除する: 
    - `[3] Local branches` の対象ブランチ上で `d` 

## おわりに

今回は、TUIベースのGitクライアントツールである `lazygit` について紹介しました。

非常にリッチな機能を備えたツールなので、[github](https://github.com/jesseduffield/lazygit) を見て様々な機能を深掘りしてみてはいかがでしょうか！！

--- 

## Appendix: 個人的によく使う機能

- ブランチ名のコピー
  * コピーしたいブランチの上で `ctrl + o`
- コミットメッセージの修正
    - メッセージを修正したいコミットの上で`R` → 編集
- gitリポジトリの切り替え
    - `ctrl + r`
- `cherry-pick`
    - 持っていきたいブランチに移動
    - `cherry-pick` したいコミットがあるブランチを選択し `Enter`
    - 対象のコミットを選んで `C`（複数選択可能）
    - `[4] Commits` に移動して `V` 
    - 「本当にcherry-pickしていいか？」を聞かれるので `Enter`
- `Stash`
    - `[2] Files` 上で `s`
    - `S` を押すとさまざまなオプションを選択できる
- その他 `Stash` 関連
    - `Stash pop`: 該当stash上で`g`
    - `Stash apply`: 該当stash上で`space`
    - `Stash drop`: 該当stash上で`d`
- キーバインドの検索
    - `?` で使用可能なキーバインド一覧を表示
    - `/` で一覧をフィルタンリング
- 差分ファイル上で `o`
    - エディタでファイルを開く

[^1]: ペイン `[3]` でいうと、`Local branches`, `Remotes`, `Tags` の3種類が存在する
