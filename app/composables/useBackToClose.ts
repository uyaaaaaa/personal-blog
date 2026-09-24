const MARK = 'backToClose'

const isMarked = (state: unknown) => typeof state === 'object' && state !== null && MARK in state

export const useBackToClose = (isOpen: Ref<boolean>, close: () => void) => {
	let pushed = false

	const onPopState = () => {
		if (!pushed || isMarked(history.state)) return

		pushed = false
		close()
	}

	// back() は非同期で、直後の遷移の pushState より後に効くことがある
	const release = () => {
		pushed = false
	}

	watch(isOpen, (open) => {
		if (open) {
			// vue-router が位置の計算に使う state を引き継ぐ
			history.pushState({ ...history.state, [MARK]: true }, '')
			pushed = true
			return
		}

		if (pushed && isMarked(history.state)) history.back()
		pushed = false
	})

	onMounted(() => window.addEventListener('popstate', onPopState))
	onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))

	return { release }
}
