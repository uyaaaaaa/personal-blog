<script setup lang="ts">
	import HeadingAnchor from './HeadingAnchor.vue'

	const props = defineProps<{
		id?: string
	}>()

	defineOptions({
		name: 'ProseH3',
	})
</script>

<template>
	<h3
		:id="props.id"
		class="group"
	>
		<slot />
		<HeadingAnchor
			v-if="props.id"
			:heading-id="props.id"
		/>
	</h3>
</template>
