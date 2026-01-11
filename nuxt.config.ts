// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: [
    '@nuxt/content',
    '@nuxtjs/tailwindcss',
  ],
  nitro: {
    preset: 'cloudflare-pages'
  },
})
