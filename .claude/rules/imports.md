---
paths:
  - "app/**"
---

# import と依存のルール

**自作モジュール間の依存は、必ず `import` 文に現れるようにする。** 依存グラフが実態と一致していないと、循環検出や依存方向の lint が無言で無効になる。

- **フレームワークの組み込み API は import を書かない。** プリセットの auto-import に任せる。止めてあるのは自作モジュールの走査だけで、自作モジュールの import 忘れは lint / build が落とす。
- **例外は、フレームワークが名前で解決する領域。** markdown から名前で参照されるコンポーネントは import できない。
- **パスは `~/` で書き、相対パスは同じディレクトリの中だけにする。** `app/` の外は `~~/`。`@/` と `../` は使わない。並びはコンポーネント → composable → util。
- **barrel file（再エクスポートだけのファイル）を作らない。**

明示 import・循環・依存方向は lint / build が落とす。強制手段の現状は [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)、auto-import を止めた理由は [docs/adr/03-no-auto-import.md](../../docs/adr/03-no-auto-import.md)。置き場の判定は [structure.md](./structure.md)。
