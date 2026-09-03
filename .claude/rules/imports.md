---
paths:
  - "app/**"
---

# import と依存のルール

**自作モジュール間の依存は、必ず `import` 文に現れるようにする。** 依存グラフが実態と一致していないと、循環検出や依存方向の lint が無言で無効になる。

- **自作の components / composables / utils は明示 import する。** 自作モジュールの auto-import は止めてある。
- **フレームワークの組み込み API は書かない。** プリセットの auto-import に任せる。止めるのは自作モジュールの走査だけで、組み込みまで止めない。
- **例外は、フレームワークが名前で解決する領域。** markdown から名前で参照されるコンポーネントは import できない。
- **パスは `~/` で書き、相対パスは同じディレクトリの中だけにする。** `app/` の外は `~~/`。`@/` と `../` は使わない。並びはコンポーネント → composable → util。
- **barrel file（再エクスポートだけのファイル）を作らない。**
- **循環依存を作らない。** 型だけの依存は `import type` にして実行時依存を消す。

設定と強制手段の現状は [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md)、そう決めた理由は [docs/DECISIONS.md](../../docs/DECISIONS.md)。置き場の判定は [structure.md](./structure.md)。
