<script setup lang="ts">
import BackButton from '~/components/common/BackButton.vue'

interface Props {
  /** `error`: 取得に失敗した / `not-found`: 取得できたが記事が存在しない */
  variant: 'error' | 'not-found'
  /** 記事が存在しないときに、どのURLを開いたのかを示す */
  path?: string
  /** 再試行の実行中。上端のローディングバーはルート遷移にしか反応しないため、ここで自前に示す */
  pending?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{ retry: [] }>()

// UIの文言は英語で統一する（app/components/error/ErrorView.vue と同じ語り口）
const heading = computed(() =>
  props.variant === 'error' ? 'Unable to Load Article' : 'Article Not Found',
)

const description = computed(() =>
  props.variant === 'error'
    ? 'The connection may be unstable. Please try again in a moment.'
    : 'It may have been removed, or the URL may be incorrect.',
)

// 回遊導線は記事が存在しないときだけ出す。取得失敗時は同じ取得経路が不調なので出さない。
// 本文側の描画をブロックしないよう遅延取得する
const { data: recentArticles } = useLazyAsyncData(
  'article-fallback-recent',
  () =>
    queryCollection('article')
      .where('published', '=', true)
      .order('date', 'DESC')
      .limit(3)
      .all(),
  { immediate: props.variant === 'not-found', default: () => [] },
)
</script>

<template>
  <!-- 本文と同じ最大幅に揃える。サイドバーが無いぶん中央寄せにする -->
  <div class="mx-auto max-w-3xl py-8">
    <!-- 破線で「本来ここに記事がある」ことを示す。面は塗らず枠と余白だけで区切る -->
    <!-- 取得失敗は再試行で内容が変わるため、支援技術へ変化を伝えるライブリージョンにする -->
    <div
      class="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-border bg-white px-6 py-10 text-center"
      :role="variant === 'error' ? 'status' : undefined"
      :aria-busy="variant === 'error' ? String(Boolean(pending)) : undefined"
    >
      <h1 class="text-xl font-bold text-main">{{ heading }}</h1>

      <p v-if="variant === 'not-found' && path" class="rounded bg-code-bg px-2 py-1 font-mono text-xs text-sub">
        {{ path }}
      </p>

      <p class="max-w-sm text-sm text-sub">{{ description }}</p>

      <button
        v-if="variant === 'error'"
        type="button"
        class="mt-1 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-accent"
        :disabled="pending"
        @click="emit('retry')"
      >
        {{ pending ? 'Retrying...' : 'Retry' }}
      </button>

      <BackButton class="mt-1" />
    </div>

    <section v-if="variant === 'not-found' && recentArticles?.length" class="mt-10">
      <h2 class="mb-3 font-mono text-xs tracking-wider text-sub">Recent Articles</h2>
      <ul class="flex flex-col">
        <li v-for="article in recentArticles" :key="article.path" class="border-b border-border">
          <NuxtLink
            :to="article.path"
            class="flex flex-col gap-1 py-3 text-sm text-main transition-colors duration-200 hover:text-accent sm:flex-row sm:items-baseline sm:gap-3"
          >
            <span class="flex-none font-mono text-xs text-sub">{{ formatDate(article.date) }}</span>
            <span>{{ article.title }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
