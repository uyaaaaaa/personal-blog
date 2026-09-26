<template>
	<div
		v-if="page"
		class="lg:relative lg:grid lg:grid-cols-article lg:gap-toc-gap toc-collapsed:lg:grid-cols-1"
	>
		<div class="min-w-0 space-y-12">
			<article class="space-y-8">
				<header class="space-y-4 border-b border-border pb-8">
					<div
						class="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-meta text-sub"
					>
						<time
							v-if="page.date"
							:datetime="page.date"
							>{{ formatDate(page.date) }}</time
						>
						<span v-if="categoryLabel">{{ categoryLabel }}</span>
						<NuxtLink
							v-for="tag in page.tags"
							:key="tag"
							:to="`/tags/${tagToSlug(tag)}`"
							class="-my-1 py-1 transition-color hover:text-accent"
							>#{{ tag }}</NuxtLink
						>
					</div>

					<h1 class="text-title-sm font-bold text-main md:text-title">
						{{ page.title }}
					</h1>
				</header>

				<TocInline :links="tocLinks" />

				<div class="prose prose-slate max-w-none dark:prose-invert lg:prose-wide">
					<ContentRenderer :value="page" />
				</div>
			</article>

			<ReadNext :current-path="articlePath" />
		</div>

		<aside
			class="hidden lg:block toc-collapsed:lg:absolute toc-collapsed:lg:inset-y-0 toc-collapsed:lg:-right-10 toc-collapsed:lg:w-10"
		>
			<Toc :links="tocLinks" />
		</aside>

		<ScrollToTopButton />
	</div>

	<ArticleFallback
		v-else-if="showError"
		variant="error"
		:pending="retrying"
		@retry="retry()"
	/>

	<ArticleFallback
		v-else-if="isNotFound"
		variant="not-found"
		:path="articlePath"
	/>
</template>

<script setup lang="ts">
	import Toc from '~/components/article/Toc.vue'
	import TocInline from '~/components/article/TocInline.vue'
	import ArticleFallback from '~/components/article/ArticleFallback.vue'
	import ReadNext from '~/components/article/ReadNext.vue'
	import ScrollToTopButton from '~/components/ui/ScrollToTopButton.vue'
	import { usePageSeo } from '~/composables/usePageSeo'
	import { publishedArticles } from '~/utils/articleQuery'
	import { CATEGORY_LABELS, isCategory } from '~/utils/category'
	import { contentPath } from '~/utils/contentPath'
	import { formatDate } from '~/utils/date'
	import { tagToSlug } from '~/utils/tag'

	definePageMeta({ sideColumn: true })

	const route = useRoute()

	const articlePath = computed(() => contentPath(route.path))

	const {
		data: page,
		error,
		refresh,
		status,
	} = await useAsyncData(articlePath.value, () =>
		publishedArticles().path(articlePath.value).first(),
	)

	const isNotFound = computed(() => status.value === 'success' && !page.value)

	// Cloudflare の SSR では @nuxt/content のクエリが失敗し、クライアントの再取得で戻る
	const recovering = ref(Boolean(error.value))
	onMounted(async () => {
		if (!recovering.value) return
		try {
			await refresh()
		} finally {
			recovering.value = false
		}
	})

	const retrying = ref(false)
	const retry = async () => {
		retrying.value = true
		try {
			await refresh()
		} finally {
			retrying.value = false
		}
	}
	const showError = computed(
		() => !recovering.value && (retrying.value || status.value === 'error'),
	)

	if (import.meta.server) {
		const event = useRequestEvent()
		if (event) {
			if (error.value) setResponseStatus(event, 500)
			else if (isNotFound.value) setResponseStatus(event, 404)
		}
	}

	// remark-gfmが脚注セクションに生成するsr-only見出し
	const FOOTNOTE_LABEL_ID = 'footnote-label'

	const tocLinks = computed(() =>
		(page.value?.body?.toc?.links || []).filter(
			(link: { id: string }) => link.id !== FOOTNOTE_LABEL_ID,
		),
	)

	usePageSeo({
		path: () => route.path,
		type: page.value ? 'article' : 'website',
		title: () => page.value?.title ?? (isNotFound.value ? 'Article Not Found' : undefined),
		description: () =>
			page.value?.description ??
			(isNotFound.value
				? 'The article you are looking for may have been removed, or the URL may be incorrect.'
				: undefined),
		publishedTime: () => page.value?.date,
		tags: () => page.value?.tags,
	})

	const categoryLabel = computed(() => {
		const category = page.value?.category
		return category && isCategory(category) ? CATEGORY_LABELS[category] : category
	})
</script>

<style>
	.prose a {
		color: var(--color-accent);
		text-decoration: underline;
		text-decoration-color: rgb(var(--color-accent-rgb) / 0.4);
		overflow-wrap: break-word;
	}

	.prose a:hover {
		text-decoration-color: var(--color-accent);
	}

	.prose h4 a {
		color: inherit;
		text-decoration: none;
	}

	.prose h4 a:hover {
		color: var(--color-accent);
		text-decoration: none;
	}

	.prose [data-footnotes] li:target::marker {
		color: var(--color-accent);
		font-weight: 700;
	}

	.prose [data-footnote-ref]:target {
		font-weight: 700;
		text-decoration: underline;
	}
</style>
