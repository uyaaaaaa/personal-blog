<template>
	<article
		v-if="page"
		class="space-y-8"
	>
		<header class="space-y-4 border-b border-border pb-8">
			<time
				v-if="page.date"
				class="font-mono text-meta text-sub"
				:datetime="page.date"
				>{{ formatDate(page.date) }}</time
			>

			<h1 class="text-title-sm font-bold text-main md:text-title">{{ page.title }}</h1>
		</header>

		<div class="prose max-w-none lg:prose-wide">
			<ContentRenderer :value="page" />
		</div>
	</article>
</template>

<script setup lang="ts">
	import { usePageSeo } from '~/composables/usePageSeo'
	import { contentPath } from '~/utils/contentPath'
	import { formatDate } from '~/utils/date'
	import { digests } from '~/utils/digestQuery'

	const route = useRoute()

	const path = computed(() => contentPath(route.path))

	const { data: page } = await useAsyncData(path.value, () => digests().path(path.value).first())

	if (import.meta.server && !page.value) {
		const event = useRequestEvent()
		if (event) setResponseStatus(event, 404)
	}

	usePageSeo({
		path: () => route.path,
		title: () => page.value?.title,
		noindex: true,
	})
</script>
