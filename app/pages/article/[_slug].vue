<script setup lang="ts">
import Sidebar from '~/components/common/Sidebar.vue'
import BackButton from '~/components/common/BackButton.vue'
import Toc from '~/components/article/Toc.vue'
import TocMobile from '~/components/article/TocMobile.vue'

const route = useRoute()
const { data: page } = await useAsyncData(route.path, () =>
  queryCollection('article').path(route.path).where('published', '=', true).first(),
)

const tocLinks = computed(() => page.value?.body?.toc?.links || [])

usePageSeo({
  type: 'article',
  title: () => page.value?.title,
  description: () => page.value?.description,
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

        <div ref="articleRef" class="prose prose-slate max-w-none">
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
  
  <div v-else class="py-12 text-center">
    <h1 class="text-2xl font-bold text-main">Article not found</h1>
    <NuxtLink to="/article" class="text-accent hover:underline mt-4 inline-block">Back to Articles</NuxtLink>
  </div>
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

.prose :where(h2, h3, h4, h5, h6) {
  scroll-margin-top: 88px;
}

@media (min-width: 1024px) {
  .prose :where(h2, h3, h4, h5, h6) {
    scroll-margin-top: 96px;
  }
}
</style>
