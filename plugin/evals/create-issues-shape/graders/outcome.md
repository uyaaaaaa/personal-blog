---
type: llm
weight: 2
---

PASS if the completion criteria (完了条件) include an observable outcome, such as a Japanese-only tag's page listing only that tag's posts, or existing tag URLs staying the same. Criteria that also name the fix the user asked for (a fallback or a hash in `toSlug`) are fine.
FAIL if no completion criterion describes an observable outcome, or a criterion cannot be judged from outside (e.g. "works correctly").
