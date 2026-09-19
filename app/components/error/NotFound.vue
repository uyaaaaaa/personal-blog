<template>
	<ErrorView
		code="404"
		message="Page not found"
		description="The URL may be mistyped, or the page may have been moved."
	/>
</template>

<script setup lang="ts">
	import ErrorView from '~/components/error/ErrorView.vue'
</script>
