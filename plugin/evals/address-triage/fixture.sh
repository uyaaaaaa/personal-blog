#!/usr/bin/env bash
# 作業ディレクトリに、エージェントが読むコードと規約を置く
set -euo pipefail

mkdir -p resources
cat > resources/RULES.md <<'EOF'
# このリポジトリの規約

- 表示用の整形は `src/utils/format.ts` に集める。コンポーネントの中で日付や数値を整形しない
- 実装の不足をコメントで補わない。直せるなら直し、直せないなら issue にする
EOF

mkdir -p resources/src/components
cat > resources/src/components/PostCard.vue <<'EOF'
<script setup lang="ts">
	import { formatDate } from '../utils/format'

	const props = defineProps<{ title: string; date: Date }>()
</script>

<template>
	<article>
		<h2>{{ props.title }}</h2>
		<time>{{ formatDate(props.date) }}</time>
	</article>
</template>
EOF

mkdir -p resources/src/components
cat > resources/src/components/PostHeader.vue <<'EOF'
<script setup lang="ts">
	import { formatDate } from '../utils/format'

	const props = defineProps<{ title: string; date: Date; tags: string[] }>()
</script>

<template>
	<header>
		<h1>{{ props.title }}</h1>
		<time>{{ formatDate(props.date) }}</time>
		<ul>
			<li
				v-for="tag in props.tags"
				:key="tag"
			>
				{{ tag }}
			</li>
		</ul>
	</header>
</template>
EOF

mkdir -p resources/src/utils
cat > resources/src/utils/format.ts <<'EOF'
export const formatDate = (value: Date) =>
	`${value.getFullYear()}/${value.getMonth()}/${value.getDate()}`
EOF
