---
title: "Linuxの標準出力をきちんと理解する"
emoji: "🕳️"
description: "よく見かける/dev/nullなど、意味をきちんと理解してますか？"
published: true
date: 2026-01-28
tags:
  - shell
  - linux
layout: default
category: blog
---

## 主題

コマンド実行時によく見る `[command] > /dev/null 2>&1` について、
ざっくりと「ログを出力しないようにするもの」くらいの認識だったが、意味を正確に理解しないまま使っていたためちゃんと調べる。

筆者はlaravelをよく使っているので、以下のようなコマンドを実行することが多い

```sh
nohup php artisan queue:work > /dev/null 2>&1 &
```
※ `php artisan queue:work`はキューワーカーを起動するコマンド

## そもそも `/dev/null` とは

UNIXシステムにおける特殊なデバイスファイルの一つで、以下の特徴がある。

- 入力されたデータをすべて破棄する
- 読み取り時は常にEOF（End of File）を返す
- `/dev`ディレクトリ配下に配置される疑似デバイスの一種

## 1. `Command > /dev/null`とは？

`>` という記号は UNIXのリダイレクト という機能で、
コマンドの **標準出力先** を `/dev/null` に切り替えている

`/dev/null` は 「入力されたデータをすべて破棄する」特殊なデバイスファイルなので、
`Command > /dev/null` は 「コマンドの標準出力をすべて破棄する」という意味を持つ

### リダイレクトの例

```sh
# 普通に標準出力を出すケース
$ echo "This is test string."
This is test string.

# 標準出力を example.txt にリダイレクトするケース
$ echo "This is test string." > example.txt

$ cat example.txt
This is test string.

$ echo "This is test string." > /dev/null
（何も出力されない）
```

## 2. `2>&1` とは？

Unixで定められたファイルディスクリプタの番号とリダイレクトを組み合わせたもの

ファイルディスクリプタ
- 0: 標準入力
- 1: 標準出力
- 2: 標準エラー出力

では、`&` はどのような意味を持つのかというと、
`>&{ファイルディスクリプタ}` と使用することで 「`{ファイルディスクリプタ}`に結果をマージする」ことができる。

つまり`2>&1`と表現すると、「 **標準エラー出力** の結果を **標準出力** にマージする」という処理を示すことになる。

## 結論

ここまでの話をまとめると

- `2>&1` で 標準エラー出力の結果が標準出力にマージされ
- `> /dev/null` で 標準出力が すべて破棄される

つまり、`Command > /dev/null 2>&1` では 「`Command`の出力結果をすべて破棄している」ということになる

## おわりに

やっぱり基礎大事😏

## 参考

- [いい加減覚えよう。 `command > /dev/null 2>&1`の意味](https://qiita.com/ritukiii/items/b3d91e97b71ecd41d4ea)
- [Linux - /dev/null とは](https://zenn.dev/boh_mouse/articles/93c2ceb6f165a7)

