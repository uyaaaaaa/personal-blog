# グレードと判定

## グレード

**残った指摘1件ごとに、グレードを1つ選ぶ。** 迷ったら下の行にする。

| グレード | 付けるとき | saved reply の本文 |
| :--- | :--- | :--- |
| `must` | 壊れる・生成物が変わる・方針に反する。直さないとマージできない | `![must-badge](https://img.shields.io/badge/review-must-d73a4a)` |
| `suggestion` | 直せば良くなる具体案がある。採否は書き手が決める | `![suggestion-badge](https://img.shields.io/badge/review-suggestion-fbca04)` |
| `imo` | 自分ならこうする、という別案。採らなくてよい | `![imo-badge](https://img.shields.io/badge/review-imo-0075ca)` |
| `nits` | 命名・表記の細かい点。直さなくても動く | `![nits-badge](https://img.shields.io/badge/review-nits-cfd3d7)` |

**グレードはこの4本の saved reply でだけ表す。** GitHub の Settings → Saved replies に、グレード名をタイトル・右列を本文として登録しておき、コメントの先頭はそこから挿入する。手で書くのは見出しから下だけ。

- **`must` は「壊れる」ときだけ。** 好みや改善提案には付けない
- **`nits` に整形・import 順・型を入れない**（→ [drop.md](./drop.md)）
- グレードが2つ付くなら指摘が2つ入っている。2コメントに割る
- 本文は右列のまま。色・文言・URL を変えず、ここに無いグレードを足さない
- **URL は `badge/review-<グレード>-<色>` の3区切り。** 2区切りだと色名がそのままラベルとして描かれる

## 判定

| 判定 | 使うとき |
| :--- | :--- |
| `Request changes` | `must` が1件以上 |
| `Comment` | `must` が0件で、`suggestion` が1件以上 |
| `Approve` | 指摘が0件、または `imo` と `nits` だけ |
