---
paths:
  - "app/**"
---

# import と依存のルール

**自作モジュール間の依存は、必ず `import` 文に現れるようにする。** 依存グラフが実態と一致していないと、循環検出や依存方向の lint が無言で無効になる。

- **フレームワークの組み込み API は import を書かない。** プリセットの auto-import に任せる。止めてあるのは自作モジュールの走査だけ。
- **例外は、フレームワークが名前で解決する領域。** markdown から名前で参照されるコンポーネントは import できない。
- **import の並びはコンポーネント → composable → util。**
- **barrel file（再エクスポートだけのファイル）を作らない。**

auto-import を止めた理由は [docs/adr/03-no-auto-import.md](../../docs/adr/03-no-auto-import.md)。置き場の判定は [structure.md](./structure.md)。
