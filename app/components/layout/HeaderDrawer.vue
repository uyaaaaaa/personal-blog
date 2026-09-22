<template>
	<div class="flex items-center md:hidden">
		<button
			ref="menuButtonRef"
			type="button"
			class="mobile-menu-btn"
			@click="emit('toggle')"
			aria-label="Menu"
			aria-haspopup="dialog"
			:aria-expanded="isOpen"
		>
			<MenuIcon />
		</button>

		<div
			ref="lockRef"
			class="mobile-menu-overlay"
			:class="{ 'is-open': isOpen }"
			@click="emit('close')"
		>
			<div
				ref="trapRef"
				class="mobile-drawer"
				role="dialog"
				aria-modal="true"
				aria-label="Menu"
				@click.stop
			>
				<div class="drawer-header h-header-sm">
					<button
						type="button"
						class="drawer-close"
						aria-label="Close menu"
						@click="closeDrawer"
					>
						<CloseIcon />
					</button>
				</div>

				<nav class="drawer-nav">
					<NuxtLink
						to="/"
						class="drawer-row"
						@click="closeDrawer"
					>
						<HomeIcon class="drawer-icon" />
						<span class="drawer-row-label">Home</span>
					</NuxtLink>

					<NuxtLink
						to="/profile"
						class="drawer-row"
						prefetch-on="interaction"
						@click="closeDrawer"
					>
						<UserIcon class="drawer-icon" />
						<span class="drawer-row-label">Profile</span>
					</NuxtLink>

					<p class="drawer-section-label tracking-marker">Explore</p>

					<button
						type="button"
						class="drawer-row"
						:aria-expanded="isCategoriesOpen"
						aria-controls="drawer-group-categories"
						@click="isCategoriesOpen = !isCategoriesOpen"
					>
						<FolderIcon class="drawer-icon" />
						<span class="drawer-row-label">{{ groups.categories.heading }}</span>
						<ChevronDownIcon
							class="drawer-chevron"
							:class="{ 'is-open': isCategoriesOpen }"
						/>
					</button>

					<div
						id="drawer-group-categories"
						class="drawer-collapse"
						:class="{ 'is-open': isCategoriesOpen }"
					>
						<ul class="drawer-sublist">
							<li
								v-for="item in groups.categories.items"
								:key="item.key"
							>
								<NuxtLink
									:to="item.href"
									class="drawer-subrow drawer-subrow-split"
									prefetch-on="interaction"
									@click="closeDrawer"
								>
									<span class="drawer-subrow-name">{{ item.primary }}</span>
									<span class="drawer-subrow-count">{{ item.secondary }}</span>
								</NuxtLink>
							</li>
						</ul>
					</div>

					<button
						type="button"
						class="drawer-row"
						:aria-expanded="isLatestOpen"
						aria-controls="drawer-group-latest"
						@click="isLatestOpen = !isLatestOpen"
					>
						<ClockIcon class="drawer-icon" />
						<span class="drawer-row-label">{{ groups.latest.heading }}</span>
						<ChevronDownIcon
							class="drawer-chevron"
							:class="{ 'is-open': isLatestOpen }"
						/>
					</button>

					<div
						id="drawer-group-latest"
						class="drawer-collapse"
						:class="{ 'is-open': isLatestOpen }"
					>
						<ul class="drawer-sublist">
							<li
								v-for="item in groups.latest.items"
								:key="item.key"
							>
								<NuxtLink
									:to="item.href"
									class="drawer-subrow"
									prefetch-on="interaction"
									@click="closeDrawer"
								>
									<span class="drawer-subrow-title">{{ item.primary }}</span>
									<time
										class="drawer-subrow-meta"
										:datetime="item.datetime"
										>{{ item.secondary }}</time
									>
								</NuxtLink>
							</li>
							<li v-if="groups.latest.viewAllHref">
								<NuxtLink
									:to="groups.latest.viewAllHref"
									class="drawer-subrow drawer-subrow-all"
									prefetch-on="interaction"
									@click="closeDrawer"
								>
									View All
								</NuxtLink>
							</li>
						</ul>
					</div>

					<button
						type="button"
						class="drawer-row"
						:aria-expanded="isTagsOpen"
						aria-controls="drawer-group-tags"
						@click="isTagsOpen = !isTagsOpen"
					>
						<TagIcon class="drawer-icon" />
						<span class="drawer-row-label">{{ groups.tags.heading }}</span>
						<ChevronDownIcon
							class="drawer-chevron"
							:class="{ 'is-open': isTagsOpen }"
						/>
					</button>

					<div
						id="drawer-group-tags"
						class="drawer-collapse"
						:class="{ 'is-open': isTagsOpen }"
					>
						<ul class="drawer-sublist">
							<li
								v-for="item in groups.tags.items"
								:key="item.key"
							>
								<NuxtLink
									:to="item.href"
									class="drawer-subrow drawer-subrow-split"
									prefetch-on="interaction"
									@click="closeDrawer"
								>
									<span class="drawer-subrow-name">{{ item.primary }}</span>
									<span class="drawer-subrow-count">{{ item.secondary }}</span>
								</NuxtLink>
							</li>
							<li v-if="groups.tags.viewAllHref">
								<NuxtLink
									:to="groups.tags.viewAllHref"
									class="drawer-subrow drawer-subrow-all"
									prefetch-on="interaction"
									@click="closeDrawer"
								>
									View All
								</NuxtLink>
							</li>
						</ul>
					</div>
				</nav>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import ChevronDownIcon from '~/components/ui/ChevronDownIcon.vue'
	import ClockIcon from '~/components/ui/ClockIcon.vue'
	import CloseIcon from '~/components/ui/CloseIcon.vue'
	import FolderIcon from '~/components/ui/FolderIcon.vue'
	import HomeIcon from '~/components/ui/HomeIcon.vue'
	import MenuIcon from '~/components/ui/MenuIcon.vue'
	import TagIcon from '~/components/ui/TagIcon.vue'
	import UserIcon from '~/components/ui/UserIcon.vue'
	import { focusByGesture } from '~/composables/gestureFocus'
	import { releaseBackdrop, useBackdropInert } from '~/composables/useBackdropInert'
	import { useFocusTrap } from '~/composables/useFocusTrap'
	import { useTouchScrollLock } from '~/composables/useTouchScrollLock'
	import type { MenuGroups } from '~/utils/menuGroup'

	const props = defineProps<{
		isOpen: boolean
		groups: MenuGroups
	}>()

	const emit = defineEmits<{
		(e: 'toggle'): void
		(e: 'close'): void
	}>()

	const menuButtonRef = ref<HTMLButtonElement | null>(null)

	const closeDrawer = () => {
		releaseBackdrop()
		focusByGesture(menuButtonRef.value)
		emit('close')
	}

	const { trapRef } = useFocusTrap(toRef(props, 'isOpen'), closeDrawer)

	useBackdropInert(toRef(props, 'isOpen'), trapRef)

	const { lockRef } = useTouchScrollLock()

	const isCategoriesOpen = ref(false)
	const isLatestOpen = ref(false)
	const isTagsOpen = ref(false)
