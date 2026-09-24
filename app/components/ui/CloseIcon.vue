<template>
	<Icon :size="size">
		<path d="M18 6 6 18" />
		<path d="m6 6 12 12" />
	</Icon>
</template>

<script setup lang="ts">
	import Icon, { type IconSize } from '~/components/ui/Icon.vue'

	withDefaults(defineProps<{ size?: IconSize }>(), { size: 'large' })
</script>
