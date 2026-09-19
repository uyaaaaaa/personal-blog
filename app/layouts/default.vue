<template>
	<div class="layout-container">
		<Header :location="route.fullPath" />
		<main class="flex-1 px-5 pb-16 pt-7 md:px-10 md:pb-24 md:pt-14">
			<slot />
		</main>
		<Footer />
		<Toast />
	</div>
</template>

<script setup lang="ts">
	import Header from '~/components/layout/Header.vue'
	import Footer from '~/components/layout/Footer.vue'
	import Toast from '~/components/ui/Toast.vue'

	const route = useRoute()

	/* eslint-disable style/no-outline-removal -- 目印が付くのはポインタで移したフォーカスだけ */
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
</style>
