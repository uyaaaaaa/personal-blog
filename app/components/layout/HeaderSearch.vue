<template>
	<div
		ref="trapRef"
		class="header-search mx-8 hidden flex-1 items-center self-stretch md:flex"
		@focusout="onFocusout"
		:class="
			isOpen ? 'max-w-search-open' : 'max-w-search-trigger focus-within:max-w-search-open'
		"
	>
		<label
			class="search-field flex w-full items-center gap-2 rounded-md border border-border bg-surface-subtle px-4 py-2 transition-color focus-within:border-accent"
			@pointerdown="onPointerdown"
		>
			<SearchIcon class="search-field-icon" />
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
				class="search-kbd rounded-kbd border border-border bg-surface px-1.5 py-0.5 text-meta text-sub"
				>⌘K</span
			>
		</label>

		<p
			class="sr-only"
			role="status"
		>
			{{ statusMessage }}
		</p>

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
				>
					{{ countMessage }}
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
	import SearchIcon from '~/components/ui/SearchIcon.vue'
	import { focusByGesture } from '~/composables/gestureFocus'
	import { useArticleSearch } from '~/composables/useArticleSearch'
	import { useCloseWhenHidden } from '~/composables/useCloseWhenHidden'
	import { useSearchKeys } from '~/composables/useSearchKeys'

	const LIST_ID = 'header-search-results'

	const emit = defineEmits<{
		(e: 'update:open', value: boolean): void
	}>()

	const search = useArticleSearch()
	const {
		query,
		results,
		countMessage,
		activeIndex,
		startComposition,
		endComposition,
		isComposingKey,
		clear,
	} = search

	const inputRef = ref<HTMLInputElement | null>(null)

	const dismissed = ref(false)

	const isOpen = computed(() => !dismissed.value && query.value.trim() !== '')
	const hasList = computed(() => isOpen.value && results.value.length > 0)
	const statusMessage = computed(() => (isOpen.value ? countMessage.value : ''))

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

		focusByGesture(input, { asPointer: true })
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

	const onFocusout = (event: FocusEvent) => {
		if (!trapRef.value?.contains(event.relatedTarget as Node | null)) dismiss()
	}

	const isVisible = () => (inputRef.value?.getClientRects().length ?? 0) > 0

	// 隠れた要素に乗ったフォーカスはブラウザが外し、次の Tab が文書の先頭から始まる
	const returnFocus = () => {
		const active = document.activeElement
		if (active === inputRef.value) return
		if (trapRef.value?.contains(active)) focusByGesture(inputRef.value)
	}

	const { onKeydown: onSelectKeydown, trapRef } = useSearchKeys(search, {
		canSelect: () => isOpen.value,
		isTrapped: hasList,
		close: () => {
			returnFocus()
			dismiss()
		},
	})

	const onKeydown = (event: KeyboardEvent) => {
		if (isComposingKey(event)) return

		// 候補が並んでいる間の Escape は閉じ込めの listener が窓で受ける
		if (event.key === 'Escape') {
			if (hasList.value) return

			event.preventDefault()

			if (isOpen.value) {
				dismiss()
				return
			}

			clear()
			inputRef.value?.blur()
			return
		}

		onSelectKeydown(event)
	}

	watch(isOpen, (open) => emit('update:open', open))

	// スクリムはヘッダーの中までは覆えないので、外を押した判定は document で持つ
	const onDocumentPointerdown = (event: PointerEvent) => {
		if (!trapRef.value?.contains(event.target as Node)) dismiss()
	}

	useCloseWhenHidden(isOpen, trapRef, close)

	onMounted(() => {
		document.addEventListener('pointerdown', onDocumentPointerdown)
	})

	onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerdown))

	defineExpose({ focus, close, isVisible })

	/* eslint-disable style/no-outline-removal -- 目印は枠のアクセント線が持つ。開き方によらず出る */
</script>

<style scoped>
	.header-search {
		position: relative;
		transition: max-width 0.2s ease-in-out;
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
		font-size: 0.875rem;
		color: var(--color-main);
	}

	.search-input::placeholder {
		color: var(--color-sub);
	}

	.search-input:focus-visible {
		outline: none;
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
