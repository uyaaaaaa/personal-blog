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

	const ACTIONS: Record<string, () => void> = {
		ArrowDown: () => search.moveActive(1),
		ArrowUp: () => search.moveActive(-1),
		Enter: openActive,
	}

	const onKeydown = (event: KeyboardEvent) => {
		if (search.isComposingKey(event)) return
		if (!canSelect()) return

		const action = ACTIONS[event.key]
		if (!action) return

		event.preventDefault()
		action()
	}

	const { trapRef } = useFocusTrap(isTrapped, (event) => {
		if (!search.isComposingKey(event)) close()
	})

	return { onKeydown, trapRef }
}
