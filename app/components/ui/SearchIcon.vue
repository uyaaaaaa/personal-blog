<template>
	<Icon :size="size">
		<circle
			cx="11"
			cy="11"
			r="8"
		/>
		<line
			x1="21"
			y1="21"
			x2="16.65"
			y2="16.65"
		/>
	</Icon>
</template>

<script setup lang="ts">
	import Icon, { type IconSize } from '~/components/ui/Icon.vue'

	withDefaults(defineProps<{ size?: IconSize }>(), { size: 'small' })
</script>
