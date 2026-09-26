<template>
	<a
		ref="anchor"
		:href="`#${props.headingId}`"
		aria-label="Copy link to this section"
		lang="en"
		class="heading-anchor ml-1 inline-flex min-h-6 min-w-6 items-center justify-center align-middle transition-move lg:absolute lg:right-full lg:top-0 lg:ml-0 lg:mr-1 lg:opacity-0 lg:focus-visible:opacity-100 lg:group-hover:opacity-100"
		@click.exact.prevent="copyAndJump"
	>
		<LinkIcon />
	</a>
</template>

<script setup lang="ts">
	import LinkIcon from '~/components/ui/LinkIcon.vue'
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
