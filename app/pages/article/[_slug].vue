<script setup lang="ts">
	import Toc from '~/components/article/Toc.vue'
	import TocInline from '~/components/article/TocInline.vue'
	import ArticleFallback from '~/components/article/ArticleFallback.vue'
	import ScrollToTopButton from '~/components/ui/ScrollToTopButton.vue'
	import { usePageSeo } from '~/composables/usePageSeo'
	import { CATEGORY_LABELS, isCategory } from '~/utils/category'
	import { formatDate } from '~/utils/date'
	import { tagToSlug } from '~/utils/tag'

	const route = useRoute()

	// Cloudflare Pagesは /article/foo を /article/foo/ にリダイレクトするが、記事のパスと
	// プリレンダ済みペイロードのキーは末尾スラッシュなし。揃えないと記事があるのに無いと判定される
	const articlePath = computed(() => route.path.replace(/\/+$/, '') || '/')

	const {
		data: page,
		error,
		refresh,
		status,
	} = await useAsyncData(articlePath.value, () =>
		queryCollection('article').path(articlePath.value).where('published', '=', true).first(),
	)

	const isNotFound = computed(() => status.value === 'success' && !page.value)

	// CloudflareのSSRでは@nuxt/contentのクエリが失敗しうる。この失敗はクライアントの
	// 再取得で復帰するため、復帰するまではカードを出さない（出すと一瞬エラーが見えてしまう）
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
		image: () => page.value?.image,
		publishedTime: () => page.value?.date,
		tags: () => page.value?.tags,
	})

	const categoryLabel = computed(() => {
		const category = page.value?.category
		return category && isCategory(category) ? CATEGORY_LABELS[category] : category
	})
</script>

<template>
	<div
		v-if="page"
		class="mx-auto w-full max-w-column lg:grid lg:max-w-article lg:grid-cols-article lg:gap-14"
	>
		<main class="min-w-0">
			<article class="space-y-8">
				<header class="space-y-4 border-b border-border pb-8">
					<div
						class="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-sub"
					>
						<time
							v-if="page.date"
							:datetime="page.date"
							>{{ formatDate(page.date) }}</time
						>
						<span
							v-if="categoryLabel"
							class="text-accent"
							>{{ categoryLabel }}</span
						>
						<NuxtLink
							v-for="tag in page.tags"
							:key="tag"
							:to="`/tags/${tagToSlug(tag)}`"
							class="transition-colors hover:text-accent"
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
		</main>

		<aside class="hidden lg:block">
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

	.prose {
		--landing-offset: 76px;
	}

	@media (min-width: 768px) {
		.prose {
			--landing-offset: 84px;
		}
	}

	@media (min-width: 1024px) {
		.prose {
			--landing-offset: 92px;
		}
	}

	.prose :where(h2, h3, h4, h5, h6),
	.prose [data-footnote-ref],
	.prose [data-footnotes] li {
		scroll-margin-top: var(--landing-offset);
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
