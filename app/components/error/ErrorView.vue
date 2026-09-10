<template>
	<div class="error-container">
		<div class="error-content">
			<h1 class="error-code">{{ code }}</h1>
			<p class="error-message">{{ message }}</p>
			<p class="error-description">{{ description }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
	defineProps<{
		code: number | string
		message: string
		description: string
	}>()
</script>

<style scoped>
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		color: var(--color-main);
		font-family: var(--font-sans);
		text-align: center;
		padding: 1rem;
	}

	.error-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		max-width: 36rem;
	}

	.error-code {
		font-size: 8rem;
		font-weight: 700;
		font-family: var(--font-mono);
		margin: 0;
		line-height: 1;
		letter-spacing: -0.05em;
	}

	.error-message {
		font-size: 2rem;
		font-weight: 600;
		margin: 1rem 0 0.5rem;
	}

	.error-description {
		font-size: 1rem;
		color: var(--color-sub);
		line-height: 1.6;
	}
</style>
