import { fileURLToPath } from 'node:url'
import remarkObsidianCallout from './remark/obsidian-callout.mjs'
import { articleRoutes } from './scripts/article-routes.mjs'
import { writeWorkerRoutes } from './scripts/worker-routes.mjs'
import { CATEGORIES } from './app/utils/category'

// リンクを辿るプリレンダは、どこからもリンクされない記事を落とす。一覧に載るかに関わらず、
// collection の全件をここから起点に渡す
const ARTICLES = articleRoutes()

export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	imports: { scan: false },
	components: false,
	app: {
		head: {
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
		// 既定では見出しのテキスト全体がアンカーになる。テキストを選びにくくなるので h2 / h3 では止め、
		// 節へのリンクは ProseH2 / ProseH3 が置くアイコンだけが持つ
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
				'/404.html',
				...CATEGORIES.map((category) => `/category/${category}`),
				...ARTICLES,
			],
		},
		cloudflare: {
			pages: {
				// 除外の自動収集はプリレンダより先に走り、出来上がった dist を見ていない。
				// 生成された全パスを見る writeWorkerRoutes に _routes.json を持たせる
				defaultRoutes: false,
			},
		},
	},
	hooks: {
		'nitro:init'(nitro) {
			nitro.hooks.hook('compiled', () => {
				writeWorkerRoutes(nitro.options.output.dir, ARTICLES)
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
