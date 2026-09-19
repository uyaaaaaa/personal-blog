<template>
	<h2
		:id="props.id"
		class="group"
		:class="{ relative: !isHidden }"
	>
		<span @click.exact="jump"><slot /></span>
		<HeadingAnchor
			v-if="props.id && !isHidden"
			:heading-id="props.id"
		/>
	</h2>
</template>

<script setup lang="ts">
	import HeadingAnchor from './HeadingAnchor.vue'
	import { useHeadingJump } from '~/composables/useHeadingJump'

	const props = defineProps<{
		id?: string
	}>()

	const { isHidden, jump } = useHeadingJump(() => props.id)

	defineOptions({
		name: 'ProseH2',
	})
</script>
