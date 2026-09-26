const DURATION = 2000

const message = ref('')
const isVisible = ref(false)
const shownCount = ref(0)

let dismiss: ReturnType<typeof setTimeout> | undefined

export const useToast = () => {
	const show = (text: string) => {
		message.value = text
		isVisible.value = true
		shownCount.value++

		clearTimeout(dismiss)
		dismiss = setTimeout(() => {
			isVisible.value = false
		}, DURATION)
	}

	return {
		message,
		isVisible,
		shownCount,
		show,
	}
}
