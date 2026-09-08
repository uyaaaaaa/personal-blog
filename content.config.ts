import { defineContentConfig, defineCollection } from '@nuxt/content'
import { articleSchema } from './content.schema'

export default defineContentConfig({
	collections: {
		article: defineCollection({
			type: 'page',
			source: 'article/**/*.md',
			schema: articleSchema,
		}),
	},
})
