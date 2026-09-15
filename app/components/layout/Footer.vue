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
				<span class="footer-head">{{ group.label }}</span>

				<ul class="footer-list">
					<li
						v-for="link in group.links"
						:key="link.path"
					>
						<NuxtLink
							:to="link.path"
							class="footer-link"
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

<style scoped>
	.footer-head {
		display: block;
		margin-bottom: 0.875rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-sub);
	}

	.footer-list {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.footer-link {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		color: var(--color-main);
	}
</style>
