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
			aria-label="Search articles"
		>
			<div class="search-field">
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
	import { focusByGesture } from '~/composables/gestureFocus'
	import { useArticleSearch } from '~/composables/useArticleSearch'
	import { useFocusTrap } from '~/composables/useFocusTrap'
	import { useTouchScrollLock } from '~/composables/useTouchScrollLock'

	const LIST_ID = 'search-dialog-results'

	const props = defineProps<{
		isOpen: boolean
	}>()

	const emit = defineEmits<{
		(e: 'close'): void
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

	const emptyMessage = computed(() =>
		query.value.trim() === ''
			? 'Type to search articles by title or tag.'
			: 'No articles found.',
	)

	const openActive = () => {
		const article = activeArticle.value
		if (!article) return

		emit('close')
		navigateTo(article.path)
	}

	// 押した位置が外側のときだけ閉じる。入力欄からドラッグして外で離すと click は
	// オーバーレイに来るため、click だけで判定すると選択のたびに閉じてしまう
	let pressedOnOverlay = false

	const onOverlayPointerDown = (event: PointerEvent) => {
		pressedOnOverlay = event.target === event.currentTarget
	}

	const onOverlayClick = () => {
		if (pressedOnOverlay) emit('close')
	}

	// Tailwind の md。ヘッダーが検索の入口を PC 用と SP 用に出し分けるのと同じ幅で、
	// テンプレートが選択中の縦線とキーの案内を出すのもここから。ずれると見えない選択に
	// キーが効き、効かないキーを名乗る
	const KEYBOARD_SELECT_QUERY = '(min-width: 768px)'

	const canSelectByKey = () => window.matchMedia(KEYBOARD_SELECT_QUERY).matches

	const onInputKeydown = (event: KeyboardEvent) => {
		if (isComposingKey(event)) return
		if (!canSelectByKey()) return

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

	const { trapRef } = useFocusTrap(toRef(props, 'isOpen'), (event) => {
		if (!isComposingKey(event)) emit('close')
	})

	const { lockRef } = useTouchScrollLock()

	// 閉じるアニメーションの間も結果を出したままにするため、消すのは開くとき。
	// フォーカスは押したときと同じ tick で寄せる。フレームを待つと、多くのモバイル
	// ブラウザが仮想キーボードを自動表示する判定から外れる（表示の確定は CSS 側が持つ）
	watch(
		() => props.isOpen,
		(isOpen) => {
			if (!isOpen) return

			clear()
			// 開き方（クリック/ショートカット/Enter）に関わらず、この入力欄はフォーカス位置を
			// 下線（.search-field:focus-within）で示すため、開いた直後のリングは出さない
			focusByGesture(inputRef.value, { asPointer: true })
		},
		{ flush: 'post' },
	)
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
