# 生成物を読む（実測メニューの 5）

`build` が通ることと、正しい HTML が出ることは別。Cloudflare Pages プリセットのため `build` の時点で `dist/` に出るので、`generate` を打ち直さなくてよい。

- **コンポーネントの import 漏れは build を通る。** そのコンポーネントが消えた HTML が黙って生成される。拾えるのは lint だけ
- **`onMounted` に依存する分岐は生成物に出ない。** 静的生成の HTML は「マウント前」で固定される
- **実データで条件が揃わないものは、データを細工して測る。** 細工したまま build して検査し、**細工は revert する**

```sh
{ grep -c 'View All' dist/index.html; ls -l dist/index.html; } > .verify/dist.log 2>&1
```
