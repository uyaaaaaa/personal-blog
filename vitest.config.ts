import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
	test: {
		environment: 'node',
		pool: 'forks',
		exclude: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**', '**/dist/**'],
		setupFiles: ['./vitest.setup.ts'],
	},
})