</script>

<style scoped>
	.mobile-menu-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: none;
		border: none;
		border-radius: 0.375rem;
		color: var(--color-sub);
		cursor: pointer;
		padding: 0;
		transition: color 0.15s;
	}

	.mobile-menu-btn:hover {
		color: var(--color-accent);
	}

	.mobile-menu-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		height: 100dvh;
		background-color: var(--color-overlay);
		z-index: 110;
		opacity: 0;
		visibility: hidden;
		overflow: hidden;
		transition:
			opacity 0.2s ease-in-out,
			visibility 0.2s ease-in-out;
	}

	.mobile-menu-overlay.is-open {
		opacity: 1;
		visibility: visible;
	}

	.mobile-drawer {
		position: absolute;
		top: 0;
		right: 0;
		width: 80%;
		max-width: 20rem;
		height: 100%;
		background-color: var(--color-surface);
		border-left: 1px solid var(--color-border);
		padding: 0 0.75rem 2rem;
		overflow-y: auto;
		overscroll-behavior: contain;
		transform: translateX(100%);
		transition: transform 0.2s ease-in-out;
	}

	.mobile-menu-overlay.is-open .mobile-drawer {
		transform: translateX(0);
	}

	.drawer-header {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		justify-content: flex-end;
		align-items: center;
		margin: 0 -0.75rem 0.5rem;
		padding: 0 1rem;
		background-color: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}

	.drawer-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: none;
		border-radius: 0.5rem;
		background: none;
		color: var(--color-main);
		cursor: pointer;
	}

	.drawer-close:hover {
		background-color: var(--color-surface-subtle);
	}

	.drawer-nav {
		display: flex;
		flex-direction: column;
	}

	.drawer-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: none;
		border-radius: 0.5rem;
		background: none;
		font-family: inherit;
		font-size: 1rem;
		font-weight: 500;
		text-align: left;
		color: var(--color-main);
		text-decoration: none;
		cursor: pointer;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.drawer-row:hover {
		background-color: var(--color-surface-subtle);
	}

	.drawer-row.router-link-exact-active {
		background-color: var(--color-surface-subtle);
		font-weight: 600;
	}

	.drawer-icon {
		flex: none;
		color: var(--color-sub);
	}

	.drawer-row-label {
		flex: 1;
		min-width: 0;
	}

	.drawer-chevron {
		flex: none;
		color: var(--color-sub);
		transform: rotate(-90deg);
		transition: transform 0.2s ease-in-out;
	}

	.drawer-chevron.is-open {
		transform: rotate(0deg);
	}

	.drawer-section-label {
		margin: 1.25rem 0 0.375rem;
		padding: 0 0.75rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-sub);
	}

	.drawer-collapse {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.2s ease-in-out;
	}

	.drawer-collapse.is-open {
		grid-template-rows: 1fr;
	}

	.drawer-sublist {
		list-style: none;
		min-height: 0;
		margin: 0 0 0 1.5rem;
		padding: 0;
		overflow: hidden;
		border-left: 1px solid var(--color-border);
		visibility: hidden;
		transition: visibility 0.2s ease-in-out;
	}

	.drawer-collapse.is-open .drawer-sublist {
		visibility: visible;
	}

	.drawer-subrow {
		display: block;
		padding: 0.5rem 0.625rem;
		margin-left: 0.25rem;
		border-radius: 0.375rem;
		color: var(--color-main);
		text-decoration: none;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.drawer-subrow:hover {
		background-color: var(--color-surface-subtle);
	}

	.drawer-subrow.router-link-exact-active {
		background-color: var(--color-surface-subtle);
		font-weight: 600;
	}

	.drawer-subrow-title {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.drawer-subrow-meta {
		display: block;
		margin-top: 0.125rem;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-sub);
	}

	.drawer-subrow-split {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.drawer-subrow-name {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		overflow-wrap: break-word;
	}

	.drawer-subrow-count {
		flex: none;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-sub);
	}

	.drawer-subrow-all {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-accent);
	}
</style>
