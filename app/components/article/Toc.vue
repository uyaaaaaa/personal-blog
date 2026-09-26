<template>
	<nav
		aria-labelledby="toc-heading"
		class="sticky top-toc-top flex max-h-sticky-column min-h-0 flex-col"
	>
		<div
			lang="en"
			class="flex flex-shrink-0 items-center gap-2 toc-collapsed:justify-center"
		>
			<button
				type="button"
				aria-label="Contents"
				:aria-expanded="isOpen"
				aria-controls="toc-list"
				class="group relative -ml-2 flex h-8 w-8 flex-none items-center justify-center rounded text-sub transition-color hover:text-accent toc-collapsed:ml-0"
				@click="toggle"
				@pointerenter="tooltipDismissed = false"
				@focus="tooltipDismissed = false"
			>
				<PanelRightIcon />
				<span
					aria-hidden="true"
					class="pointer-events-none absolute left-0 top-full z-10 pt-1 opacity-0 transition-move group-hover:pointer-events-auto group-hover:opacity-100 group-focus-visible:opacity-100 toc-collapsed:left-auto toc-collapsed:right-0"
					:class="tooltipDismissed && 'invisible'"
				>
					<span
						class="block whitespace-nowrap rounded border border-border bg-surface px-2 py-1 font-mono text-2xs tracking-marker text-main shadow-sm"
						>Contents</span
					>
				</span>
			</button>
			<h2
				id="toc-heading"
				class="font-mono text-2xs tracking-marker text-sub toc-collapsed:hidden"
			>
				CONTENTS
			</h2>
		</div>
		<div
			id="toc-list"
			ref="navRef"
			class="toc-scroll mt-4 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain toc-collapsed:hidden"
		>
			<ul class="space-y-2 border-l border-border">
				<li
					v-for="link in links"
					:key="link.id"
				>
					<a
						:href="`#${link.id}`"
						@click.prevent="scrollTo(link.id)"
						class="-ml-px block break-words border-l-2 py-1 pl-4 text-ui transition-color hover:border-accent hover:text-accent focus:border-accent focus:text-accent"
						:class="
							activeId === link.id
								? 'border-accent font-medium text-main'
								: 'border-transparent text-sub'
						"
					>
						{{ link.text }}
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
								@click.prevent="scrollTo(child.id)"
								class="-ml-px block break-words border-l-2 py-1 pl-8 text-meta transition-color hover:border-accent hover:text-accent focus:border-accent focus:text-accent"
								:class="
									activeId === child.id
										? 'border-accent font-medium text-main'
										: 'border-transparent text-sub'
								"
							>
								{{ child.text }}
							</a>
						</li>
					</ul>
				</li>
			</ul>
		</div>
	</nav>
</template>

<script setup lang="ts">
	import PanelRightIcon from '~/components/ui/PanelRightIcon.vue'
	import { useScrollTo } from '~/composables/useScrollTo'
	import { useTocActive } from '~/composables/useTocActive'
	import { useIsDesktop } from '~/composables/useIsDesktop'
	import { deltaToCenterIfHidden } from '~/utils/scroll'
	import { TOC_COLLAPSED_ATTRIBUTE, TOC_COLLAPSED_KEY } from '~/utils/tocCollapse'

	const props = defineProps<{
		links: any[]
	}>()

	const { scrollTo } = useScrollTo()

	const navRef = ref<HTMLElement | null>(null)
	const { isDesktop } = useIsDesktop()
	const { activeId } = useTocActive(
		computed(() => props.links),
		isDesktop,
	)

	const isOpen = ref(true)
	const tooltipDismissed = ref(false)

	const toggle = () => {
		isOpen.value = !isOpen.value
		document.documentElement.toggleAttribute(TOC_COLLAPSED_ATTRIBUTE, !isOpen.value)
		try {
			if (isOpen.value) localStorage.removeItem(TOC_COLLAPSED_KEY)
			else localStorage.setItem(TOC_COLLAPSED_KEY, 'true')
		} catch {}
	}

	const readOpen = () => {
		isOpen.value = !document.documentElement.hasAttribute(TOC_COLLAPSED_ATTRIBUTE)
	}

	const dismissTooltip = (event: KeyboardEvent) => {
		if (event.key === 'Escape') tooltipDismissed.value = true
	}

	onMounted(() => {
		readOpen()
		window.addEventListener('storage', readOpen)
		window.addEventListener('keydown', dismissTooltip)
	})

	onUnmounted(() => {
		window.removeEventListener('storage', readOpen)
		window.removeEventListener('keydown', dismissTooltip)
	})

	watch(activeId, async (id) => {
		if (!id) return
		await nextTick()

		const container = navRef.value
		const link = container?.querySelector<HTMLElement>(`a[href="#${CSS.escape(id)}"]`)
		if (!container || !link) return

		container.scrollTop += deltaToCenterIfHidden(
			container.getBoundingClientRect(),
			link.getBoundingClientRect(),
		)
	})
</script>

<style scoped>
	.toc-scroll {
		scrollbar-width: thin;
		scrollbar-color: var(--color-scrollbar) transparent;
	}

	.toc-scroll::-webkit-scrollbar {
		width: 4px;
	}

	.toc-scroll::-webkit-scrollbar-thumb {
		background-color: var(--color-scrollbar);
		border-radius: 9999px;
	}

	.toc-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
</style>
