<template>
	<div class="layout-container">
		<a
			href="#main-content"
			lang="en"
			class="skip-link"
			>Skip to content</a
		>
		<Header :location="route.fullPath" />
		<main
			id="main-content"
			tabindex="-1"
			class="main-content flex-1 scroll-mt-below-header-sm px-5 pb-16 pt-7 md:scroll-mt-below-header md:px-10 md:pb-24 md:pt-14"
		>
			<div
				class="mx-auto w-full"
				:class="measure"
			>
				<slot />
			</div>
		</main>
		<Footer :measure="measure" />
		<Toast />
	</div>
</template>

<script setup lang="ts">
	import Header from '~/components/layout/Header.vue'
	import Footer from '~/components/layout/Footer.vue'
	import Toast from '~/components/ui/Toast.vue'
	import { focusMainContent } from '~/composables/gestureFocus'

	const route = useRoute()
	const router = useRouter()

	const measure = computed(() =>
		route.meta.sideColumn ? 'max-w-column lg:max-w-article' : 'max-w-column',
	)

	// 戻る・進むはブラウザが位置を戻すので触らない
	let traversedTo: string | undefined
	let stopListening: (() => void) | undefined
	let stopAfterEach: (() => void) | undefined

	onMounted(() => {
		stopListening = router.options.history.listen((to) => {
			traversedTo = router.resolve(to).fullPath
		})
		stopAfterEach = router.afterEach((to, from, failure) => {
			const byHistory = to.fullPath === traversedTo
			if (byHistory) traversedTo = undefined
			if (failure || byHistory || to.path === from.path) return

			nextTick(focusMainContent)
		})
	})

	onUnmounted(() => {
		stopListening?.()
		stopAfterEach?.()
	})

	/* eslint-disable style/no-outline-removal -- 目印が付くのはポインタで移したフォーカスと、開いた直後に自動で寄せたフォーカスだけ */
</script>

<style>
	body {
		margin: 0;
		font-family: var(--font-sans);
		background-color: var(--color-bg);
		color: var(--color-main);
		line-height: 1.5;
	}

	:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	[data-pointer-focus]:focus-visible {
		outline: none;
	}

	*,
	*::before,
	*::after {
		box-sizing: border-box;
	}

	a {
		text-decoration: none;
		color: inherit;
		transition: color 0.15s ease;
	}

	a:hover {
		color: var(--color-accent);
	}
</style>

<style scoped>
	.layout-container {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.main-content:focus-visible {
		outline-offset: -2px;
	}

	.skip-link {
		position: fixed;
		top: 0.75rem;
		left: 0.75rem;
		z-index: 130;
		padding: 0.5rem 1rem;
		background-color: var(--color-surface);
		color: var(--color-main);
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		transform: translateY(-150%);
	}

	.skip-link:focus {
		transform: translateY(0);
	}
</style>
