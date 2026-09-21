import { fileURLToPath } from 'node:url'
import remarkObsidianCallout from './remark/obsidian-callout.mjs'
import { articleRoutes, digestRoutes } from './scripts/content-routes.mjs'
import { writeWorkerRoutes } from './scripts/worker-routes.mjs'
import { CATEGORIES } from './app/utils/category'

export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	imports: { scan: false },
	components: false,
	app: {
		head: {
			htmlAttrs: { lang: 'ja' },
			link: [
				{ rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
				{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
				{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
				{ rel: 'manifest', href: '/site.webmanifest' },
			],
		},
	},
	runtimeConfig: {
		public: {
			siteUrl: 'https://tech-blog-efb.pages.dev',
		},
	},
	modules: ['@nuxt/content', '@nuxtjs/tailwindcss', '@nuxtjs/color-mode'],
	colorMode: {
		classSuffix: '',
	},
	content: {
		// 既定では見出しのテキスト全体がアンカーになる。テキストを選びにくくなるので h2 / h3 では止める
		renderer: {
			anchorLinks: { h2: false, h3: false, h4: true },
		},
		build: {
			markdown: {
				highlight: {
					theme: {
						default: 'github-light',
						dark: 'github-dark',
					},
					langs: [
						'js',
						'ts',
						'json',
						'html',
						'css',
						'vue',
						'shell',
						'sh',
						'bash',
						'md',
						'mdc',
						'yaml',
						'vim',
						'lua',
						'sql',
						'php',
						'diff',
					],
				},
				remarkPlugins: {
					'remark-obsidian-callout': {
						instance: remarkObsidianCallout,
						src: fileURLToPath(
							new URL('./remark/obsidian-callout.mjs', import.meta.url),
						),
						options: {},
					},
				},
			},
		},
	},
	nitro: {
		preset: 'cloudflare-pages',
		prerender: {
			crawlLinks: true,
			routes: [
				'/',
				'/profile',
				'/digest',
				'/404.html',
				...CATEGORIES.map((category) => `/category/${category}`),
			],
		},
		cloudflare: {
			pages: {
				// 自動収集はワイルドカードに畳まず、上限を超えた分を黙って切り落とす。
				// 畳んでから書く writeWorkerRoutes に _routes.json を持たせる
				defaultRoutes: false,
			},
		},
	},
	hooks: {
		// collection が組み上がるのはビルドの中だけ。nuxt prepare には無く、dev は焼かない
		'nitro:build:before'(nitro) {
			if (nitro.options.dev) return

			const database = nitro.options.runtimeConfig.content.localDatabase.filename
			const pages = [...articleRoutes(database), ...digestRoutes(database)]
			nitro.options.prerender.routes.push(...pages)

			nitro.hooks.hook('compiled', () => {
				writeWorkerRoutes(nitro.options.output.dir, pages)
			})
		},
	},
	typescript: {
		tsConfig: {
			include: ['../tests/**/*'],
		},
	},
	features: {
		inlineStyles: true,
	},
	routeRules: {
		'/blog/**': { redirect: { to: '/article/**', statusCode: 301 } },
		'/book/**': { redirect: { to: '/article/**', statusCode: 301 } },
	},
})
