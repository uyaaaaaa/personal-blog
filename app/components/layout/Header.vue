<template>
	<header class="global-header">
		<div class="header-inner container">
			<NuxtLink
				to="/"
				class="logo"
				@click="closeMenu"
			>
				<svg
					class="logo-mark"
					viewBox="0 0 32 32"
					width="26"
					height="26"
					aria-hidden="true"
					focusable="false"
				>
					<rect
						width="32"
						height="32"
						rx="7"
						fill="#1A1A1A"
					/>
					<path
						d="M8.5 10.5 v6.2 a4.6 4.6 0 0 0 9.2 0 v-6.2"
						fill="none"
						stroke="#FFFFFF"
						stroke-width="3.2"
						stroke-linecap="round"
					/>
					<path
						d="M17.7 10.5 v11"
						fill="none"
						stroke="#FFFFFF"
						stroke-width="3.2"
						stroke-linecap="round"
					/>
					<line
						x1="26"
						y1="9.5"
						x2="22.4"
						y2="22.5"
						stroke="#8B5CF6"
						stroke-width="3"
						stroke-linecap="round"
					/>
				</svg>
				<span>Tech Blog</span>
			</NuxtLink>

			<div class="mx-8 hidden max-w-md flex-1 md:flex">
				<button
					ref="desktopSearchRef"
					type="button"
					class="group flex w-full items-center justify-between rounded-md border border-border bg-surface-subtle px-4 py-2 text-sub transition-colors hover:border-accent"
					aria-haspopup="dialog"
					:aria-expanded="isSearchOpen"
					@click="openSearch"
				>
					<span class="flex items-center gap-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="h-4 w-4 group-hover:text-accent"
						>
							<circle
								cx="11"
								cy="11"
								r="8"
							></circle>
							<line
								x1="21"
								y1="21"
								x2="16.65"
								y2="16.65"
							></line>
						</svg>
						<span class="text-sm">Search...</span>
					</span>
					<span
						class="rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-sub"
						>Cmd+K</span
					>
				</button>
			</div>

			<div class="flex items-stretch gap-3 self-stretch md:gap-5">
				<button
					ref="mobileSearchRef"
					type="button"
					class="flex h-8 w-8 items-center justify-center self-center rounded-md text-sub transition-colors hover:text-accent md:hidden"
					aria-label="Search"
					aria-haspopup="dialog"
					:aria-expanded="isSearchOpen"
					@click="openSearch"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<circle
							cx="11"
							cy="11"
							r="8"
						></circle>
						<line
							x1="21"
							y1="21"
							x2="16.65"
							y2="16.65"
						></line>
					</svg>
				</button>

				<ThemeToggle class="self-center" />
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
		@close="closeSearch"
	/>
</template>

<script setup lang="ts">
	import Navigation from '~/components/layout/HeaderNavigation.vue'
	import SearchDialog from '~/components/layout/SearchDialog.vue'
	import ThemeToggle from '~/components/layout/ThemeToggle.vue'
	import { isSearchShortcut } from '~/utils/shortcut'

	const props = defineProps<{
		location: string
	}>()

	const isMenuOpen = ref(false)
	const isSearchOpen = ref(false)
	const desktopSearchRef = ref<HTMLElement | null>(null)
	const mobileSearchRef = ref<HTMLElement | null>(null)

	// 戻し先はデスクトップとSPで別のボタンになるので、押されたものを覚える
	let searchOpener: HTMLElement | null = null

	const toggleMenu = () => {
		isMenuOpen.value = !isMenuOpen.value
	}

	const closeMenu = () => {
		isMenuOpen.value = false
	}

	const openSearchFrom = (opener: HTMLElement | null) => {
		searchOpener = opener
		// Safari と Firefox は click で button にフォーカスを移さないので、開く前に寄せる
		opener?.focus()
		isSearchOpen.value = true
	}

	const openSearch = (event: MouseEvent) => {
		openSearchFrom(event.currentTarget instanceof HTMLElement ? event.currentTarget : null)
	}

	const closeSearch = () => {
		isSearchOpen.value = false
		searchOpener?.focus()
		searchOpener = null
	}

	// 隠れている側に戻すと、閉じた後のフォーカスが見えない要素に乗る
	const visibleSearchButton = () =>
		[desktopSearchRef.value, mobileSearchRef.value].find(
			(button) => button && button.getClientRects().length > 0,
		) ?? null

	const onSearchShortcut = (event: KeyboardEvent) => {
		if (!isSearchShortcut(event)) return
		// 変換中の Ctrl+K は mac の IME がカタカナ変換に使う。横取りしない
		if (event.isComposing) return

		event.preventDefault()
		// 開き直すと入力済みが消えるので、開いている間はブラウザの検索を止めるだけ
		if (isSearchOpen.value) return

		// ドロワーは検索より下の層に残り、開いたままだと戻し先のボタンを覆う
		closeMenu()
		openSearchFrom(visibleSearchButton())
	}

	onMounted(() => window.addEventListener('keydown', onSearchShortcut))
	onBeforeUnmount(() => window.removeEventListener('keydown', onSearchShortcut))

	watch([isMenuOpen, isSearchOpen], ([menuOpen, searchOpen]) => {
		document.body.style.overflow = menuOpen || searchOpen ? 'hidden' : ''
	})

	// リンクを踏まない移動（ブラウザバック）でも、被せたものは残さない
	watch(
		() => props.location,
		() => {
			closeMenu()
			closeSearch()
		},
	)
</script>

<style scoped>
	.global-header {
		position: sticky;
		top: 0;
		z-index: 100;
		background-color: var(--color-header-bg);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--color-border);
		height: 4rem;
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
		font-size: 1.25rem;
		font-family: var(--font-mono);
		letter-spacing: -0.025em;
	}

	.logo-mark {
		flex: none;
		display: block;
	}
</style>
