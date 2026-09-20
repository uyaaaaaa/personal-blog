<template>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		:class="ICON_SIZE_CLASS[size]"
	>
		<!-- 形を値で受けるのは、種類で引く一覧のように形が実行時に決まるときだけ -->
		<g
			v-if="shape"
			v-html="shape"
		/>
		<slot v-else />
	</svg>
</template>

<script lang="ts">
	// 大きさはここが持つ。置く側のクラスや属性に預けると、同じ強さのユーティリティは
	// 生成された CSS の並び順で決まり、属性は CSS に負けるので、置き場所ごとに勝者が変わる
	const ICON_SIZE_CLASS = {
		small: 'h-icon-small w-icon-small',
		base: 'h-icon w-icon',
		large: 'h-icon-large w-icon-large',
	} as const

	export type IconSize = keyof typeof ICON_SIZE_CLASS
</script>

<script setup lang="ts">
	withDefaults(
		defineProps<{
			size?: IconSize
			shape?: string
		}>(),
		{ size: 'base', shape: '' },
	)
</script>
