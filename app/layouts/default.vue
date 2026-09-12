<template>
	<div class="layout-container">
		<Header :location="route.fullPath" />
		<main class="flex-1 px-5 pb-16 pt-7 md:px-10 md:pb-24 md:pt-14">
			<div class="mx-auto w-full max-w-column">
				<slot />
			</div>
		</main>
		<Footer />
	</div>
</template>

<script setup lang="ts">
	import Header from '~/components/layout/Header.vue'
	import Footer from '~/components/layout/Footer.vue'

	const route = useRoute()
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

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}
</style>

<style scoped>
	.layout-container {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}
</style>
