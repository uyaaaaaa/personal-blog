import { defineContentConfig, defineCollection } from '@nuxt/content'
import { articleSchema, digestSchema } from './content.schema'
import { emptyStore, remoteCollection } from './content.source'

export default defineContentConfig({
	collections: {
		article: defineCollection({
			type: 'page',
			source: 'article/**/*.md',
			schema: articleSchema,
		}),
		digest: defineCollection({
			type: 'page',
			source: remoteCollection(emptyStore),
			schema: digestSchema,
		}),
	},
})
