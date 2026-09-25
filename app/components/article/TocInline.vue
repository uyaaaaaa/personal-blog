<template>
	<div
		ref="rootRef"
		class="sticky top-below-header-sm z-40 md:top-below-header lg:hidden"
	>
		<nav
			class="relative border-y border-border transition-move"
			:class="[
				isStuck && 'bg-bg',
				isHidden && 'pointer-events-none -translate-y-full opacity-0',
			]"
		>
			<button
				type="button"
				class="flex w-full items-center justify-between gap-3 py-3 font-mono text-2xs tracking-marker text-sub transition-color hover:text-accent"
				:aria-expanded="isOpen"
				aria-controls="toc-inline-list"
				@click="isOpen = !isOpen"
			>
				<span>Contents</span>
				<ChevronDownIcon
					class="transition-move"
					:class="{ 'rotate-180': isOpen }"
				/>
			</button>

			<ul
				id="toc-inline-list"
				v-show="isOpen"
				class="space-y-2 pb-4"
				:class="
					isStuck &&
					'absolute inset-x-0 top-full max-h-toc-panel overflow-y-auto overscroll-contain border-b border-border bg-bg'
				"
			>
				<li
					v-for="(link, index) in links"
					:key="link.id"
				>
					<a
						:href="`#${link.id}`"
						@click.prevent="handleClick(link.id)"
						class="flex gap-3 text-ui transition-color hover:text-accent"
						:class="activeId === link.id ? 'font-medium text-main' : 'text-sub'"
					>
						<span class="flex-none font-mono text-meta leading-5 text-sub">{{
							ordinal(index)
						}}</span>
						<span class="min-w-0 break-words">{{ link.text }}</span>
					</a>
					<ul
						v-if="link.children && link.children.length > 0"
						class="mt-2 space-y-2"
					>
						<li
							v-for="child in link.children"
							:key="child.id"
						>
							<a
								:href="`#${child.id}`"
								@click.prevent="handleClick(child.id)"
								class="block break-words pl-9 text-meta transition-color hover:text-accent"
								:class="
									activeId === child.id ? 'font-medium text-main' : 'text-sub'
								"
							>
								{{ child.text }}
							</a>
						</li>
					</ul>
				</li>
			</ul>
		</nav>
	</div>
</template>

<script setup lang="ts">
	import ChevronDownIcon from '~/components/ui/ChevronDownIcon.vue'
	import { useScrollTo } from '~/composables/useScrollTo'
	import { useScrollDirection } from '~/composables/useScrollDirection'
	import { useScrollFrame } from '~/composables/useScrollFrame'
	import { useTocActive } from '~/composables/useTocActive'
	import { useIsDesktop } from '~/composables/useIsDesktop'

	const props = defineProps<{
		links: any[]
	}>()

	const isOpen = ref(true)

	const ordinal = (index: number) => String(index + 1).padStart(2, '0')

	const { scrollTo } = useScrollTo()

	const { isMobile } = useIsDesktop()
	const { activeId } = useTocActive(
		computed(() => props.links),
		isMobile,
	)

	const rootRef = ref<HTMLElement | null>(null)
	const isStuck = ref(false)

	const updateStuck = () => {
		const el = rootRef.value
		if (!el) return

		// 留まる位置は CSS が持つ。判定に数値を写すと、寸法を変えたとき片方だけ残る
		const stickyTop = parseFloat(getComputedStyle(el).top)

		isStuck.value = el.getBoundingClientRect().top <= stickyTop + 1
	}

	useScrollFrame(updateStuck, isMobile)

	const { direction } = useScrollDirection(8, isMobile)
	const isHidden = computed(() => isStuck.value && direction.value === 'down')

	watch(isStuck, (stuck) => {
		if (stuck) isOpen.value = false
	})

	watch(isHidden, (hidden) => {
		if (hidden) isOpen.value = false
	})

	// 流し込んだパネルを畳むと上が縮む。送り先が決まる前に畳み切らないと、縮んだぶん行き過ぎる
	const handleClick = async (id: string) => {
		isOpen.value = false
		await nextTick()
		scrollTo(id)
	}
</script>
