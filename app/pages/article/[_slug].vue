<script setup lang="ts">
import Sidebar from '~/components/common/Sidebar.vue'
import BackButton from '~/components/common/BackButton.vue'
import Toc from '~/components/article/Toc.vue'
import TocMobile from '~/components/article/TocMobile.vue'
import ArticleFallback from '~/components/article/ArticleFallback.vue'

const route = useRoute()

// Cloudflare Pagesは /article/foo を /article/foo/ にリダイレクトするが、記事のパスと
// プリレンダ済みペイロードのキーは末尾スラッシュなし。揃えないと記事があるのに無いと判定される
const articlePath = computed(() => route.path.replace(/\/+$/, '') || '/')

const { data: page, error, refresh, status } = await useAsyncData(articlePath.value, () =>
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
  }
  finally {
    recovering.value = false
  }
})

const retrying = ref(false)
const retry = async () => {
  retrying.value = true
  try {
    await refresh()
  }
  finally {
    retrying.value = false
  }
}
const showError = computed(() => !recovering.value && (retrying.value || status.value === 'error'))

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
  (page.value?.body?.toc?.links || []).filter((link: { id: string }) => link.id !== FOOTNOTE_LABEL_ID),
)

usePageSeo({
  type: page.value ? 'article' : 'website',
  title: () => page.value?.title ?? (isNotFound.value ? 'Article Not Found' : undefined),
  description: () =>
    page.value?.description
    ?? (isNotFound.value
      ? 'The article you are looking for may have been removed, or the URL may be incorrect.'
      : undefined),
  image: () => page.value?.image,
  publishedTime: () => page.value?.date,
  tags: () => page.value?.tags,
})

const { scrollTo, beginProgrammaticScroll } = useScrollTo()
const articleRef = ref<HTMLElement | null>(null)

const setupHeaderClickListeners = () => {
  if (!articleRef.value) return
  
  const headers = articleRef.value.querySelectorAll('h2, h3, h4, h5, h6')
  headers.forEach((header) => {
    const el = header as HTMLElement
    el.style.cursor = 'pointer'
    
    el.onclick = (e) => {
      e.preventDefault()
      if (el.id) {
        scrollTo(el.id)
      }
    }
  })
}

const FOOTNOTE_LINK_SELECTOR = 'a[data-footnote-ref], a[data-footnote-backref]'

// pointerdownで目次バーの退避を先行させ、キーボード操作を拾うためにclickでも呼ぶ
const handleFootnoteJump = (event: Event) => {
  const target = event.target as HTMLElement | null
  if (!target?.closest(FOOTNOTE_LINK_SELECTOR)) return

  beginProgrammaticScroll()
}

onMounted(() => {
  setupHeaderClickListeners()
})

watch(() => page.value, async () => {
  await nextTick()
  setupHeaderClickListeners()
})

</script>

<template>
  <div v-if="page" class="flex flex-col lg:flex-row gap-12">
    <main class="flex-1 min-w-0 max-w-3xl">
      <article class="space-y-8">
        <div class="mb-4">
          <BackButton :label="'Back to Articles'" />
        </div>

        <header class="space-y-4 border-b border-border pb-8">
          <div class="flex items-center gap-3 text-sm text-sub font-mono">
             <span v-if="page.date">{{ formatDate(page.date) }}</span>
             <div v-if="page.tags" class="flex gap-2">
               <span v-for="tag in page.tags" :key="tag" class="text-accent">#{{ tag }}</span>
             </div>
             <div v-if="page.category" class="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs uppercase">
               {{ page.category }}
             </div>
          </div>
          
          <h1 class="text-3xl md:text-4xl font-bold text-main leading-tight">
            {{ page.title }}
          </h1>

          <p class="text-sub text-lg leading-relaxed">
            {{ page.description }}
          </p>
        </header>

        <TocMobile :links="tocLinks" />

        <div
          ref="articleRef"
          class="prose prose-slate max-w-none"
          @pointerdown="handleFootnoteJump"
          @click="handleFootnoteJump"
        >
          <ContentRenderer :value="page" />
        </div>
      </article>

      <div class="mt-16">
        <BackButton :label="'Back to Articles'"  />
      </div>
    </main>

    <Sidebar class="hidden lg:block">
      <template #toc>
        <Toc :links="tocLinks" />
      </template>
    </Sidebar>
  </div>
  
  <ArticleFallback
    v-else-if="showError"
    variant="error"
    :pending="retrying"
    @retry="retry()"
  />

  <ArticleFallback v-else-if="isNotFound" variant="not-found" :path="articlePath" />
</template>

<style>
.prose a {
  color: var(--color-accent);
  text-decoration: none;
}

.prose a:hover {
  text-decoration: underline;
}

.prose :where(h1, h2, h3, h4, h5, h6) a {
  color: inherit;
  text-decoration: none;
}

.prose :where(h1, h2, h3, h4, h5, h6) a:hover {
  color: var(--color-accent);
  text-decoration: none;
}

.prose {
  --landing-offset: 88px;
}

@media (min-width: 1024px) {
  .prose {
    --landing-offset: 96px;
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
