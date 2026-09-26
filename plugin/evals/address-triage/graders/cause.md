---
type: llm
weight: 2
---

PASS if the response treats comments 1 and 2 as one root cause (`getMonth()` is zero-based in `src/utils/format.ts`) and proposes a single fix in `format.ts`, not a `+1` in each component.
FAIL if it proposes adding `+1` (or any special case) in `PostCard.vue` or `PostHeader.vue`, or fixes the two comments separately.
