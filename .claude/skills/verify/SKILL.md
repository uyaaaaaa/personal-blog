---
name: verify
description: "このリポジトリの変更を実測で確かめ、証跡を `.verify/` に残す。lint / build の出力・生成物の検査・画面のスクリーンショットをファイルにし、報告はそこから引く。「動くはず」で報告しないための手順。issue 対応や UI 変更の確認フェーズから呼ぶ。実測だけをサブエージェントに委譲するときの指示の型も持つ。"
---

# 実測の手順

**実測していないことを「確認した」と書かない。** 読んで通ると判断したもの、前回通ったから今回も通ると考えたものは、すべて未確認。

**証跡の無い項目は未実施として扱う。** 出力とスクリーンショットを `.verify/` に残し、報告はそこから引く。

ユニットテストが見るのは関数とコンポーネントの振る舞いまでで、生成された HTML と見た目は自動では積み上がらない。

## 原則

- **走らせていないコマンドの結果を書かない。** 「lint / build 通過」は、そのセッションで実行して 0 で終わったときだけ
- **終了コードを見る。** 出力の見た目で判断しない。`; echo $?` の形で確かめる
- **出力はファイルに残す。** 報告に書くのは、証跡から引いた**根拠の行**（prerender の件数、生成された HTML のバイト数、lint の error 行）
- **直す前に、壊れている状態を撮る。** `before-` を付けて残し、直した後と並べて見る
- **測れなかったものは「未実施」と書く。** 空欄にも「問題なし」にもしない

> [!WARNING] 依存を入れずに測ると、別のものを測ることになる
> `node_modules` が無い状態で `npm run lint` を打つと、グローバルの別バージョンの ESLint が動いて
> `Cannot find package '@typescript-eslint/parser'` で落ちる。これは**変更の問題ではない**。
> 測る前に `npm ci` を通す。エラーが出たら、まず自分の環境を疑う。

## 証跡の置き場

`.verify/` に置く。git 管理外なので、コミットにも `git status --short` にも出ない。
**セッションの頭で作り直す。** 前回の残りを今回の証跡と取り違えない。

```sh
rm -rf .verify && mkdir .verify
```

コマンドはこの形で打ち、終了コードを別に出す。

```sh
npm run lint > .verify/lint.log 2>&1; echo $?
```

| 何の証跡 | ファイル |
| :--- | :--- |
| コマンドの出力 | `.verify/ci.log` `.verify/test.log` `.verify/lint.log` `.verify/build.log` |
| 生成物の検査 | `.verify/dist.log` |
| 叩いた URL とステータス | `.verify/routes.log` |
| 画面 | `.verify/<パス>-<幅>-<テーマ>.png` |
| 直す前の状態 | 同じ名前に `before-` を付ける |

## 実測メニュー

上から順に、必要なところまで。

| # | コマンド | 何が分かる | 証跡から引くもの |
| :--- | :--- | :--- | :--- |
| 1 | `npm ci > .verify/ci.log 2>&1; echo $?` | 測る土台が揃った | 終了コード |
| 2 | `npm test > .verify/test.log 2>&1; echo $?` | 関数とコンポーネントの振る舞い | 終了コード、Test Files / Tests の行。失敗があれば全文 |
| 3 | `npm run lint > .verify/lint.log 2>&1; echo $?` | コンポーネントの import 漏れ、循環、依存方向 | 終了コード。error 行があれば全文 |
| 4 | `npm run build > .verify/build.log 2>&1; echo $?` | prerender が通るか。composable / util の import 漏れ | 終了コード、ページ数 |
| 5 | `dist/` を読む | **生成された HTML の中身** | 該当要素の有無、バイト数 |
| 6 | スクリーンショット | 見た目・操作 | 撮った幅とテーマ、見て分かったこと |
| 7 | プレビュー URL | 本番と同じ出力 | チェックの結果と URL |

**4 で止めてよいのは、生成物に影響しない変更だけ。** 出し分け・分岐・ルーティングを触ったら 5 まで行く。
**2 が通っても 5 の代わりにはならない。** テストは、コンポーネントが生成された HTML に出たかを見ていない。

### 5 の要点: 生成物を読む

`build` が通ることと、正しい HTML が出ることは別。

Cloudflare Pages プリセットのため **`npm run build` の時点で `dist/` に静的 HTML が出る**。生成物を読むだけなら `generate` を打ち直さなくてよい。

