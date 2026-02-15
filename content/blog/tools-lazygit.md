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

---

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

![base-2.gif]

## （WIP）よく使う機能

1. ブランチ名のコピー
    - コピーしたいブランチの上で `ctrl + o`
2. コミットメッセージの修正（リモートリポジトリへのpush前のみ）
    - メッセージを修正したいコミットの上で`R` -> 編集するだけ
3. gitリポジトリの切り替え
    - `ctrl + r`
4. `cherry-pick`
    - 持っていきたいブランチに移動
    - `cherry-pick`したいコミットがあるブランチを選択し`Enter`（コミットログをみる）
    - 対象のコミットを選んで`Shift + c`（複数選択可能）
    - `[4] Commits`に移動し、`Shift + v` 
    - 「本当にcherry-pickしていいか？」を聞かれるので `Enter`
5. `Stash`（変更の退避）
    - `[2] Files`上で`s`
    - `Shift + s`を押すとさまざまな stash option を選択できる![[Pasted image 20250608134016.png]]
6. その他`Stash`関連
    - `Stash pop`:     該当stash上で`g`
    - `Stash apply`: 該当stash上で`space`
    - `Stash drop`:   該当stash上で`d`
7. キーバインドの検索
    - `?`で使用可能なキーバインド一覧を表示
    - `/`で一覧をフィルタンリング
8. 差分ファイル上で`o`
    - エディタでファイルを開く

### ドキュメントを読んで初めて知った機能

1. [Undo](https://github.com/jesseduffield/lazygit?tab=readme-ov-file#features)
    - 元に戻す: `z`
    - Undoを戻す: `Ctrl + z`
    - 例えば...
        - `Stash`を誤って削除してしまった場合
        - 誤ってコミットしてしまった場合
2. [Compare two commit](https://github.com/jesseduffield/lazygit?tab=readme-ov-file#compare-two-commits)
    - 対象コミット上で`Shift + w` -> 比較対象コミットで `Enter`
    - `space`で `diff view`モードを抜ける
3. [Configuring File Editing](https://github.com/jesseduffield/lazygit/blob/master/docs/Config.md#configuring-file-editing)
    - 差分ファイル上で`e`を押した時に開くエディタを設定できる
    - `editPreset: "vscode"`,  `editPreset: "vim"`などなど
4. [Predefined branch name prefix](https://github.com/jesseduffield/lazygit/blob/master/docs/Config.md#predefined-branch-name-prefix)
    - ブランチ作成時の接頭辞を事前に定義しておける
    - `branchPrefix: "feature/"`

[^1]: ペイン `[3]` でいうと、`Local branches`, `Remotes`, `Tags` の3種類が存在する
