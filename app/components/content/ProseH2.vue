<template>
	<h2
		:id="props.id"
		class="group relative"
		@click.exact="jump"
	>
		<slot />
		<HeadingAnchor
			v-if="props.id"
			:heading-id="props.id"
		/>
	</h2>
</template>

<script setup lang="ts">
	import HeadingAnchor from './HeadingAnchor.vue'
	import { useScrollTo } from '~/composables/useScrollTo'
	import { shouldJumpToHeading } from '~/utils/heading'

	const props = defineProps<{
		id?: string
	}>()

	const { scrollTo } = useScrollTo()

	const jump = (event: MouseEvent) => {
		if (!props.id || !shouldJumpToHeading(event, window.getSelection())) return

		scrollTo(props.id)
	}

	defineOptions({
		name: 'ProseH2',
	})
</script>
