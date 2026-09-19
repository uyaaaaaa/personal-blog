<template>
	<div class="mx-auto w-full max-w-column space-y-12">
		<header class="space-y-4 border-b border-border pb-8">
			<h1 class="text-heading font-bold text-main">uyaaaaaa</h1>
			<p class="leading-relaxed text-sub">
				Software engineer. Writing about the tools and the details behind them.
			</p>

			<ul class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 font-mono text-xs text-sub">
				<li
					v-for="link in links"
					:key="link.href"
				>
					<a
						:href="link.href"
						rel="me noopener"
						target="_blank"
						class="transition-color hover:text-accent"
						>{{ link.label }} ↗</a
					>
				</li>
			</ul>
		</header>

		<section class="space-y-3">
			<h2 class="font-mono text-sm uppercase tracking-marker text-main">About</h2>
			<p class="leading-relaxed text-main">
				Web
				アプリケーションの開発をしています。このブログには、手を動かして詰まったことと、その原因をどこまで辿れたかを書いています。
			</p>
		</section>

		<section class="space-y-3">
			<div class="flex items-baseline justify-between gap-4">
				<h2 class="font-mono text-sm uppercase tracking-marker text-main">Writing</h2>
				<NuxtLink
					to="/tags"
					class="font-mono text-xs font-medium text-accent hover:underline"
					prefetch-on="interaction"
					>All Tags →</NuxtLink
				>
			</div>
			<div class="flex flex-wrap gap-3">
				<NuxtLink
					v-for="tag in topTags"
					:key="tag.slug"
					:to="`/tags/${tag.slug}`"
					class="flex items-baseline gap-2 rounded-full border border-border px-3 py-1.5 font-mono text-sm text-main transition-color hover:border-main"
					prefetch-on="interaction"
				>
					<span>{{ tag.name }}</span>
					<span class="text-xs text-sub">{{ tag.count }}</span>
				</NuxtLink>
			</div>
		</section>

		<section class="space-y-3">
			<h2 class="font-mono text-sm uppercase tracking-marker text-main">This Blog</h2>
			<p class="leading-relaxed text-main">
				Functional Minimalism for
				Experts。装飾を足さず、コードと情報を速く読ませることに寄せています。記事は Obsidian
				で書き、Nuxt Content で静的生成して Cloudflare Pages に置いています。
			</p>
		</section>
	</div>
</template>

<script setup lang="ts">
	import { useArticleTags } from '~/composables/useArticleTags'
	import { usePageSeo } from '~/composables/usePageSeo'

	const TOP_TAGS_LIMIT = 8

	const links = [{ label: 'GitHub', href: 'https://github.com/uyaaaaaa' }]

	const route = useRoute()

	const { data: tags } = useArticleTags()
	const topTags = computed(() => (tags.value ?? []).slice(0, TOP_TAGS_LIMIT))

	usePageSeo({
		path: () => route.path,
		title: 'Profile',
		description: 'このブログを書いている人と、このブログについて。',
	})
</script>
