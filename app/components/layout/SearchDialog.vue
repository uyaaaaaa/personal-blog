<template>
	<div
		ref="lockRef"
		class="search-overlay md:px-4 md:pb-4 md:pt-16"
		:class="{ 'is-open': isOpen }"
		@pointerdown="onOverlayPointerDown"
		@click="onOverlayClick"
	>
		<div
			ref="trapRef"
			class="search-dialog h-full bg-surface md:h-auto md:max-w-search-open md:rounded-card md:border md:border-border md:shadow-lg"
			role="dialog"
			aria-modal="true"
			aria-label="Search articles"
		>
			<div class="search-field">
				<SearchIcon class="search-field-icon" />
				<input
					ref="inputRef"
					v-model="query"
					type="text"
					role="combobox"
					enterkeyhint="search"
					class="search-input"
					placeholder="Search articles by title or tag"
					aria-label="Search articles by title or tag"
					aria-autocomplete="list"
					:aria-expanded="results.length > 0"
					:aria-controls="results.length > 0 ? LIST_ID : undefined"
					:aria-activedescendant="
						results.length > 0 ? `${LIST_ID}-${activeIndex}` : undefined
					"
					autocomplete="off"
					@keydown="onFieldKeydown"
					@compositionstart="startComposition"
					@compositionend="endComposition"
				/>
				<button
					type="button"
					class="search-cancel -my-3 flex-none py-3 text-ui text-accent md:hidden"
					@click="emit('close')"
				>
					Cancel
				</button>
			</div>

			<p
				class="sr-only"
				role="status"
			>
				{{ statusMessage }}
			</p>

			<p
				v-if="results.length === 0"
				class="search-note"
				aria-hidden="true"
			>
				{{ emptyMessage }}
			</p>
			<SearchResults
				v-else
				:id="LIST_ID"
				:results="results"
				:active-index="activeIndex"
				@select="selectResult"
				@close="emit('close')"
				@activate="activeIndex = $event"
			/>

			<p
				v-if="results.length > 0"
				class="search-keys hidden md:block"
			>
				↑↓ to move, ⏎ to open, esc to close
			</p>
		</div>
	</div>
</template>

