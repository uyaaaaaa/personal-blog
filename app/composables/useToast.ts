const DURATION = 2000

const message = ref('')
const isVisible = ref(false)

let dismiss: ReturnType<typeof setTimeout> | undefined

export const useToast = () => {
	const show = (text: string) => {
		message.value = text
		isVisible.value = true

		clearTimeout(dismiss)
		dismiss = setTimeout(() => {
			isVisible.value = false
		}, DURATION)
	}

	return {
		message,
		isVisible,
		show,
	}
}
