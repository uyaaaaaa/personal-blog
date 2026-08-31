<script setup lang="ts">
import Sidebar from '~/components/common/Sidebar.vue'
import BackButton from '~/components/common/BackButton.vue'
import Toc from '~/components/article/Toc.vue'
import TocMobile from '~/components/article/TocMobile.vue'
import ArticleFallback from '~/components/article/ArticleFallback.vue'

const route = useRoute()
const { data: page, error, refresh, status } = await useAsyncData(route.path, () =>
  queryCollection('article').path(route.path).where('published', '=', true).first(),
)

// 取得失敗と「記事が存在しない」は表示も導線も別物なので、ここで区別する。
// errorが無いのに中身が無い場合だけが「存在しない」
const isNotFound = computed(() => !error.value && !page.value)

// 存在しない記事はHTTPステータスも404で返す（見た目はページ内に留めたままSEO上の正しさを保つ）
if (import.meta.server && isNotFound.value) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}

const tocLinks = computed(() => page.value?.body?.toc?.links || [])

// 記事を表示できないページはarticleを名乗らない（OGP上も記事として展開させない）
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

const { scrollTo } = useScrollTo()
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
    <!-- Main Content -->
    <main class="flex-1 min-w-0 max-w-3xl">
      <article class="space-y-8">
        <!-- Back Navigation -->
        <div class="mb-4">
          <BackButton :label="'Back to Articles'" />
        </div>

        <!-- Article Header -->
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

        <!-- Mobile Sticky TOC -->
        <TocMobile :links="tocLinks" />

        <!-- Article Body -->
        <div ref="articleRef" class="prose prose-slate max-w-none">
          <ContentRenderer :value="page" />
        </div>
      </article>

      <!-- Back Navigation -->
      <div class="mt-16">
        <BackButton :label="'Back to Articles'"  />
      </div>
    </main>

    <!-- Sidebar (Desktop) -->
    <Sidebar class="hidden lg:block">
      <template #toc>
        <Toc :links="tocLinks" />
      </template>
    </Sidebar>
  </div>
  
  <!-- 取得失敗: 再試行で同じクエリをやり直せる -->
  <ArticleFallback
    v-else-if="error"
    variant="error"
    :pending="status === 'pending'"
    @retry="refresh()"
  />

  <!-- 記事が存在しない -->
  <ArticleFallback v-else variant="not-found" :path="route.path" />
</template>

<style>
/* 本文リンクの配色は docs/DESIGN_GUIDELINE.md のアクセントカラー定義に準拠 */
.prose a {
  color: var(--color-accent);
  text-decoration: none;
}

.prose a:hover {
  text-decoration: underline;
}

/* Nuxt Contentは見出しテキストを<a>で包むため、上の本文リンク指定から除外する */
.prose :where(h1, h2, h3, h4, h5, h6) a {
  color: inherit;
  text-decoration: none;
}

.prose :where(h1, h2, h3, h4, h5, h6) a:hover {
  color: var(--color-accent);
  text-decoration: none;
}

/* ページ内リンクの着地位置はここで一元管理する。
   JSのスクロール（useScrollTo）とURLハッシュ直開きの両方に効く */
.prose :where(h2, h3, h4, h5, h6) {
  /* 固定ヘッダー64px + 余白24px */
  scroll-margin-top: 88px;
}

@media (min-width: 1024px) {
  .prose :where(h2, h3, h4, h5, h6) {
    /* 固定ヘッダー64px + 余白32px */
    scroll-margin-top: 96px;
  }
}
</style>
