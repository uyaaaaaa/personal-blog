# 押して、送って、観測を残す（実測メニューの 7）

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
- **`.verify/overlay-*.log` の無い報告は、操作を送っていない。** 撮影だけで「キーボードも確認した」と書かない
