import { fileURLToPath } from 'node:url'
// @ts-expect-error 型定義のないローカルESMモジュール
import remarkObsidianCallout from './remark/obsidian-callout.mjs'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: [
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
  ],
  content: {
    build: {
      markdown: {
        remarkPlugins: {
          'remark-obsidian-callout': {
            instance: remarkObsidianCallout,
            // MDC側のテンプレート生成はimportパス文字列を要求するためsrcも渡す
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
