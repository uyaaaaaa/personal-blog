---
name: verify
description: "このリポジトリの変更を実測で確かめ、証跡を `.verify/` に残す。lint / build の出力・生成物の検査・画面の撮影をファイルにし、報告はそこから引く。「動くはず」で報告しないための手順。issue 対応や UI 変更の確認フェーズから呼ぶ。実測だけをサブエージェントに委譲するときの指示の型も持つ。"
---

# 実測の手順

**実測していないことを「確認した」と書かない。** 読んで通ると判断したもの、前回通ったから今回も通ると考えたものは、すべて未確認。
**証跡の無いものも未確認。** 出力と画面を `.verify/` に残し、報告はそこから引く。

## 証跡

`.verify/` は git 管理外。**セッションの頭で作り直す。** 前回の残りを今回の証跡と取り違えない。

```sh
rm -rf .verify && mkdir .verify
npm run lint > .verify/lint.log 2>&1; echo $?   # 出力はファイル、終了コードは別に出す
```

ファイル名は測ったものに合わせる（`lint.log` `dist.log` `index-375-dark.png`）。
**直す前の状態も残す。** `before-` を付けて撮り、直した後と並べて見る。

## 実測メニュー

上から順に、必要なところまで。**測れなかったものは「未実施」と書く。** 空欄にも「問題なし」にもしない。

| # | 打つもの | 何が分かる | 証跡から引くもの |
| :--- | :--- | :--- | :--- |
| 1 | `npm ci` | 測る土台が揃った | 終了コード |
| 2 | `npm test` | 関数とコンポーネントの振る舞い | 終了コード、件数。失敗は全文 |
| 3 | `npm run lint` | コンポーネントの import 漏れ、循環、依存方向 | 終了コード。error 行は全文 |
| 4 | `npm run build` | prerender が通るか。composable / util の import 漏れ | 終了コード、生成されたページ数 |
| 5 | `dist/` の検査 | **生成された HTML の中身** | 該当要素の有無、バイト数 |
| 6 | 画面の撮影 | 見た目 | 撮った幅とテーマ、見て分かったこと |
| 7 | 被せた UI に操作を送る | キーボード・日本語入力・履歴・幅の跨ぎ | NG の行と、その観測 |
| 8 | プレビュー URL | 本番と同じ出力 | チェックの結果と URL |

- **1 を飛ばすと別のものを測る。** `node_modules` が無いとグローバルの ESLint が動いて落ちる。変更の問題ではない
- **4 で止めてよいのは、生成物に影響しない変更だけ。** 出し分け・分岐・ルーティングを触ったら 5 まで行く
- **2 は 5 の代わりにならない。** テストは、コンポーネントが生成された HTML に出たかを見ていない
- **6 で止めてよいのは、被せた UI（ダイアログ・ドロワー）を触っていない変更だけ。** 撮影は操作を送っていない

### 5 の要点: 生成物を読む

`build` が通ることと、正しい HTML が出ることは別。Cloudflare Pages プリセットのため `build` の時点で `dist/` に出るので、`generate` を打ち直さなくてよい。

- **コンポーネントの import 漏れは build を通る。** そのコンポーネントが消えた HTML が黙って生成される。拾えるのは lint だけ
- **`onMounted` に依存する分岐は生成物に出ない。** 静的生成の HTML は「マウント前」で固定される
- **実データで条件が揃わないものは、データを細工して測る。** 細工したまま build して検査し、**細工は revert する**

```sh
{ grep -c 'View All' dist/index.html; ls -l dist/index.html; } > .verify/dist.log 2>&1
```

### 6 の要点: 撮って、自分で見る

`npm run dev` を起こし、SP 375px / PC 1280px × ライト / ダークの4通りを撮る。
**撮った PNG は必ず開いて見る。** 置いただけでは確認にならない。見るのは、横スクロール、着地位置がヘッダーに潜っていないか、`before-` との差。

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

