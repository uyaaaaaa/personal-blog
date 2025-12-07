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
  },
})
