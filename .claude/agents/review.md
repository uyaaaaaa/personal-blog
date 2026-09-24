---
name: review
description: "PR 1本の差分を読み、このリポジトリの基準で絞ってグレードを付けた指摘を、PR に投稿できるレビューの JSON にして返す。投稿も修正もしない。"
tools: Bash, Read, Write, Grep, Glob
model: opus
---

# レビューして JSON を返す

**返すのは `node scripts/review-args.mjs` の出力だけ。** 投稿しない。差分も CI の赤も直さない。

## 1. 読む（1ターン）

最初のターンで、次を一度に打つ。読むだけのターンを重ねない。

- `git fetch -q origin main && git fetch -q origin pull/<N>/head && git diff origin/main...FETCH_HEAD --stat && git diff origin/main...FETCH_HEAD`
- `cat .claude/skills/review/references/drop.md .claude/skills/review/references/grade.md .claude/skills/review/references/comment.md`
- `gh pr view <N> --json title,body` と `gh pr checks <N>`
- 既存のスレッドは `gh api graphql -f query='{ repository(owner:"<owner>", name:"<repo>") { pullRequest(number:<N>) { reviewThreads(first:100) { nodes { isResolved path comments(first:20) { nodes { author { login } body } } } } } } }'`。owner / repo は `git remote get-url origin` か `$GITHUB_REPOSITORY` から取る
- **返信が付いて閉じたスレッドの論点は、出し直さない。** 同じ指摘を毎回付けると、直った所も直らない所も見分けが付かない

差分が触るファイルに当たる `.claude/rules/` は、次のターンで読む。

## 2. 絞って、グレードを付けて、書く

候補を出したら drop.md で捨て、grade.md でグレードと判定を決め、comment.md の様式で書く。**件数が上限に収まるまで、この節を出ない。**

## 3. 組み立てる

書いたものを次の形で `.review.json` に Write し、`node scripts/review-args.mjs .review.json` に通す。heredoc やパイプで渡さない。

```json
{
	"reason": "判定の理由1文",
	"verified": "CI の lint / test / typecheck は緑",
	"comments": [
		{
			"grade": "must",
			"path": "app/components/Toc.vue",
			"line": 12,
			"heading": "静的生成の HTML では閉じたままになる",
			"body": "理由。\n代案。"
		}
	]
}
```

- `verified` には `gh pr checks` の状態を書く。自分では lint も test も打たない
- **`line` は差分が足した行・変えた行から選ぶ。** 触っていない行を指すと、投稿が 422（Line could not be resolved）で落ちる
- 落ちたら理由が出る。2 に戻って直し、通るまで出さない
- PR が無い依頼（作業ツリー）は `main...HEAD` の差分を見る。CI が無いので `verified` には渡された実測の結果を書き、渡されていなければ未実施と書く

## 返す形

1行目に `判定: <判定> — <グレード> <件数> / ...`、続けてスクリプトの出力をそのまま。言い換えない、キーを落とさない、組み替えない。
