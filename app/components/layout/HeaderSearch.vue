<template>
	<div
		ref="trapRef"
		class="header-search mx-8 hidden max-w-search-trigger flex-1 items-center self-stretch focus-within:max-w-search-open md:flex"
	>
		<div
			class="search-field flex w-full items-center gap-2 rounded-md border border-border bg-surface-subtle px-4 py-2 transition-color focus-within:border-accent"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="search-field-icon"
				aria-hidden="true"
			>
				<circle
					cx="11"
					cy="11"
					r="8"
				/>
				<line
					x1="21"
					y1="21"
					x2="16.65"
					y2="16.65"
				/>
			</svg>
			<!-- WebKit は type="search" にクリアボタンを足す。クラスを付けられない擬似要素なので、type では出させず、役割は role、仮想キーボードの検索キーは enterkeyhint で補う -->
			<input
				ref="inputRef"
				v-model="query"
				type="text"
				role="combobox"
				enterkeyhint="search"
				class="search-input"
				placeholder="Search..."
				aria-label="Search articles by title or tag"
				aria-autocomplete="list"
				:aria-expanded="isOpen"
				:aria-controls="isOpen ? LIST_ID : undefined"
				:aria-activedescendant="
					isOpen && results.length > 0 ? `${LIST_ID}-${activeIndex}` : undefined
				"
				autocomplete="off"
				@pointerdown="onPointerdown"
				@keydown="onKeydown"
				@input="dismissed = false"
				@compositionstart="startComposition"
				@compositionend="endComposition"
			/>
			<span class="rounded-kbd border border-border bg-surface px-1.5 py-0.5 text-xs text-sub"
				>⌘K</span
			>
		</div>

		<div
			class="search-panel-layer"
			:class="{ 'is-open': isOpen }"
		>
			<div
				class="search-panel max-h-search-panel rounded-card border border-border bg-surface shadow-lg"
			>
				<p
					v-if="results.length === 0"
					class="search-note"
					role="status"
				>
					No articles found.
				</p>
				<SearchResults
					v-else
					:id="LIST_ID"
					:results="results"
					:active-index="activeIndex"
					@select="close"
					@activate="activeIndex = $event"
				/>

				<p
					v-if="results.length > 0"
					class="search-keys"
				>
					↑↓ to move, ⏎ to open, esc to close
				</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import SearchResults from '~/components/layout/SearchResults.vue'
	import { focusByGesture } from '~/composables/gestureFocus'
	import { useArticleSearch } from '~/composables/useArticleSearch'
	import { useFocusTrap } from '~/composables/useFocusTrap'

	const LIST_ID = 'header-search-results'

	// Tailwind の md。この入れ物を出し分ける幅と同じで、ずれると隠れたまま開いたことになり、
	// 背後を止めたまま誰も閉じられなくなる
	const INLINE_SEARCH_QUERY = '(min-width: 768px)'

	const emit = defineEmits<{
		(e: 'update:open', value: boolean): void
	}>()

	const {
		query,
		results,
		activeIndex,
		activeArticle,
		moveActive,
		startComposition,
		endComposition,
		isComposingKey,
		clear,
	} = useArticleSearch()

	const inputRef = ref<HTMLInputElement | null>(null)

	// Escape で閉じた後も語は残す。打ち直しで開き直すので、開いているかは語だけでは決まらない
	const dismissed = ref(false)

	const isOpen = computed(() => !dismissed.value && query.value.trim() !== '')

	const dismiss = () => {
		dismissed.value = true
	}

	const close = () => {
		dismissed.value = true
		clear()
	}

	const focus = () => {
		const input = inputRef.value
		if (!input) return

		focusByGesture(input)
		input.select()
	}

	// 押して開くボタンを挟まず直にフォーカスされるので、ポインタで移した目印は自分で付ける
	const onPointerdown = () => focusByGesture(inputRef.value)

	const isVisible = () => (inputRef.value?.getClientRects().length ?? 0) > 0

	const openActive = () => {
		const article = activeArticle.value
		if (!article) return

		close()
		navigateTo(article.path)
	}

	const onKeydown = (event: KeyboardEvent) => {
		if (isComposingKey(event)) return

		// 開いている間の Escape は閉じ込めの listener が受ける。2度目だけがここに届く
		if (event.key === 'Escape') {
			if (isOpen.value) return

			event.preventDefault()
			clear()
			inputRef.value?.blur()
			return
		}

		if (!isOpen.value) return

		if (event.key === 'ArrowDown') {
			event.preventDefault()
			moveActive(1)
		} else if (event.key === 'ArrowUp') {
			event.preventDefault()
			moveActive(-1)
		} else if (event.key === 'Enter') {
			event.preventDefault()
			openActive()
		}
	}

	const { trapRef } = useFocusTrap(isOpen, (event) => {
		if (!isComposingKey(event)) dismiss()
	})

	watch(isOpen, (open) => emit('update:open', open))

	// ヘッダーの外を押したら閉じる。スクリムの外側（ヘッダーの中）は覆えない
	const onDocumentPointerdown = (event: PointerEvent) => {
		if (!trapRef.value?.contains(event.target as Node)) dismiss()
	}

	onMounted(() => {
		document.addEventListener('pointerdown', onDocumentPointerdown)

		const media = window.matchMedia(INLINE_SEARCH_QUERY)
		const onCross = () => {
			if (!media.matches) close()
		}
		media.addEventListener('change', onCross)
		onBeforeUnmount(() => media.removeEventListener('change', onCross))
	})

	onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerdown))

	defineExpose({ focus, close, isVisible })
</script>

<style scoped>
	.header-search {
		position: relative;
		transition: max-width 0.2s ease-in-out;
	}

	.search-field-icon {
		flex: none;
		width: 1rem;
		height: 1rem;
		color: var(--color-sub);
	}

	.search-input {
		flex: 1;
		min-width: 0;
		border: none;
		background: none;
		font-family: inherit;
		font-size: 0.875rem;
		color: var(--color-main);
	}

	.search-input::placeholder {
		color: var(--color-sub);
	}

	.search-panel-layer {
		position: absolute;
		top: calc(100% + 1px);
		left: 0;
		right: 0;
		pointer-events: none;
	}

	.search-panel {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		opacity: 0;
		visibility: hidden;
		transform: translateY(-4px);
		/* 閉じる側だけ遅らせる。開く側も遅らせると、算出値が hidden のままの
		   1フレームが空き、そこに focus() を出しても黙って効かない */
		transition:
			opacity 0.2s ease-in-out,
			transform 0.2s ease-in-out,
			visibility 0s linear 0.2s;
	}

	.search-panel-layer.is-open .search-panel {
		opacity: 1;
		visibility: visible;
		transform: translateY(0);
		pointer-events: auto;
		transition:
			opacity 0.2s ease-in-out,
			transform 0.2s ease-in-out,
			visibility 0s;
	}

	.search-note {
		margin: 0;
		padding: 1rem;
		font-size: 0.875rem;
		color: var(--color-sub);
	}

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
