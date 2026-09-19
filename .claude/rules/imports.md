---
paths:
  - "app/**"
  - "tests/**"
---

# import と依存のルール

**自作モジュールを import せずに使えるのは、markdown から名前で参照されるコンポーネントだけ。**

auto-import を止めた理由は [docs/adr/02-no-auto-import.md](../../docs/adr/02-no-auto-import.md)。置き場の判定は [structure.md](./structure.md)。
