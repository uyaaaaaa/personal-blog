---
type: llm
weight: 2
---

PASS if every item under the completion criteria (完了条件) describes an observable outcome, such as a Japanese-only tag's page listing only that tag's posts, or existing tag URLs staying the same, and none of them names the fix (a fallback, a hash, or changing `toSlug`).
FAIL if any completion criterion names the fix, or a criterion cannot be judged from outside (e.g. "works correctly").
