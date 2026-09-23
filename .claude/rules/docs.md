---
paths:
  - "docs/**"
  - ".claude/rules/**"
  - ".claude/skills/**"
  - ".claude/agents/**"
  - "CLAUDE.md"
---

# 文書と散文

実装・lint・テストが持てることは書かない。1行ずつ「消すと Claude が間違えるか」を問い、間違えないなら消す。

| 何を | どこに |
| :--- | :--- |
| 覆すと公開 URL かディレクトリ全体が動く判断 | `docs/adr/` に1判断1ファイル。見出しは判断を言い切る1行 |
| 1行で言える構造の線 | `.claude/rules/` か lint |
| デザインの大方針 | `docs/DESIGN_GUIDELINE.md` |
| 構造・依存方向・検査の置き場 | `docs/ARCHITECTURE.md` |
| favicon / OGP の仕様 | `docs/ICON_GUIDELINE.md` |
| 毎回効く事実 | `CLAUDE.md` か `paths: "**"` の rule |
| ファイル種別に閉じた判断 | `paths` 付きの rule |
| 手順 | skill の本体 |
