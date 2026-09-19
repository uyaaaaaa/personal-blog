<template>
	<div
		ref="trapRef"
		class="header-search mx-8 hidden flex-1 items-center self-stretch md:flex"
		:class="
			isOpen ? 'max-w-search-open' : 'max-w-search-trigger focus-within:max-w-search-open'
		"
	>
		<label
			class="search-field flex w-full items-center gap-2 rounded-md border border-border bg-surface-subtle px-4 py-2 transition-color focus-within:border-accent"
			@pointerdown="onPointerdown"
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
			<!-- WebKit が type="search" に足すクリアボタンは擬似要素でクラスを付けられない。type では出させない -->
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
				:aria-expanded="hasList"
				:aria-controls="hasList ? LIST_ID : undefined"
				:aria-activedescendant="hasList ? `${LIST_ID}-${activeIndex}` : undefined"
				autocomplete="off"
				@keydown="onKeydown"
				@input="dismissed = false"
				@compositionstart="startComposition"
				@compositionend="endComposition"
			/>
			<span
				class="search-kbd rounded-kbd border border-border bg-surface px-1.5 py-0.5 text-xs text-sub"
				>⌘K</span
			>
		</label>

		<div
			class="search-panel-layer"
			:class="{ 'is-open': isOpen }"
			@pointerdown="onPanelPointerdown"
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
					@select="dismiss"
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

	// Tailwind の md。この入れ物を出し分ける幅とずれると、隠れたまま開いて誰も閉じられなくなる
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

	const dismissed = ref(false)

	const isOpen = computed(() => !dismissed.value && query.value.trim() !== '')
	const hasList = computed(() => isOpen.value && results.value.length > 0)

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

	// ボタンを挟まず直にフォーカスされるので、ポインタで移した目印は自分で付ける。
	// label の肩代わりは目印を落とすので止め、入力欄の上だけキャレットのために残す
	const onPointerdown = (event: PointerEvent) => {
		if (event.target !== inputRef.value) event.preventDefault()
		focusByGesture(inputRef.value)
	}

	// 素の部分を押すとフォーカスが body に落ち、候補を出したまま入力欄だけ閉じた幅に戻る
	const onPanelPointerdown = (event: PointerEvent) => {
		if ((event.target as HTMLElement).closest('a')) return

		event.preventDefault()
	}

	const isVisible = () => (inputRef.value?.getClientRects().length ?? 0) > 0

	const openActive = () => {
		const article = activeArticle.value
		if (!article) return

		dismiss()
		navigateTo(article.path)
	}

	const onKeydown = (event: KeyboardEvent) => {
		if (isComposingKey(event)) return

		// 開いている間の Escape は閉じ込めの listener が受ける
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

	// 隠れた要素に乗ったフォーカスはブラウザが外し、次の Tab が文書の先頭から始まる
	const returnFocus = () => {
		const active = document.activeElement
		if (active === inputRef.value) return
		if (trapRef.value?.contains(active)) focusByGesture(inputRef.value)
	}

	const { trapRef } = useFocusTrap(isOpen, (event) => {
		if (isComposingKey(event)) return

		returnFocus()
		dismiss()
	})

	watch(isOpen, (open) => emit('update:open', open))

	// スクリムはヘッダーの中までは覆えないので、外を押した判定は document で持つ
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
