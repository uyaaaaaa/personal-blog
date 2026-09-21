type Resolvable<T> = T | Ref<T> | (() => T)

type PageSeoInput = {
	path: Resolvable<string>
	title?: Resolvable<string | undefined>
	description?: Resolvable<string | undefined>
	type?: 'website' | 'article'
	publishedTime?: Resolvable<string | undefined>
	tags?: Resolvable<string[] | undefined>
	noindex?: boolean
}

const SITE_NAME = 'Tech Blog'
const SITE_DESCRIPTION =
	'Functional Minimalism for Experts. Technical articles on software engineering, architecture, and design.'
const DEFAULT_OGP_IMAGE = '/ogp.png'

// robots.txt で弾くとこの宣言自体が読まれず、URL だけが検索結果に載る。
// nofollow は、たどった先が索引に載るまでの猶予を削るため
const NOINDEX = 'noindex, nofollow'

/**
 * og:imageやog:urlは絶対URLでないとクローラが解決できないため、
 * runtimeConfig.public.siteUrl を基準に組み立てる。
 */
export const usePageSeo = (input: PageSeoInput) => {
	const { siteUrl } = useRuntimeConfig().public
	const origin = String(siteUrl).replace(/\/+$/, '')

	const toAbsoluteUrl = (path: string) =>
		/^https?:\/\//.test(path) ? path : `${origin}${path.startsWith('/') ? '' : '/'}${path}`

	const title = computed(() => {
		const pageTitle = toValue(input.title)?.trim()
		return pageTitle ? `${pageTitle} | ${SITE_NAME}` : SITE_NAME
	})
	const description = computed(() => toValue(input.description)?.trim() || SITE_DESCRIPTION)
	const image = toAbsoluteUrl(DEFAULT_OGP_IMAGE)
	const url = computed(() => toAbsoluteUrl(toValue(input.path)))

	useSeoMeta({
		title: () => title.value,
		description: () => description.value,

		robots: input.noindex ? NOINDEX : undefined,

		ogType: input.type ?? 'website',
		ogSiteName: SITE_NAME,
		ogLocale: 'ja_JP',
		ogUrl: () => url.value,
		ogTitle: () => title.value,
		ogDescription: () => description.value,
		ogImage: image,
		ogImageAlt: () => title.value,
		ogImageType: 'image/png',
		ogImageWidth: 1200,
		ogImageHeight: 630,

		articlePublishedTime: () =>
			input.type === 'article' ? toValue(input.publishedTime) : undefined,
		articleTag: () => (input.type === 'article' ? toValue(input.tags) : undefined),

		twitterCard: 'summary_large_image',
		twitterTitle: () => title.value,
		twitterDescription: () => description.value,
		twitterImage: image,
		twitterImageAlt: () => title.value,
	})
}
