import { z } from '@nuxt/content'

export const articleSchema = z
	.object({
		title: z.string(),
		description: z.string(),
		published: z.boolean(),
		date: z.string().date(),
		tags: z.array(z.string()).optional(),
		category: z.enum(['blog', 'book']),
	})
	.strict()

export const digestSchema = z
	.object({
		title: z.string(),
		date: z.string().date(),
	})
	.strict()
