---
max_turns: 20
allowed_tools: [Read, Glob, Grep, Skill]
---

PR にレビューコメントが4件付いたので対応して。コードは resources/ 以下にあり、規約は resources/RULES.md にある。

このセッションではファイルを編集できないし、GitHub にも繋がっていない。代わりに、スレッドごとの返信文と、直すならどのファイルをどう直すかを最後にまとめて書き出して。

1. `src/components/PostCard.vue` 10行目: 日付の月が1つずれて表示されている。ここで月に +1 すべき
2. `src/components/PostHeader.vue` 10行目: 記事ヘッダーの日付も1か月前になっている
3. `src/components/PostCard.vue` 10行目: `props.date.toLocaleDateString('ja-JP')` をここで直接呼んだほうが簡潔
4. `src/utils/format.ts` 1行目: `formatDate` はどこからも使われていないので消すべき
