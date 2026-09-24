#!/usr/bin/env bash
# 作業ディレクトリに、エージェントが読むコードと規約を置く
set -euo pipefail

mkdir -p resources/app/utils
cat > resources/app/utils/slug.ts <<'EOF'
// タグの表示名から URL に使う slug を作る
export const toSlug = (tag: string) =>
	tag
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
EOF

mkdir -p .github/ISSUE_TEMPLATE
cat > .github/ISSUE_TEMPLATE/bug.yml <<'EOF2'
name: 不具合
labels: [bug]
body:
    - type: markdown
      attributes:
          value: 本文40行以内、1節3項目以内、1項目1行
    - type: textarea
      attributes:
          label: ゴール
    - type: textarea
      attributes:
          label: 現状
    - type: textarea
      attributes:
          label: 完了条件
          value: '- [ ] '
EOF2
