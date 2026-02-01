---
title: "シェルの小技・今後使っていきたい機能"
description: "普段使いできそうな機能をメモします。"
published: true
date: 2026-01-27
tags:
  - zsh
  - linux
layout: default
---

## はじめに

Shell（特にzsh）には、意外と知らない便利な機能がたくさん備わっています。調べていくと初見の機能ばかりでしたが、その中でも普段使いしていきたいものを列挙しました。

これから使っていくゾ！！という意気込みで備忘録として以下に残します。

## ショートカットキー

1. `<Ctrl-x>u`: Undo（直前の操作を取り消す）

2. `<Ctrl-k>`: カーソル位置より後の文字を削除

3. `<Ctrl-t>`: 配下のファイルを検索（**fzfのキーバインド設定が必要**）

4. `<Ctrl-j>` / `<Ctrl-m>`: 現在の行を実行（`Enter`と同等）

## History Begining Search

- `<Ctrl-p>` / `<Ctrl-n>`: 前方一致で履歴を遡る

## Push line(zshのみ)

入力中のコマンドを一時的に退避させ、別のコマンド実行後に自動で入力させる（`<Ctrl-o>`）

```~/.zshrc
bindkey '^O' push-line
```

## Smart insert last word(zshのみ)

直前に実行したコマンドの最後の単語を再度呼び出せる（`<Esc-.>`または`<Esc-_>`）

例）

```
$ ls /tmp/src/main/java
api db 

$ cd [ここで <Esc-.>を押すと /tmp/src/main/java が自動入力される]
```

## Edit command line(zshのみ)

コマンドラインの入力値を任意のエディタで編集できる（`<Esc-,>`）
環境変数`$EDITOR`に設定されたエディタが使用される（デフォルトは`vim`）

※ 参考: [zshで入力中のコマンドをすぐにNeovimで編集する方法](https://dev.classmethod.jp/articles/eetann-zle-edit-command-line/)

## Brace Expansion（ブレース展開）

> シェルで使われる機能で、中括弧`{}`を使って文字列を生成する機能です。`{文字列1,文字列2,...}`のようにカンマ区切りで文字列を記述すると、それらの文字列をそれぞれ展開して、半角スペース区切りで出力します。また、`{開始..終了}`のように範囲を指定することで、数値や文字のシーケンスを生成することも可能です。

例）
- `ls {/bin,/usr}`とすると、`ls /bin /usr`と同じ結果になる
- `diff {test1,test2}.csv`で`test1.csv`と`test2.csv`の差分を確認
- `cp config.ini{,.bk}`で`config.ini.bk`を作成する
    - `cp config.ini config.ini.bk`と書くよりも簡潔
- `echo {6..10}`で`6 7 8 9 10`と展開して出力する
    - `echo {5..1}`で`5 4 3 2 1`もできる
- `touch test{1..3}.txt`でtest1.txt, test2.txt, test3.txt の3ファイルを作成する
- `echo {a,b}{c,d}` → `ac ad bc bd`となり、全組み合わせを作成して出力できたりもする

また、ブレース展開中に`Tab`キーを押すと、実際の対象が表示される

> 例）`rm *.txt` → `rm memo.txt tmp.txt`
> 
> また、`<Ctrl-x>u`で展開を元に戻せる（EmacsのUndo）

## global alias

エイリアス設定に`-g`を付与することで、以降のパラメータやオプションなどにも使用できる

```sh
# 例）出力結果をクリップボードにコピーする
alias -g C='| pbcopy'
```

上記のエイリアスを設定しておくと、以下の実行で`echo {1..5}`の結果（`1 2 3 4 5`）をクリップボードに保持できる

```sh
echo {1..5} C
```

## mkdir -p (--parents)

- `/tmp/test`がない場合でも、`/tmp/test/hoge`で`/tmp/test`と`/tmp/test/hoge`が同時に作成できる

```sh
$ tree .
.
└── _yyyy-mm-dd.md

$ mkdir -p {main,test}/python/{user,task}

$ tree .
.
├── _yyyy-mm-dd.md
├── main
│   └── python
│       ├── task
│       └── user
└── test
    └── python
        ├── task
        └── user
```

## `history`で出力された結果から選んで再実行する

```sh
$ history | grep vim
    6  nvim
    7  vim
   12  nvim .
   15  vim ~/.zsh_history
   16  vim ~/.zshrc
   19  vim $(fzf)

$ !12   ← `nvim .`を実行する
```

