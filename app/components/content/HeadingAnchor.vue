<template>
	<!-- 見出しの中にある要素の名前は、見出しの読み上げ名に足される -->
	<a
		ref="anchor"
		:href="`#${props.headingId}`"
		aria-hidden="true"
		tabindex="-1"
		class="heading-anchor ml-2 inline-flex items-center justify-center align-middle transition-move lg:absolute lg:right-full lg:top-0 lg:ml-0 lg:mr-2 lg:opacity-0 lg:group-hover:opacity-100"
		@click.exact.prevent="copyAndJump"
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
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</svg>
	</a>
</template>

<script setup lang="ts">
	import { useScrollTo } from '~/composables/useScrollTo'
	import { useToast } from '~/composables/useToast'

	const props = defineProps<{
		headingId: string
	}>()

	const anchor = ref<HTMLAnchorElement | null>(null)

	const { scrollTo } = useScrollTo()
	const { show } = useToast()

	const copyAndJump = async () => {
		scrollTo(props.headingId)

		const url = anchor.value?.href
		if (!url) return

		// navigator.clipboard は非セキュアコンテキストと権限の拒否で使えない
		try {
			await navigator.clipboard.writeText(url)
		} catch {
			return
		}

		show('Link copied')
	}

	defineOptions({
		name: 'HeadingAnchor',
	})
</script>

<style scoped>
	/* 本文のリンクとして prose 側の規則も当たるため、色と下線はここで決め切る */
	.heading-anchor {
		color: var(--color-sub);
		text-decoration: none;
	}

	.heading-anchor:hover {
		color: var(--color-accent);
		text-decoration: none;
	}

	@media (min-width: 1024px) {
		.heading-anchor {
			height: 1lh;
		}
	}
</style>
