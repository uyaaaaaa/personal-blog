<template>
	<button
		type="button"
		:aria-label="copied ? 'Link copied' : 'Copy link to this section'"
		class="heading-anchor absolute right-full top-0 flex w-4 items-center justify-center transition-color md:mr-2"
		:class="copied ? 'text-accent' : 'text-sub hover:text-accent'"
		@click="copy"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<polyline
				v-if="copied"
				points="20 6 9 17 4 12"
			/>
			<template v-else>
				<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
				<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
			</template>
		</svg>
	</button>
</template>

<script setup lang="ts">
	const COPIED_DURATION = 1500

	const props = defineProps<{
		headingId: string
	}>()

	const copied = ref(false)

	let restore: ReturnType<typeof setTimeout> | undefined

	const copy = async () => {
		const url = `${location.origin}${location.pathname}#${props.headingId}`

		// navigator.clipboard は非セキュアコンテキストと権限の拒否で使えない。
		// 入っていないものを入ったと見せないため、失敗したときは何も出さない
		try {
			await navigator.clipboard.writeText(url)
		} catch {
			return
		}

		copied.value = true
		clearTimeout(restore)
		restore = setTimeout(() => {
			copied.value = false
		}, COPIED_DURATION)
	}

	onBeforeUnmount(() => clearTimeout(restore))

	defineOptions({
		name: 'HeadingAnchor',
	})
</script>

<style scoped>
	.heading-anchor {
		height: 1lh;
	}
</style>
