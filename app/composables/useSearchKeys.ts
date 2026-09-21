import type { useArticleSearch } from '~/composables/useArticleSearch'
import { useFocusTrap } from '~/composables/useFocusTrap'

type Search = Pick<
	ReturnType<typeof useArticleSearch>,
	'activeArticle' | 'moveActive' | 'isComposingKey'
>

type SearchKeysOptions = {
	// キーで候補を選べる条件。選択の見えない状態にキーだけ効かせない
	canSelect: () => boolean
	// Tab の閉じ込めと Escape を窓で受ける間
	isTrapped: Ref<boolean>
	// 記事へ移るときと Escape のときの閉じ方。出る場所ごとに違うのはここだけ
	close: () => void
}

// ↑↓・Enter・Escape の割り当ては、インラインの検索と全画面の検索で1つを共有する。
// 片方だけ直し忘れると、同じ案内を出したまま操作だけが食い違う
export const useSearchKeys = (
	search: Search,
	{ canSelect, isTrapped, close }: SearchKeysOptions,
) => {
	const openActive = () => {
		const article = search.activeArticle.value
		if (!article) return

		close()
		navigateTo(article.path)
	}

	const onKeydown = (event: KeyboardEvent) => {
		if (search.isComposingKey(event)) return
		if (!canSelect()) return

		if (event.key === 'ArrowDown') {
			event.preventDefault()
			search.moveActive(1)
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			search.moveActive(-1)
		} else if (event.key === 'Enter') {
			event.preventDefault()
			openActive()
		}
	}

	const { trapRef } = useFocusTrap(isTrapped, (event) => {
		if (!search.isComposingKey(event)) close()
	})

	return { onKeydown, trapRef }
}
