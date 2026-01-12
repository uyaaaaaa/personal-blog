---
title: "vim標準で使いたいコマンド"
description: "これが使えたらvimmer"
published: true
date: 2026-01-10
tags:
  - vim
  - tools
  - beginner
layout: default
---
## 毎回`vim .`で起動せず、`Ctrl + z`と`fg`で制御する

1. `<C-z>`を使うと、vimのプロセスをサスペンド（一時停止）できる[^1]
2. （任意のコマンドを実行する）
3. `fg %vim`などを使ってvimをフォアグラウンドに戻す

## Visualモードの始点を変える

visualモード選択中に`o`を押下すると、逆方向のカーソルを動かせる

## カーソル位置と画面表示を調整する

- `z<CR>` / `zt`: カーソル位置が *画面最上部* になるようにスクロールする
- `z.` /  `zz`: カーソル位置が *画面中央* になるようにスクロールする
- `z-` / `zb`: カーソル位置が *画面最下部* になるようにスクロールする

## 外部の変更を反映する

`:e`でOK

## Visual Blockで連番を作成する

#### 例

 `<C-v>`にて visual blockモードに入り、`0`の列を矩形選択する

```
0 test
0 test
0 test
```

`g<C-a>`を押すと、選択した箇所の数値が連番になる[^2]

## 複数の文字列を検索する(正規表現の話)

`/first\|second`:
    "first" または "second"に一致する文字列を検索する

`:%s/foo\|bar/hoge/g`:
    "foo" または "bar" に一致するバッファ内の文字列を "hoge" に置換する

## 次 / 前 の`f`一致に移動する

`f{char}`で`{char}`に移動したとき、
- `;`で次の一致に移動する
- `,`で前の一致に移動する

## 一括で改行に置換する

```txt
1 2 3 4 5 6 7 8 9 10
```

上記に対して `:s/\s/,\r/g`[^3]を実行すると、、、

```txt
1,
2,
3,
4,
5,
6,
7,
8,
9,
10
```

## 後方参照を使って文字列を置換する

> [!important] 後方参照とは by gemini
> 正規表現では、特定のパターンをマッチさせるために `()` を使うことがあります。この `()` で囲まれた部分は「グループ」として扱われ、マッチした実際の文字列が記憶されます。
>
> - `\1` は、正規表現内で**1番目**に見つかった `()` グループがキャプチャした内容を参照します。
> - `\2` は、**2番目**の `()` グループがキャプチャした内容を参照します。
> - `\3` 以降も同様に、3番目、4番目といった具合に続きます。
>
> この仕組みを使うと、マッチした文字列の一部を再利用して置換したり、さらに複雑なパターンを構築したりすることができます。

#### 例1

```置換前
apple apple banana orange
apple banana banana orange
apple banana lemon banana orange
apple banana orange orange orange
```

上記の文字列に対して `:%s/\(\w\+\)\s+\1\s+//g`を実行すると、、、

```置換後
banana orange
apple orange
apple banana lemon banana orange
apple banana orange
```

**apple apple** や **banana banana** などの繰り返し単語を削除できる。

※ 正規表現: `(\w+)\s\1\s` について
- `(\w+)`: 1つ以上の単語文字（英数字とアンダースコア）をキャプチャし、これを*グループ1*として記憶する。
- `\s+`: 1つ以上の空白文字にマッチする
- `\1`: ここで *グループ1（つまり、最初にキャプチャした単語）* と全く同じ内容を指定する

#### 例2

`:%s/\(.*\)$/new_\1/g`を実行すると、すべての行頭に`new_`を付与できる

- `(.*)$`にて行ごとキャプチャし、`\1`に記録
- `\1`の前に `new_`を付与することで、全ての行頭に適用する

## 正規表現の特殊文字`&`を使って文字列を置換する

#### 例

`:%s/{pattern}/new_&/g`: `{pattern}`に一致する文字列の前に `new_`をつける

```
banana, apple, orange, tea
orange, tea, banana, apple
apple, banana, orange, tea
```

上記のバッファに対して`:%s/orange\|banana/new_&/g`を実行すると、、、

```
new_banana, apple, new_orange, tea
new_orange, tea, new_banana, apple
apple, new_banana, new_orange, tea
```

`{pattern}`一致の文字列全てに`new_`が付与できる

## コマンドラインモードで行削除する

`:g/{pattern}/d`
    `{pattern}`にマッチする文字列がある行を削除する

`:v/{pattern}/d`
    `{pattern}`にマッチする文字列がない行を削除する

#### 例

1. `:g/apple/d`: "apple"を含む行（1, 3, 4, 6行目）を削除
2. `:v/apple/d`: "apple"を含まない行（2, 5行目）を削除

```
banana, apple, orange, tea      <- 2で削除
banana, banana, banana, banana  <- 1で削除
orange, tea, banana, apple      <- 2で削除
apple, apple, apple, apple      <- 2で削除
orange, orange, orange, orange  <- 1で削除
apple, banana, orange, tea      <- 2で削除
```

## 選択範囲に対してノーマルモードでコマンドを実行する

`:範囲 normal コマンド`
 - ex1) `:10,20 normal I// `
     - 10行目から20行目までの各行の先頭に `// ` を挿入
 - ex2) `:'<,'> normal A,` 
     - ビジュアル選択した範囲の各行に対して、行末に`,`を挿入する

## マクロを使う

> [!important] 基本操作
> 1. `q{char}`で`{char}`に記録を開始する
> 2. 記録したいマクロ操作を実行する
> 3. `q`で記録を終了する
> 4. `@{char}`でレジスタ`{char}`に記録されたマクロを実行する

- `@@`: 最後に実行したマクロを再度実行
- `5@a`: `a`に保存したマクロを5回実行

## 外部コマンドを使って操作する
### `r`を使って結果をバッファに書き込む

- `:r target.txt`: target.txtの中身を表示中のバッファに書き込む
- `:r !tree .`: `tree`コマンドの結果を書き込む

### 選択範囲を並び替える

- `:'<,'>!sort`: ビジュアルモードで選択中の範囲をソートする
- `:%!sort`: バッファ全体をソートする

### json文字列を整形する

```json
{"name":"JohnDoe","age":30,"isStudent":false,"address":{"street":"123MainSt","city":"Anytown"}}
```

上記の行を選択して`'<,'>!jq`を実行すると、、、

```json
{
  "name": "JohnDoe",
  "age": 30,
  "isStudent": false,
  "address": {
    "street": "123MainSt",
    "city": "Anytown"
  }
}
```


---

[^1]: `:suspend`でも同じことが可能
[^2]: `:help g_CTRL-A`
[^3]: `\s`はスペース、`\r`は改行文字(mac)を表す