- **コンポーネントの import 漏れは build を通る。** そのコンポーネントが消えた HTML が黙って生成される。拾えるのは `npm run lint` だけ。
- **`onMounted` に依存する分岐は生成物に出ない。** 静的生成の HTML は「マウント前」の状態で固定される。
- **実データで条件が揃わないものは、データを細工して測る。** 細工したまま `generate` して `dist/` を検査し、**細工は revert してコミットに含めない**。

検査もファイルに残し、そこから引く。

```sh
{ find dist -name '*.html' | wc -l; grep -c 'View All' dist/index.html; ls -l dist/index.html; } > .verify/dist.log 2>&1
cat .verify/dist.log
```

### 6 の要点: 画面を撮って、自分で見る

`npm run dev` を起こし、SP 375px / PC 1280px × ライト / ダークの4通りを撮る。
**撮った PNG は必ず開いて見る。** 置いただけでは確認にならない。

```sh
CH=$(command -v chromium || ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome | head -1)
for w in 375 1280; do
  printf '<body style="margin:0"><iframe src="http://localhost:3000/" style="width:%dpx;height:900px;border:0"></iframe>' "$w" > .verify/frame.html
  for t in light:1 dark:0; do
    "$CH" --headless --disable-gpu --no-sandbox --hide-scrollbars --window-size=$w,900 \
      --virtual-time-budget=8000 --blink-settings=preferredColorScheme=${t#*:} \
      --screenshot=".verify/index-$w-${t%%:*}.png" "file://$PWD/.verify/frame.html"
  done
done
```

- `preferredColorScheme` は **0 がダーク、1 がライト**。テーマは `prefers-color-scheme` で切り替わる
- headless の `--window-size` は 500px 未満に下がらないため、**幅は iframe 側で作る**
- URL とファイル名は測る対象に合わせて変える。直す前は `before-` を付けて撮り、直した後と並べる
- 見るのは、横スクロールが出ていないか、着地位置がヘッダーに潜っていないか、`before-` との差

ルーティングを触ったら、該当パスと**存在しないパス**の両方を叩いてステータスを残す。

```sh
for p in / /blog/does-not-exist; do
  printf '%s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000$p")"
done > .verify/routes.log
```

## 報告の型

結果は証跡から引く。**PR の「## 確認」に置くときは証跡の列を落とす。**

| 実測したこと | コマンド / 手段 | 結果 | 証跡 |
| :--- | :--- | :--- | :--- |
| テスト | `npm test` | 終了コード 0、20 件通過 | `test.log` |
| lint | `npm run lint` | 終了コード 0 | `lint.log` |
| build | `npm run build` | 終了コード 0、`dist` に 60 ページ | `build.log` |
| 生成物 | `dist/index.html` を検査 | 総数6件のとき `hidden lg:flex` | `dist.log` |
| 画面 | 375 / 1280 × light / dark | 横スクロールなし | `index-375-dark.png` ほか3枚 |
| プレビュー | Cloudflare Pages | 未実施（PR 作成後） | — |

**条件ごとに結果が変わるものは、条件を行にした表で出す。** 1行にまとめると、どの条件を測っていないかが消える。

## サブエージェントに委譲する

`build` と `generate` は分単位でかかる。条件を変えた総当たりは、その回数だけかかる。
**こういう実測はサブエージェントに投げてよい。** 判断は投げない。**測るだけを投げる。**

投げるとき、指示に必ず入れる。

1. **実行するコマンドを、そのまま書く。** 証跡の出力先まで含める（解釈の余地を残さない）
2. **終了コードと、証跡のどの行を貼り返すか**を指定する
3. **判断させない。** 「問題ないか見て」ではなく「この grep の結果を貼れ」
4. 生成物を測るなら、**細工の内容と revert までを指示に含める**

```
以下を順に実行し、結果だけを貼り返してください。判断は不要です。

1. mkdir -p .verify && npm ci > .verify/ci.log 2>&1; echo $?
2. npm test > .verify/test.log 2>&1; echo $?       → 終了コードと、Test Files / Tests の行
3. npm run lint > .verify/lint.log 2>&1; echo $?   → 終了コードと、error を含む行を全部
4. npm run build > .verify/build.log 2>&1; echo $? → 終了コードと、find dist -name '*.html' | wc -l の数値
5. app/pages/index.vue の SHELF_LIMIT を 5 にして npm run build
   → grep -c 'View All' dist/index.html と ls -l dist/index.html を .verify/dist.log に入れ、その中身
6. 5 の変更を git checkout で戻し、git status --short が空であることを確認
```

**受け取ったら検収する。** `.verify/` に証跡が残っていて、貼り返された行がその中にあること。
証跡が無い報告、コマンドを言い換えた報告は採用しない。**測っていない**として扱い、自分で測り直す。
