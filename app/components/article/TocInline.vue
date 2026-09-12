<template>
	<nav class="border-y border-border lg:hidden">
		<button
			type="button"
			class="flex w-full items-center justify-between gap-3 py-3 font-mono text-2xs tracking-marker text-sub transition-colors hover:text-accent"
			:aria-expanded="isOpen"
			aria-controls="toc-inline-list"
			@click="isOpen = !isOpen"
		>
			<span>Contents</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="transition-transform duration-200"
				:class="{ 'rotate-180': isOpen }"
				aria-hidden="true"
			>
				<polyline points="6 9 12 15 18 9" />
			</svg>
		</button>

		<ul
			id="toc-inline-list"
			v-show="isOpen"
			class="space-y-2 pb-4"
		>
			<li
				v-for="(link, index) in links"
				:key="link.id"
			>
				<a
					:href="`#${link.id}`"
					@click.prevent="scrollTo(link.id)"
					class="flex gap-3 text-sm transition-colors hover:text-accent"
					:class="activeId === link.id ? 'font-medium text-main' : 'text-sub'"
				>
					<span class="flex-none font-mono text-xs leading-5 text-accent">{{
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
							@click.prevent="scrollTo(child.id)"
							class="block break-words pl-9 text-xs transition-colors hover:text-accent"
							:class="activeId === child.id ? 'font-medium text-main' : 'text-sub'"
						>
							{{ child.text }}
						</a>
					</li>
				</ul>
			</li>
		</ul>
	</nav>
</template>

<script setup lang="ts">
	import { useScrollTo } from '~/composables/useScrollTo'
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
		100,
		isMobile,
	)
</script>
