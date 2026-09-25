---
paths:
  - "eslint.config.mjs"
  - "eslint-rules/**"
  - "scripts/check-*.mjs"
  - "scripts/article-files.mjs"
  - ".githooks/**"
  - ".claude/hooks/**"
---

# 検査

- 規約が成り立つ経路（設定・別の綴り・逆向きの走査）を全部数え、同じ判定で見る。テストは経路ごとに書かず、破る例1本と通す例1本で固定する
- 判定を広げたら、無関係な綴り（比較・添字など）を落とさないか確かめる
- 別ファイルの綴りの一覧は、正規表現で拾わず `import` する
- フックは判定できない入力を通す
