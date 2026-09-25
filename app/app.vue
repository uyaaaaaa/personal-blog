<template>
	<NuxtLoadingIndicator
		color="var(--color-accent)"
		:height="2"
		:throttle="200"
	/>
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>

<script setup lang="ts">
	import { colors, darkColors } from '~~/theme/tokens'

	const colorMode = useColorMode()

	useHead({
		htmlAttrs: {
			class: 'scroll-pt-landing-offset-sm md:scroll-pt-landing-offset lg:scroll-pt-landing-offset-lg',
		},
		meta: [
			{
				name: 'theme-color',
				content: computed(() => (colorMode.value === 'dark' ? darkColors.bg : colors.bg)),
			},
		],
	})
</script>
