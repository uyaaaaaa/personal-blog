import { usePublishedArticles } from '~/composables/usePublishedArticles'
import { resultCountMessage, searchArticles } from '~/utils/search'

export const useArticleSearch = () => {
	const { data: articles } = usePublishedArticles()

	const query = ref('')
	const activeIndex = ref(0)

	const results = computed(() => searchArticles(articles.value, query.value))
	const activeArticle = computed(() => results.value[activeIndex.value])
	const countMessage = computed(() => resultCountMessage(results.value.length))

	const moveActive = (delta: number) => {
		const count = results.value.length
		if (count === 0) return

		activeIndex.value = (activeIndex.value + delta + count) % count
	}

	watch(query, () => {
		activeIndex.value = 0
	})

	// Safari は compositionend を keydown より先に出すので、変換の終わり際は自前で覚える
	let composing = false
	let endFrame = 0

	// 変換が切れてすぐ次が始まる IME もあり、待たせたフレームは始まりで取り消す
	const startComposition = () => {
		cancelAnimationFrame(endFrame)
		composing = true
	}

	const endComposition = () => {
		endFrame = requestAnimationFrame(() => {
			composing = false
		})
	}

	const isComposingKey = (event: KeyboardEvent) => event.isComposing || composing

	const clear = () => {
		composing = false
		query.value = ''
	}

	return {
		query,
		results,
		countMessage,
		activeIndex,
		activeArticle,
		moveActive,
		startComposition,
		endComposition,
		isComposingKey,
		clear,
	}
}
