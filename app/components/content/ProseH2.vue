<script setup lang="ts">
	import HeadingAnchor from './HeadingAnchor.vue'

	const props = defineProps<{
		id?: string
	}>()

	defineOptions({
		name: 'ProseH2',
	})
</script>

<template>
	<h2
		:id="props.id"
		class="group"
	>
		<slot />
		<HeadingAnchor
			v-if="props.id"
			:heading-id="props.id"
		/>
	</h2>
</template>
