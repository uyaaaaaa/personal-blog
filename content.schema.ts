import { z } from '@nuxt/content'

export const articleSchema = z
	.object({
		title: z.string(),
		description: z.string(),
		emoji: z.string().optional(),
		image: z.string().optional(),
		published: z.boolean(),
		date: z.string().date(),
		tags: z.array(z.string()).optional(),
		category: z.enum(['blog', 'book']),
	})
	.strict()
