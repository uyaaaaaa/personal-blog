<template>
	<footer class="border-t border-border">
		<nav
			class="mx-auto flex max-w-container flex-wrap gap-x-16 gap-y-8 px-4 py-10 md:py-12"
			aria-label="Footer"
		>
			<div
				v-for="group in groups"
				:key="group.label"
			>
				<span
					class="mb-3.5 block font-mono text-xs font-medium uppercase tracking-marker text-sub"
					>{{ group.label }}</span
				>

				<ul class="m-0 flex list-none flex-col gap-2.5 p-0">
					<li
						v-for="link in group.links"
						:key="link.path"
					>
						<NuxtLink
							:to="link.path"
							class="font-mono text-sm"
							prefetch-on="interaction"
							>{{ link.label }}</NuxtLink
						>
					</li>
				</ul>
			</div>
		</nav>
	</footer>
</template>

<script setup lang="ts">
	import { useArticleCategories } from '~/composables/useArticleCategories'

	const { data: categories } = useArticleCategories()

	// Home はヘッダーのロゴが常に出しているので置かない
	const groups = computed(() => [
		{
			label: 'Browse',
			links: [
				{ path: '/article', label: 'All Articles' },
				{ path: '/tags', label: 'Tags' },
			],
		},
		{
			label: 'Categories',
			links: (categories.value ?? []).map((category) => ({
				path: `/category/${category.slug}`,
				label: category.label,
			})),
		},
	])
</script>
