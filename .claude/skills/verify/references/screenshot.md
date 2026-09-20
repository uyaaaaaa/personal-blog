# 撮って、自分で見る（実測メニューの 6）

`npm run dev` を起こし、SP 375px / PC 1280px × ライト / ダークの4通りを撮る。
PNG を開いて見るのは、横スクロール、着地位置がヘッダーに潜っていないか、`before-` との差。

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
