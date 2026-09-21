import { useFocusTrap } from '~/composables/useFocusTrap'

type Search = {
	activeArticle: Readonly<Ref<{ path: string } | undefined>>
	moveActive: (delta: number) => void
	isComposingKey: (event: KeyboardEvent) => boolean
}

type SearchKeysOptions = {
	canSelect: () => boolean
	isTrapped: Ref<boolean>
	close: () => void
}

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