<script setup lang="ts">
	import SearchResults from '~/components/layout/SearchResults.vue'
	import SearchIcon from '~/components/ui/SearchIcon.vue'
	import { focusByGesture } from '~/composables/gestureFocus'
	import { useBackToClose } from '~/composables/useBackToClose'
	import { useBackdropInert } from '~/composables/useBackdropInert'
	import { usePublishedArticles } from '~/composables/usePublishedArticles'
	import { useSearchKeys } from '~/composables/useSearchKeys'
	import { useTouchScrollLock } from '~/composables/useTouchScrollLock'
	import { resultCountMessage, searchArticles } from '~/utils/search'

	const LIST_ID = 'search-dialog-results'

	const props = defineProps<{
		isOpen: boolean
		location: string
	}>()

	const emit = defineEmits<{
		(e: 'close'): void
	}>()

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

	const inputRef = ref<HTMLInputElement | null>(null)

	const isTyped = computed(() => query.value.trim() !== '')

	const emptyMessage = computed(() =>
		isTyped.value ? countMessage.value : 'Type to search articles by title or tag.',
	)
	const statusMessage = computed(() => (isTyped.value ? countMessage.value : ''))

	let pressedOnOverlay = false

	const onOverlayPointerDown = (event: PointerEvent) => {
		pressedOnOverlay = event.target === event.currentTarget
	}

	const onOverlayClick = () => {
		if (pressedOnOverlay) emit('close')
	}

	const { release } = useBackToClose(toRef(props, 'isOpen'), () => emit('close'))

	const withoutTrailingSlash = (location: string) => location.replace(/\/$/, '')

	// vue-router は query と hash まで同じ遷移を重複として捨て、積んだ履歴を置き換えない
	const selectResult = (path: string) => {
		if (withoutTrailingSlash(path) !== withoutTrailingSlash(props.location)) release()
		emit('close')
	}

	const { onKeydown: onInputKeydown, trapRef } = useSearchKeys(
		{ activeArticle, moveActive, isComposingKey },
		{
			canSelect: () => results.value.length > 0,
			isTrapped: toRef(props, 'isOpen'),
			close: () => emit('close'),
			select: selectResult,
		},
	)

	// ソフトキーボードの Enter はハードウェアのものと区別できる値を持たない。出ている間は表示領域だけが縮む
	const SOFT_KEYBOARD_MIN_HEIGHT = 120

	const visibleViewport = () => {
		const viewport = window.visualViewport
		if (!viewport) return undefined

		return { width: viewport.width * viewport.scale, height: viewport.height * viewport.scale }
	}

	// レイアウトの高さごと縮めるブラウザもあるので、触って使う端末では開いた時点の高さとも比べる。回転で幅が変わればその高さは使えない
	let opened: ReturnType<typeof visibleViewport>

	const rememberViewportBeforeKeyboard = () => {
		opened = visibleViewport()
	}

	const isTouchPrimary = () => window.matchMedia('(pointer: coarse)').matches

	const isSoftKeyboardShown = () => {
		const now = visibleViewport()
		if (!now) return false

		const openedHeight = isTouchPrimary() && opened?.width === now.width ? opened.height : 0
		const fullHeight = Math.max(window.innerHeight, openedHeight)

		return fullHeight - now.height >= SOFT_KEYBOARD_MIN_HEIGHT
	}

	const isSearchKeyOfSoftKeyboard = (event: KeyboardEvent) =>
		event.key === 'Enter' && !isComposingKey(event) && isSoftKeyboardShown()

	const onFieldKeydown = (event: KeyboardEvent) => {
		if (isSearchKeyOfSoftKeyboard(event)) {
			event.preventDefault()
			inputRef.value?.blur()
			return
		}

		return onInputKeydown(event)
	}

	const { lockRef } = useTouchScrollLock()

	useBackdropInert(toRef(props, 'isOpen'), trapRef)

	watch(
		() => props.isOpen,
		(isOpen) => {
			if (!isOpen) return

			clear()
			rememberViewportBeforeKeyboard()
			focusByGesture(inputRef.value, { asPointer: true })
		},
		{ flush: 'post' },
	)

	/* eslint-disable style/no-outline-removal -- 目印は枠のアクセント線が持つ。開き方によらず出る */
</script>

<style scoped>
	.search-overlay {
		position: fixed;
		top: 0;
		left: 0;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		width: 100%;
		height: 100vh;
		height: 100dvh;
		background-color: var(--color-overlay);
		z-index: 120;
		opacity: 0;
		visibility: hidden;
		overflow: hidden;
		overscroll-behavior: contain;
		/* 開く側も遅らせると visibility: hidden の1フレームが空き、そこで focus() が効かない */
		transition:
			opacity 0.2s ease-in-out,
			visibility 0s linear 0.2s;
	}

	.search-overlay.is-open {
		opacity: 1;
		visibility: visible;
		transition:
			opacity 0.2s ease-in-out,
			visibility 0s;
	}

	.search-dialog {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-height: 100%;
		overflow: hidden;
		transform: translateY(-4px);
		transition: transform 0.2s ease-in-out;
	}

	.search-overlay.is-open .search-dialog {
		transform: translateY(0);
	}

	.search-field {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border-field);
	}

	.search-field:focus-within {
		border-bottom-color: var(--color-accent);
	}

	.search-input:focus-visible {
		outline: none;
	}

	.search-field-icon {
		flex: none;
		color: var(--color-sub);
	}

	.search-input {
		flex: 1;
		min-width: 0;
		border: none;
		background: none;
		font-family: inherit;
		font-size: 1rem;
		color: var(--color-main);
	}

	.search-input::placeholder {
		color: var(--color-sub);
	}

	.search-note {
		margin: 0;
		padding: 1rem;
		font-size: 0.875rem;
		color: var(--color-sub);
	}

	/* 出し分けはTailwindの md: に統一しているため、displayはここで指定しない */
	.search-keys {
		flex: none;
		margin: 0;
		padding: 0.5rem 1rem;
		border-top: 1px solid var(--color-border);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-sub);
	}
</style>
