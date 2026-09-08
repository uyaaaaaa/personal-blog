import { z } from '@nuxt/content'

// 記事のフロントマターの正本。@nuxt/content はこれを列と型の生成にしか使わないため、
// 記事がこの形に収まっているかは scripts/check-frontmatter.mjs が同じスキーマで見る。
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
