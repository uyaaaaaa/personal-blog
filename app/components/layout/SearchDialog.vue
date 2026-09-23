<template>
	<div
		ref="lockRef"
		class="search-overlay"
		:class="{ 'is-open': isOpen }"
		@pointerdown="onOverlayPointerDown"
		@click="onOverlayClick"
	>
		<div
			ref="trapRef"
			class="search-dialog rounded-card border border-border bg-surface shadow-lg"
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
					@keydown="onInputKeydown"
					@compositionstart="startComposition"
					@compositionend="endComposition"
				/>
			</div>

			<p
				v-if="results.length === 0"
				class="search-note"
				role="status"
			>
				{{ emptyMessage }}
			</p>
			<SearchResults
				v-else
				:id="LIST_ID"
				:results="results"
				:active-index="activeIndex"
				@select="emit('close')"
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
	import { useArticleSearch } from '~/composables/useArticleSearch'
	import { useBackdropInert } from '~/composables/useBackdropInert'
	import { useSearchKeys } from '~/composables/useSearchKeys'
	import { useTouchScrollLock } from '~/composables/useTouchScrollLock'

	const LIST_ID = 'search-dialog-results'

	const props = defineProps<{
		isOpen: boolean
	}>()

	const emit = defineEmits<{
		(e: 'close'): void
	}>()

	const search = useArticleSearch()
	const { query, results, activeIndex, startComposition, endComposition, clear } = search

	const inputRef = ref<HTMLInputElement | null>(null)

	const emptyMessage = computed(() =>
		query.value.trim() === ''
			? 'Type to search articles by title or tag.'
			: 'No articles found.',
	)

	let pressedOnOverlay = false

	const onOverlayPointerDown = (event: PointerEvent) => {
		pressedOnOverlay = event.target === event.currentTarget
	}

	const onOverlayClick = () => {
		if (pressedOnOverlay) emit('close')
	}

	const { onKeydown: onInputKeydown, trapRef } = useSearchKeys(search, {
		canSelect: () => results.value.length > 0,
		isTrapped: toRef(props, 'isOpen'),
		close: () => emit('close'),
	})

	const { lockRef } = useTouchScrollLock()

	useBackdropInert(toRef(props, 'isOpen'), trapRef)

	watch(
		() => props.isOpen,
		(isOpen) => {
			if (!isOpen) return

			clear()
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
		padding: 4rem 1rem 1rem;
		background-color: var(--color-overlay);
		z-index: 120;
		opacity: 0;
		visibility: hidden;
		overflow: hidden;
		overscroll-behavior: contain;
		/* 閉じる側だけ遅らせる。開く側も遅らせると、算出値が hidden のままの
		   1フレームが空き、そこに focus() を出しても黙って効かない */
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
		max-width: 36rem;
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
		border-bottom: 1px solid var(--color-border);
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
