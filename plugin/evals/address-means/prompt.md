---
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill]
---

この PR は `src/utils/format.ts` の月のずれを直したもの。レビューコメントが2件付いたので対応して。コードは resources/ 以下にあり、規約は resources/RULES.md にある。

このセッションではファイルを編集できないし、GitHub にも繋がっていない。代わりに、スレッドごとの返信文と、直すならどのファイルをどう直すかを最後にまとめて書き出して。

1. `src/utils/format.ts` 1行目: ここは結果をキャッシュすべき
2. `src/components/PostHeader.vue` 11行目: タグの一覧は別のコンポーネントに切り出して、記事一覧のページでも使えるようにしてほしい
