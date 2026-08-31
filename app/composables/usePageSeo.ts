type Resolvable<T> = T | Ref<T> | (() => T)

type PageSeoInput = {
  /** ページ固有のタイトル。省略するとサイト名だけになる */
  title?: Resolvable<string | undefined>
  /** 省略・空文字ならサイト共通の説明文にフォールバックする */
  description?: Resolvable<string | undefined>
  /** 記事フロントマターのimage。省略するとデフォルトのOGP画像を使う */
  image?: Resolvable<string | undefined>
  type?: 'website' | 'article'
  /** og:type が article のときだけ意味を持つ */
  publishedTime?: Resolvable<string | undefined>
  tags?: Resolvable<string[] | undefined>
}

const SITE_NAME = 'Tech Blog'
const SITE_DESCRIPTION
  = 'Functional Minimalism for Experts. Technical articles on software engineering, architecture, and design.'
/** public/ogp.png。1200x630で生成している（doc/ICON_GUIDELINE.md 参照） */
const DEFAULT_OGP_IMAGE = '/ogp.png'

/**
 * ページのtitle/descriptionとOGP・Twitter Cardのメタタグをまとめて設定する。
 * og:imageやog:urlは絶対URLでないとクローラが解決できないため、
 * runtimeConfig.public.siteUrl を基準に組み立てる。
 */
export const usePageSeo = (input: PageSeoInput = {}) => {
  const route = useRoute()
  const { siteUrl } = useRuntimeConfig().public
  const origin = String(siteUrl).replace(/\/+$/, '')

  const toAbsoluteUrl = (path: string) =>
    /^https?:\/\//.test(path) ? path : `${origin}${path.startsWith('/') ? '' : '/'}${path}`

  const customImage = computed(() => toValue(input.image)?.trim() || undefined)

  const title = computed(() => {
    const pageTitle = toValue(input.title)?.trim()
    return pageTitle ? `${pageTitle} | ${SITE_NAME}` : SITE_NAME
  })
  const description = computed(() => toValue(input.description)?.trim() || SITE_DESCRIPTION)
  const image = computed(() => toAbsoluteUrl(customImage.value ?? DEFAULT_OGP_IMAGE))
  const url = computed(() => toAbsoluteUrl(route.path))

  useSeoMeta({
    title: () => title.value,
    description: () => description.value,

    ogType: input.type ?? 'website',
    ogSiteName: SITE_NAME,
    ogLocale: 'ja_JP',
    ogUrl: () => url.value,
    ogTitle: () => title.value,
    ogDescription: () => description.value,
    ogImage: () => image.value,
    ogImageAlt: () => title.value,
    // 寸法はデフォルト画像のものなので、記事側で差し替えられた場合は出さない
    ogImageType: () => (customImage.value ? undefined : 'image/png'),
    ogImageWidth: () => (customImage.value ? undefined : 1200),
    ogImageHeight: () => (customImage.value ? undefined : 630),

    articlePublishedTime: () => (input.type === 'article' ? toValue(input.publishedTime) : undefined),
    articleTag: () => (input.type === 'article' ? toValue(input.tags) : undefined),

    twitterCard: 'summary_large_image',
    twitterTitle: () => title.value,
    twitterDescription: () => description.value,
    twitterImage: () => image.value,
    twitterImageAlt: () => title.value,
  })
}
