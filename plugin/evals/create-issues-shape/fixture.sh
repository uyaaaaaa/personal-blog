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
