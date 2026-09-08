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
				<input
					ref="inputRef"
					v-model="query"
					type="search"
					class="search-input"
					placeholder="Search articles by title or tag"
					aria-label="Search articles by title or tag"
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
			<ul
				v-else
				ref="resultsRef"
				class="search-results"
			>
				<li
					v-for="(article, index) in results"
					:key="article.path"
				>
					<NuxtLink
						:to="article.path"
						class="search-result"
						:class="{ 'is-active': index === activeIndex }"
						prefetch-on="interaction"
						@click="emit('close')"
						@pointermove="activeIndex = index"
					>
						<span class="search-result-title">{{ article.title }}</span>
						<time
							class="search-result-date"
							:datetime="article.date"
							>{{ formatDate(article.date) }}</time
						>
					</NuxtLink>
				</li>
			</ul>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { useFocusTrap } from '~/composables/useFocusTrap'
	import { useTouchScrollLock } from '~/composables/useTouchScrollLock'
	import { formatDate } from '~/utils/date'
	import { searchArticles } from '~/utils/search'

	const props = defineProps<{
		isOpen: boolean
	}>()

	const emit = defineEmits<{
		(e: 'close'): void
	}>()

	const { data: articles } = useAsyncData('search-articles', () =>
		queryCollection('article')
			.where('published', '=', true)
			.order('date', 'DESC')
			.select('path', 'title', 'date', 'tags')
			.all(),
	)

	const query = ref('')
	const activeIndex = ref(0)
	const inputRef = ref<HTMLInputElement | null>(null)
	const resultsRef = ref<HTMLElement | null>(null)

	const results = computed(() => searchArticles(articles.value ?? [], query.value))

	const emptyMessage = computed(() =>
		query.value.trim() === ''
			? 'Type to search articles by title or tag.'
			: 'No articles found.',
	)

	const moveActive = (delta: number) => {
		const count = results.value.length
		if (count === 0) return

		activeIndex.value = (activeIndex.value + delta + count) % count
	}

	const openActive = () => {
		const article = results.value[activeIndex.value]
		if (!article) return

		emit('close')
		navigateTo(article.path)
	}

	watch(query, () => {
		activeIndex.value = 0
		if (resultsRef.value) resultsRef.value.scrollTop = 0
	})

	watch(activeIndex, async () => {
		await nextTick()
		resultsRef.value?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' })
	})

	// 押した位置が外側のときだけ閉じる。入力欄からドラッグして外で離すと click は
	// オーバーレイに来るため、click だけで判定すると選択のたびに閉じてしまう
	let pressedOnOverlay = false

	const onOverlayPointerDown = (event: PointerEvent) => {
		pressedOnOverlay = event.target === event.currentTarget
	}

	const onOverlayClick = () => {
		if (pressedOnOverlay) emit('close')
	}

	// 変換中のキーは IME のもの。横取りすると変換の確定も取り消しも奪う。
	// Safari は compositionend を keydown より先に出すため確定と取り消しは
	// isComposing が false で届き、変換の終わり際は自前で覚えておくしかない
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

	const onInputKeydown = (event: KeyboardEvent) => {
		if (isComposingKey(event)) return

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

			composing = false
			query.value = ''
			inputRef.value?.focus()
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
		outline: none;
	}

	.search-input::placeholder {
		color: var(--color-sub);
	}

	.search-input::-webkit-search-cancel-button {
		display: none;
	}

	.search-note {
		margin: 0;
		padding: 1rem;
		font-size: 0.875rem;
		color: var(--color-sub);
	}

	.search-results {
		list-style: none;
		min-height: 0;
		margin: 0;
		padding: 0.5rem;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.search-result {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		border-left: 2px solid transparent;
		border-radius: 0.375rem;
		color: var(--color-main);
		transition: background-color 0.15s;
	}

	.search-result:hover,
	.search-result.is-active {
		background-color: var(--color-surface-subtle);
	}

	.search-result.is-active {
		border-left-color: var(--color-accent);
	}

	.search-result-title {
		flex: 1;
		min-width: 0;
		font-size: 0.875rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.search-result-date {
		flex: none;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--color-sub);
		font-variant-numeric: tabular-nums;
	}
</style>
