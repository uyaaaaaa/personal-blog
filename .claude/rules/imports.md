---
paths:
  - "app/**"
  - "tests/**"
---

# import と依存のルール

**markdown から名前で参照されるコンポーネントは import できない。** markdown ファイルは `import` 文を持てず、名前解決に頼るしかない。

auto-import を止めた理由は [docs/adr/02-no-auto-import.md](../../docs/adr/02-no-auto-import.md)。置き場の判定は [structure.md](./structure.md)。
