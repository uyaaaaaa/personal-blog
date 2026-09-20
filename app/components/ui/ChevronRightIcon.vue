<template>
	<Icon :size="size">
		<path d="M9 18l6-6-6-6" />
	</Icon>
</template>

<script setup lang="ts">
	import Icon, { type IconSize } from '~/components/ui/Icon.vue'

	withDefaults(defineProps<{ size?: IconSize }>(), { size: 'base' })
</script>
