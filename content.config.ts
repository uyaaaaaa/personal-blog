import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    article: defineCollection({
      type: "page",
      source: "article/**/*.md",
      schema: z.object({
        title: z.string(),
        description: z.string(),
        emoji: z.string().optional(),
        image: z.string().optional(),
        published: z.boolean(),
        date: z.string(),
        tags: z.array(z.string()).optional(),
        category: z.string().optional(),
      })
    }),
  },
})
