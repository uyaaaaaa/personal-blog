<script setup lang="ts">
import Sidebar from '~/components/common/Sidebar.vue'
import BackButton from '~/components/common/BackButton.vue'
import Toc from '~/components/article/Toc.vue'
import TocMobile from '~/components/article/TocMobile.vue'

const route = useRoute()
const { data: page } = await useAsyncData(route.path, () =>
  queryCollection('blog').path(route.path).where('published', '=', true).first(),
)

const tocLinks = computed(() => page.value?.body?.toc?.links || [])

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
        const isDesktop = window.matchMedia('(min-width: 1024px)').matches
        const offset = isDesktop ? 80 : 130
        
        scrollTo(el.id, offset)
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
          <BackButton :label="'Back to Blog'" />
        </div>

        <!-- Article Header -->
        <header class="space-y-4 border-b border-border pb-8">
          <div class="flex items-center gap-3 text-sm text-sub font-mono">
             <span v-if="page.date">{{ new Date(page.date).toLocaleDateString() }}</span>
             <div v-if="page.tags" class="flex gap-2">
               <span v-for="tag in page.tags" :key="tag" class="text-accent">#{{ tag }}</span>
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
        <div ref="articleRef" class="prose prose-slate max-w-none hover:prose-a:text-accent">
          <ContentRenderer :value="page" />
        </div>
      </article>

      <!-- Back Navigation -->
      <div class="mt-16">
        <BackButton :label="'Back to Blog'"  />
      </div>
    </main>

    <!-- Sidebar (Desktop) -->
    <Sidebar class="hidden lg:block">
      <template #toc>
        <Toc :links="tocLinks" />
      </template>
    </Sidebar>
  </div>
  
  <div v-else class="py-12 text-center">
    <h1 class="text-2xl font-bold text-main">Article not found</h1>
    <NuxtLink to="/blog" class="text-accent hover:underline mt-4 inline-block">Back to Blog</NuxtLink>
  </div>
</template>
