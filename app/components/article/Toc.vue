<template>
	<nav
		aria-labelledby="toc-heading"
		class="sticky top-toc-top flex max-h-sticky-column min-h-0 flex-col"
	>
		<h2
			id="toc-heading"
			class="flex-shrink-0 font-mono text-2xs tracking-marker text-sub"
		>
			CONTENTS
		</h2>
		<div
			ref="navRef"
			class="toc-scroll mt-4 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain"
		>
			<ul class="space-y-2 border-l border-border">
				<li
					v-for="link in links"
					:key="link.id"
				>
					<a
						:href="`#${link.id}`"
						@click.prevent="scrollTo(link.id)"
						class="-ml-px block break-words border-l-2 py-1 pl-4 text-sm transition-colors hover:border-accent hover:text-accent focus:border-accent focus:text-accent"
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
								class="-ml-px block break-words border-l-2 py-1 pl-8 text-xs transition-colors hover:border-accent hover:text-accent focus:border-accent focus:text-accent"
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
	import { useScrollTo } from '~/composables/useScrollTo'
	import { useTocActive } from '~/composables/useTocActive'
	import { useIsDesktop } from '~/composables/useIsDesktop'
	import { deltaToCenterIfHidden } from '~/utils/scroll'

	const props = defineProps<{
		links: any[]
	}>()

	const { scrollTo } = useScrollTo()

	const navRef = ref<HTMLElement | null>(null)
	const { isDesktop } = useIsDesktop()
	const { activeId } = useTocActive(
		computed(() => props.links),
		100,
		isDesktop,
	)

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
