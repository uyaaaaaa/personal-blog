import { defineContentConfig, defineCollection } from '@nuxt/content'
import { articleSchema, digestSchema } from './content.schema'
import { emptyStore, remoteCollection } from './content.source'
import { ARTICLE, DIGEST } from './content.collections.mjs'

export default defineContentConfig({
	collections: {
		[ARTICLE]: defineCollection({
			type: 'page',
			source: 'article/**/*.md',
			schema: articleSchema,
		}),
		[DIGEST]: defineCollection({
			type: 'page',
			source: remoteCollection(emptyStore),
			schema: digestSchema,
		}),
	},
})
