<template>
	<div
		ref="exploreRef"
		class="explore hidden md:flex"
		@pointerenter="openPanelOnHover"
		@pointerleave="scheduleClosePanelOnHover"
		@focusout="onPanelFocusout"
		@keydown.escape="dismissPanel"
	>
		<button
			ref="triggerRef"
			type="button"
			class="explore-trigger"
			aria-controls="header-menu-panel"
			:aria-expanded="isPanelOpen"
			@click="togglePanel"
		>
			Explore
		</button>

		<HeaderMenuPanel
			id="header-menu-panel"
			role="navigation"
			aria-label="Explore"
			:is-open="isPanelOpen"
		>
			<HeaderMenuColumn label="Categories">
				<ul class="menu-list">
					<li
						v-for="category in categories"
						:key="category.slug"
					>
						<NuxtLink
							:to="`/category/${category.slug}`"
							class="menu-category"
							prefetch-on="interaction"
						>
							<span class="menu-category-name">{{ category.label }}</span>
							<span class="menu-category-count">{{ category.count }}</span>
						</NuxtLink>
					</li>
				</ul>
			</HeaderMenuColumn>

			<HeaderMenuColumn label="Latest">
				<ul class="menu-list">
					<li
						v-for="article in latestItems"
						:key="article.path"
					>
						<NuxtLink
							:to="article.path"
							class="menu-article"
							prefetch-on="interaction"
						>
							<span class="menu-article-title">{{ article.title }}</span>
							<time
								class="menu-article-date"
								:datetime="article.date"
								>{{ article.dateLabel }}</time
							>
						</NuxtLink>
					</li>
				</ul>

				<NuxtLink
					to="/article"
					class="menu-all"
					prefetch-on="interaction"
					>View All</NuxtLink
				>
			</HeaderMenuColumn>

			<HeaderMenuColumn label="Tags">
				<ul class="menu-list menu-list-split">
					<li
						v-for="tag in topTags"
						:key="tag.slug"
					>
						<NuxtLink
							:to="`/tags/${tag.slug}`"
							class="menu-tag"
							prefetch-on="interaction"
						>
							<span class="menu-tag-name">{{ tag.name }}</span>
							<span class="menu-tag-count">{{ tag.count }}</span>
						</NuxtLink>
					</li>
				</ul>

				<NuxtLink
					to="/tags"
					class="menu-all"
					prefetch-on="interaction"
					>View All</NuxtLink
				>
			</HeaderMenuColumn>
		</HeaderMenuPanel>
	</div>
</template>

<script setup lang="ts">
	import HeaderMenuColumn from '~/components/layout/HeaderMenuColumn.vue'
	import HeaderMenuPanel from '~/components/layout/HeaderMenuPanel.vue'
	import { useHoverPanel } from '~/composables/useHoverPanel'
	import type { CategorySummary } from '~/utils/category'
	import type { MenuArticle } from '~/utils/menuArticle'
	import type { TagSummary } from '~/utils/tag'

	const props = defineProps<{
		categories: CategorySummary[]
		latestItems: MenuArticle[]
		topTags: TagSummary[]
		location: string
	}>()

	const {
		isOpen: isPanelOpen,
		rootRef: exploreRef,
		triggerRef,
		close: closePanel,
		toggle: togglePanel,
		openOnHover: openPanelOnHover,
		scheduleCloseOnHover: scheduleClosePanelOnHover,
		dismiss: dismissPanel,
		onFocusout: onPanelFocusout,
	} = useHoverPanel()

	watch(() => props.location, closePanel)
</script>

<style scoped>
	.explore {
		align-items: stretch;
	}

	.explore-trigger {
		position: relative;
		display: flex;
		align-items: center;
		padding: 0;
		border: none;
		background: none;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-main);
		cursor: pointer;
		transition: color 0.15s;
	}

	.explore-trigger:hover,
	.explore-trigger[aria-expanded='true'] {
		color: var(--color-accent);
	}

	.explore-trigger::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: -1px;
		height: 2px;
		background-color: var(--color-accent);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.explore-trigger[aria-expanded='true']::after {
		opacity: 1;
	}

	.menu-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.menu-all {
		display: inline-block;
		margin-top: 0.5rem;
		padding: 0.375rem 0.5rem;
		border-radius: 0.375rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-accent);
		transition: background-color 0.15s;
	}

	.menu-all:hover {
		background-color: var(--color-surface-subtle);
	}

	.menu-list-split {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-template-rows: repeat(5, auto);
		grid-auto-flow: column;
		gap: 0 1rem;
	}

	.menu-article,
	.menu-tag,
	.menu-category {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		padding: 0.375rem 0.5rem;
		border-radius: 0.375rem;
		color: var(--color-main);
		transition: background-color 0.15s;
	}

	.menu-article:hover,
	.menu-tag:hover,
	.menu-category:hover {
		background-color: var(--color-surface-subtle);
	}

	.menu-tag,
	.menu-category {
		justify-content: space-between;
		gap: 0.5rem;
	}

	.menu-article-title {
		flex: 1;
		min-width: 0;
		font-size: 0.875rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.menu-article-date {
		flex: none;
		width: 6rem;
		text-align: right;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-sub);
		font-variant-numeric: tabular-nums;
	}

	.menu-tag-name,
	.menu-category-name {
		min-width: 0;
		font-family: var(--font-mono);
		font-size: 0.875rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.menu-tag-count,
	.menu-category-count {
		flex: none;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-sub);
		font-variant-numeric: tabular-nums;
	}
</style>
