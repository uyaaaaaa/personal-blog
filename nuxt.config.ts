import { fileURLToPath } from 'node:url'
// @ts-expect-error 型定義のないローカルESMモジュール
import remarkObsidianCallout from './remark/obsidian-callout.mjs'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  app: {
    head: {
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      meta: [
        { name: 'theme-color', content: '#FFFFFF' },
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
  ],
  content: {
    build: {
      markdown: {
        highlight: {
          theme: 'github-light',
          langs: [
            'js', 'ts', 'json', 'html', 'css', 'vue', 'shell', 'sh', 'bash', 'md', 'mdc', 'yaml',
            'vim', 'lua', 'sql', 'php',
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
      routes: ['/']
    }
  },
  features: {
    inlineStyles: true
  },
  routeRules: {
    '/blog/**': { redirect: { to: '/article/**', statusCode: 301 } },
    '/book/**': { redirect: { to: '/article/**', statusCode: 301 } },
  }
})
