<template>
	<header class="global-header h-header-sm md:h-header">
		<div class="header-inner mx-auto max-w-container px-4">
			<NuxtLink
				to="/"
				class="logo text-logo"
				@click="closeMenu"
			>
				<LogoMarkIcon />
				<span>Tech Blog</span>
			</NuxtLink>

			<button
				ref="desktopSearchRef"
				type="button"
				class="search-trigger mx-8 hidden max-w-search-trigger flex-1 items-center gap-2 rounded-md border border-border-field bg-surface-subtle px-4 py-2 transition-color hover:border-accent md:flex"
				aria-haspopup="dialog"
				:aria-expanded="isSearchOpen"
				@click="openSearch"
			>
				<SearchIcon class="search-trigger-icon" />
				<span class="search-trigger-label">Search...</span>
				<span
					class="search-trigger-kbd rounded-kbd border border-border bg-surface px-1.5 py-0.5 text-meta text-sub"
					aria-hidden="true"
				>
					<span :class="{ invisible: !isCommandKey }">⌘K</span>
					<span :class="{ invisible: isCommandKey }">Ctrl K</span>
				</span>
			</button>

			<div class="flex items-stretch gap-1 self-stretch md:gap-5">
				<button
					ref="mobileSearchRef"
					type="button"
					class="flex h-8 w-8 items-center justify-center self-center rounded-md text-sub transition-color hover:text-accent md:hidden"
					aria-label="Search"
					aria-haspopup="dialog"
					:aria-expanded="isSearchOpen"
					@click="openSearch"
				>
					<SearchIcon size="large" />
				</button>

				<ThemeToggle class="self-center" />
				<NuxtLink
					to="/profile"
					class="profile-link hidden items-center font-mono text-ui font-medium text-main transition-color hover:text-accent md:flex"
					prefetch-on="interaction"
					>Profile</NuxtLink
				>
				<Navigation
					:is-open="isMenuOpen"
					:location="location"
					@toggle="toggleMenu"
					@close="closeMenu"
				/>
			</div>
		</div>
	</header>

	<SearchDialog
		:is-open="isSearchOpen"
		:location="location"
		@close="closeSearch"
	/>
</template>

<script setup lang="ts">
	import LogoMarkIcon from '~/components/layout/LogoMarkIcon.vue'
	import Navigation from '~/components/layout/HeaderNavigation.vue'
	import SearchDialog from '~/components/layout/SearchDialog.vue'
	import ThemeToggle from '~/components/layout/ThemeToggle.vue'
	import SearchIcon from '~/components/ui/SearchIcon.vue'
	import { focusByGesture } from '~/composables/gestureFocus'
	import { releaseBackdrop } from '~/composables/useBackdropInert'
	import { isSearchShortcut, usesCommandKey } from '~/utils/shortcut'

	const props = defineProps<{
		location: string
	}>()

	const isMenuOpen = ref(false)
	const isSearchOpen = ref(false)
	const isCommandKey = ref(true)
	const desktopSearchRef = ref<HTMLElement | null>(null)
	const mobileSearchRef = ref<HTMLElement | null>(null)

	let searchOpener: HTMLElement | null = null

	const toggleMenu = () => {
		isMenuOpen.value = !isMenuOpen.value
	}

	const closeMenu = () => {
		isMenuOpen.value = false
		releaseBackdrop()
	}

	const isShown = (element: HTMLElement | null) => (element?.getClientRects().length ?? 0) > 0

	const visibleTrigger = () =>
		[desktopSearchRef.value, mobileSearchRef.value].find(isShown) ?? null

	const openSearchFrom = (opener: HTMLElement | null) => {
		searchOpener = opener
		focusByGesture(opener)
		isSearchOpen.value = true
	}

	const openSearch = (event: MouseEvent) => {
		openSearchFrom(event.currentTarget instanceof HTMLElement ? event.currentTarget : null)
	}

	const closeSearch = () => {
		if (!isSearchOpen.value) return

		isSearchOpen.value = false
		releaseBackdrop()
		focusByGesture(isShown(searchOpener) ? searchOpener : visibleTrigger())
		searchOpener = null
	}

	const onSearchShortcut = (event: KeyboardEvent) => {
		if (!isSearchShortcut(event)) return
		if (event.isComposing) return

		event.preventDefault()

		if (isSearchOpen.value) {
			closeSearch()
			return
		}

		closeMenu()
		openSearchFrom(visibleTrigger())
	}

	onMounted(() => {
		isCommandKey.value = usesCommandKey(navigator.platform)
		window.addEventListener('keydown', onSearchShortcut)
	})
	onBeforeUnmount(() => window.removeEventListener('keydown', onSearchShortcut))

	watch([isMenuOpen, isSearchOpen], (open) => {
		document.body.classList.toggle('scroll-locked', open.some(Boolean))
	})

	watch(
		() => props.location,
		() => {
			closeMenu()
			closeSearch()
		},
	)
</script>

<style>
	body.scroll-locked {
		overflow: hidden;
	}
</style>

<style scoped>
	.profile-link.router-link-active {
		color: var(--color-accent);
	}
</style>

<style scoped>
	.global-header {
		position: sticky;
		top: 0;
		z-index: 100;
		background-color: var(--color-header-bg);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--color-border);
		display: flex;
		align-items: center;
	}

	.header-inner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		height: 100%;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		font-family: var(--font-mono);
		letter-spacing: -0.025em;
	}

	.search-trigger-icon {
		flex: none;
		color: var(--color-sub);
	}

	.search-trigger-label {
		flex: 1;
		min-width: 0;
		text-align: left;
		font-size: 0.875rem;
		color: var(--color-sub);
	}

	.search-trigger-kbd {
		flex: none;
		display: grid;
	}

	.search-trigger-kbd > * {
		grid-area: 1 / 1;
	}
</style>
