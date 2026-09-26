import { useScrollTo } from './useScrollTo'
import { isScreenReaderOnly, shouldJumpToHeading } from '~/utils/heading'

export const useHeadingJump = (id: () => string | undefined) => {
	const attrs = useAttrs()

	const isHidden = computed(() => isScreenReaderOnly(attrs.class))

	const { scrollTo } = useScrollTo()

	const jump = (event: MouseEvent) => {
		const target = id()
		if (!target || isHidden.value) return
		if (!shouldJumpToHeading(event, window.getSelection())) return

		scrollTo(target)
	}

	return {
		isHidden,
		jump,
	}
}
