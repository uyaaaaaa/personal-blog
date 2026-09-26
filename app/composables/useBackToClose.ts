const MARK = 'backToClose'

const withoutTrailingSlash = (location: string) => location.replace(/\/$/, '')

// vue-router は query と hash まで同じ遷移を重複として捨て、積んだ履歴を置き換えない
const isSamePage = (to: string, from: string) =>
	withoutTrailingSlash(to) === withoutTrailingSlash(from)

const markOf = (state: unknown) =>
	typeof state === 'object' && state !== null
		? (state as Record<string, unknown>)[MARK]
		: undefined

export const useBackToClose = (isOpen: Ref<boolean>, close: () => void) => {
	let pushed = false
	let opened = 0
	let key = ''

	const isOwnEntry = () => markOf(history.state) === key

	const onPopState = () => {
		if (!pushed || isOwnEntry()) return

		pushed = false
		close()
	}

	// back() は非同期で、直後の遷移の pushState より後に効くことがある
	const leave = (to: string, from: string) => {
		if (!isSamePage(to, from)) pushed = false
	}

	watch(isOpen, (open) => {
		if (open) {
			// vue-router は replace で state を引き継ぐので、置き換えた先にも印が残る。印は開くたびに変える
			opened += 1
			key = `${Date.now()}:${opened}`
			// vue-router が位置の計算に使う state を引き継ぐ
			history.pushState({ ...history.state, [MARK]: key }, '')
			pushed = true
			return
		}

		if (pushed && isOwnEntry()) history.back()
		pushed = false
	})

	onMounted(() => window.addEventListener('popstate', onPopState))
	onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))

	return { leave }
}
