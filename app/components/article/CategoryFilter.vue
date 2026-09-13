<script setup lang="ts">
	import { useArticleCategories } from '~/composables/useArticleCategories'
	import { categoryFilterItems, type Category } from '~/utils/category'

	const props = defineProps<{
		current: Category | null
	}>()

	const { data: categories } = useArticleCategories()

	const items = computed(() => categoryFilterItems(categories.value ?? [], props.current))
</script>

<template>
	<nav aria-label="Categories">
		<ul class="flex flex-wrap gap-3">
			<li
				v-for="item in items"
				:key="item.key"
			>
				<NuxtLink
					:to="item.path"
					:aria-current="item.current ? 'page' : undefined"
					class="flex items-baseline gap-2 rounded-full border px-3 py-1.5 font-mono text-sm transition-colors"
					:class="
						item.current
							? 'border-accent text-accent'
							: 'border-border text-main hover:border-main hover:text-main'
					"
					prefetch-on="interaction"
				>
					<span>{{ item.label }}</span>
					<span class="text-xs text-sub">{{ item.count }}</span>
				</NuxtLink>
			</li>
		</ul>
	</nav>
</template>
