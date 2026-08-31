import { fileURLToPath } from 'node:url'
// @ts-expect-error 型定義のないローカルESMモジュール
import remarkObsidianCallout from './remark/obsidian-callout.mjs'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  app: {
    head: {
      link: [
        // 旧ブラウザ・ブックマーク用のフォールバック（16/32/48pxを内包）
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        // モダンブラウザはこちらを優先して使用する
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      // 追従ヘッダーの背景色に合わせる
      meta: [
        { name: 'theme-color', content: '#FFFFFF' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      // og:imageやog:urlは絶対URLが必要。デプロイ先に合わせてNUXT_PUBLIC_SITE_URLで上書きできる
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
          // ライトテーマで統一（#8）。preの背景はtailwind.config.tsのtypography拡張で上書き
          theme: 'github-light',
          langs: [
            'js', 'ts', 'json', 'html', 'css', 'vue', 'shell', 'sh', 'bash', 'md', 'mdc', 'yaml',
            // 記事で使用中の追加言語
            'vim', 'lua', 'sql', 'php',
          ],
        },
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
