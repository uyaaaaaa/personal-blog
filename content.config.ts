import { defineContentConfig, defineCollection, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: "page",
      source: "blog/*.md",
      // Define schema
      schema: z.object({
        title: z.string(),
        description: z.string(),
        image: z.string(),
        published: z.boolean(),
        date: z.string(),
        tags: z.array(z.string()).optional(),
      })
    }),
    book: defineCollection({
      type: "page",
      source: "book/*.md",
      schema: z.object({
        title: z.string(),
        description: z.string(),
        image: z.string().optional(),
        published: z.boolean(),
        date: z.string(),
        tags: z.array(z.string()).optional(),
        affiliateUrl: z.string().optional(),
      })
    }),
  },
})
