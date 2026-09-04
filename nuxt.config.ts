import { fileURLToPath } from 'node:url'
// @ts-expect-error 型定義のないローカルESMモジュール
import remarkObsidianCallout from './remark/obsidian-callout.mjs'
import { CATEGORIES } from './app/utils/category'

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
  modules: [
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
  ],
  colorMode: {
    classSuffix: '',
  },
  content: {
    build: {
      markdown: {
        highlight: {
          theme: {
            default: 'github-light',
            dark: 'github-dark',
          },
          langs: [
            'js', 'ts', 'json', 'html', 'css', 'vue', 'shell', 'sh', 'bash', 'md', 'mdc', 'yaml',
            'vim', 'lua', 'sql', 'php', 'diff',
          ],
        },
        remarkPlugins: {
          'remark-obsidian-callout': {
            instance: remarkObsidianCallout,
            src: fileURLToPath(new URL('./remark/obsidian-callout.mjs', import.meta.url)),
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
      routes: ['/', '/404.html', ...CATEGORIES.map(category => `/category/${category}`)]
    },
    cloudflare: {
      pages: {
        routes: {
          include: ['/*'],
          // プリレンダ済みのパスをWorkerに通さない。1ルートあたり1件で数えられ、
          // Cloudflareの上限は100件のため、記事とタグはワイルドカードで畳む
          exclude: [
            '/article/*',
            '/tags/*',
            '/category/*',
            '/__nuxt_content/*',
            '/',
            '/_payload.json',
            '/about',
            '/about/_payload.json',
            '/article',
            '/tags',
            '/dump.article.sql',
            '/404.html',
            '/apple-touch-icon.png',
            '/favicon.ico',
            '/favicon.svg',
            '/icon-192.png',
            '/icon-512.png',
            '/ogp.png',
            '/ogp.svg',
            '/robots.txt',
            '/site.webmanifest',
          ],
        },
      },
    },
  },
  features: {
    inlineStyles: true
  },
  routeRules: {
    '/blog/**': { redirect: { to: '/article/**', statusCode: 301 } },
    '/book/**': { redirect: { to: '/article/**', statusCode: 301 } },
  }
})
