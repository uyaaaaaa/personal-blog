<template>
	<ErrorView
		:code="statusCode"
		message="Something went wrong"
		description="The page could not be served. Please try again in a moment."
	/>
</template>

<script setup lang="ts">
	import ErrorView from '~/components/error/ErrorView.vue'

	defineProps<{
		statusCode: number
	}>()
</script>