`preferredColorScheme` は 0 がダーク、1 がライト。headless の窓は 500px 未満に縮まないので、幅は iframe 側で作る。
ルーティングを触ったら、該当パスと**存在しないパス**の両方を叩き、ステータスを `.verify/routes.log` に残す。

### 7 の要点: 押して、送って、観測を残す

被せた UI で壊れるのは、見た目ではなく経路。Esc の届く先、閉じた後のフォーカスの戻り先、変換中のキー、ブラウザバック、`md` を跨いだ後の Tab は、撮っても写らない。
送る操作は `scripts/overlay-probe.mjs` が持ち、結果は `.verify/overlay-<対象>.log` に、送った操作と観測が1件ずつ並ぶ。

```sh
npm run dev > .verify/dev.log 2>&1 &          # 3000 で起こしておく
node scripts/overlay-probe.mjs search; echo $?  # ダイアログ
node scripts/overlay-probe.mjs drawer; echo $?  # ドロワー
```

- **NG の行は、観測をそのまま報告に引く。** 「閉じない」ではなく `overlay="visible" active="BODY"`
- **送信の行は、書いた手順ではなく実際に送った操作。** 飛ばした操作は出ず、押し直した回数は出る
- **送る操作を増やすのも、対象を足すのも `scripts/overlay-probe.mjs`。** 手順書側に操作を書かない
- **直した直後は、dev が拾い直してから打つ。** 拾う前の画面を測ると直す前の結果が出る
- **2 / 3 / 4 と同時に回さない。** `.nuxt` を共有しているので、dev が途中から別のものを配る。挟んだら dev を起こし直す
- **`.verify/overlay-*.log` の無い報告は、操作を送っていない。** 撮影だけで「キーボードも確認した」と書かない

## 報告の型

| 実測したこと | コマンド / 手段 | 結果 | 証跡 |
| :--- | :--- | :--- | :--- |
| build | `npm run build` | 終了コード 0、`dist` に 60 ページ | `build.log` |
| 画面 | 375 / 1280 × light / dark | 横スクロールなし | `index-375-dark.png` ほか3枚 |
| 被せた UI | `node scripts/overlay-probe.mjs search` | NG 0件 / OK 25件（375・1280） | `overlay-search.log` |

- 結果に書くのは、証跡から引いた**根拠の行**。「通った」ではなく、件数・バイト数・error 行
- **条件ごとに結果が変わるものは、条件を行にする。** 1行にまとめると、どの条件を測っていないかが消える
- PR の「## 確認」に置くときは、証跡の列と、CI が打つものの行を落とす（→ `pr`）

## サブエージェントに委譲する

`build` と `generate` は分単位でかかり、条件を変えた総当たりはその回数だけかかる。撮影も、打つだけなら同じ。
**測るだけを投げる。判断は投げない。** 投げ先は `measure`（`.claude/agents/measure.md`）で、判断も修正もしないよう、打つ手段だけを持たせてある。

- コマンドを、証跡の出力先まで含めてそのまま書く
- 貼り返す内容を指定する。終了コードと、証跡のどの行か
- 「問題ないか見て」と書かない
- 細工するなら、revert までを指示に入れる
- **`.verify/` の作り直しは、投げる前に済ませる。** 並列で投げると、後から起きた方が前の証跡を消す

```
以下を順に実行し、結果だけを貼り返してください。判断は不要です。
1. npm run build > .verify/build.log 2>&1; echo $?  → 終了コードと dist の HTML の数
2. app/pages/index.vue の SHELF_LIMIT を 5 にして再度 build
   → grep -c 'View All' dist/index.html の数値
3. 2 を git checkout で戻し、git status --short が空であることを確認
```

**検収する。** `.verify/` に証跡があり、貼り返された行がその中にあること。
無ければ**測っていない**として扱い、自分で測り直す。
**撮影を投げても、見るのは投げない。** PNG は自分で開く（→ 6 の要点）。
