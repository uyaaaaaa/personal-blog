import { computed, onMounted, ref } from 'vue'

// Tailwindのlgブレークポイント。Sidebar・TocMobile・ScrollToTopButtonの lg: と同じ幅で切り替える
const DESKTOP_QUERY = '(min-width: 1024px)'

const isDesktop = ref(false)

let query: MediaQueryList | undefined

const start = () => {
	if (query) return

	query = window.matchMedia(DESKTOP_QUERY)
	isDesktop.value = query.matches
	query.addEventListener('change', (event) => {
		isDesktop.value = event.matches
	})
}

export const useIsDesktop = () => {
	onMounted(start)

	return {
		isDesktop,
		isMobile: computed(() => !isDesktop.value),
	}
}
