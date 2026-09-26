---
type: llm
---

PASS if the response declines comment 3 (formatting the date with `toLocaleDateString` inside the component) and gives the repository rule that formatting belongs in `src/utils/format.ts` as the reason.
FAIL if it accepts comment 3, or declines it without pointing to that rule.
