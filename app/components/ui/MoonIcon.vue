<template>
	<Icon :size="size">
		<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
	</Icon>
</template>

<script setup lang="ts">
	import Icon, { type IconSize } from '~/components/ui/Icon.vue'

	withDefaults(defineProps<{ size?: IconSize }>(), { size: 'inline' })
</script>
