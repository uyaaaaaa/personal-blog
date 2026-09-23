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

			<HeaderSearch
				ref="inlineSearchRef"
				@update:open="isInlineSearchOpen = $event"
			/>

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

	<div
		class="search-scrim"
		:class="{ 'is-open': isInlineSearchOpen }"
	/>

	<SearchDialog
		:is-open="isSearchOpen"
		@close="closeSearch"
	/>
</template>

<script setup lang="ts">
	import HeaderSearch from '~/components/layout/HeaderSearch.vue'
	import LogoMarkIcon from '~/components/layout/LogoMarkIcon.vue'
	import Navigation from '~/components/layout/HeaderNavigation.vue'
	import SearchDialog from '~/components/layout/SearchDialog.vue'
	import ThemeToggle from '~/components/layout/ThemeToggle.vue'
	import SearchIcon from '~/components/ui/SearchIcon.vue'
	import { focusByGesture } from '~/composables/gestureFocus'
	import { releaseBackdrop } from '~/composables/useBackdropInert'
	import { isSearchShortcut } from '~/utils/shortcut'

	const props = defineProps<{
		location: string
	}>()

	const isMenuOpen = ref(false)
	const isSearchOpen = ref(false)
	const isInlineSearchOpen = ref(false)
	const inlineSearchRef = ref<InstanceType<typeof HeaderSearch> | null>(null)
	const mobileSearchRef = ref<HTMLElement | null>(null)

	let searchOpener: HTMLElement | null = null

	const toggleMenu = () => {
		isMenuOpen.value = !isMenuOpen.value
	}

	const closeMenu = () => {
		isMenuOpen.value = false
		releaseBackdrop()
	}

	const openSearchFrom = (opener: HTMLElement | null) => {
		searchOpener = opener
		focusByGesture(opener)
		isSearchOpen.value = true
	}

	const openSearch = (event: MouseEvent) => {
		openSearchFrom(event.currentTarget instanceof HTMLElement ? event.currentTarget : null)
	}

	const closeSearch = () => {
		isSearchOpen.value = false
		releaseBackdrop()
		focusByGesture(searchOpener)
		searchOpener = null
	}

	const onSearchShortcut = (event: KeyboardEvent) => {
		if (!isSearchShortcut(event)) return
		if (event.isComposing) return

		event.preventDefault()

		if (isSearchOpen.value) return

		closeMenu()

		if (inlineSearchRef.value?.isVisible()) {
			inlineSearchRef.value.focus()
			return
		}

		openSearchFrom(mobileSearchRef.value)
	}

	onMounted(() => {
		window.addEventListener('keydown', onSearchShortcut)
	})
	onBeforeUnmount(() => window.removeEventListener('keydown', onSearchShortcut))

	watch([isMenuOpen, isSearchOpen, isInlineSearchOpen], (open) => {
		document.body.classList.toggle('scroll-locked', open.some(Boolean))
	})

	watch(
		() => props.location,
		() => {
			closeMenu()
			closeSearch()
			inlineSearchRef.value?.close()
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

	.search-scrim {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		height: 100dvh;
		background-color: var(--color-overlay-subtle);
		z-index: 90;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 0.2s ease-in-out,
			visibility 0s linear 0.2s;
	}

	.search-scrim.is-open {
		opacity: 1;
		visibility: visible;
		transition:
			opacity 0.2s ease-in-out,
			visibility 0s;
	}
</style>
