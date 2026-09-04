import { CATEGORIES, CATEGORY_LABELS, type Category } from '../utils/category'

export interface CategorySummary {
  slug: Category
  label: string
  count: number
}

export const useArticleCategories = () => {
  return useAsyncData('article-categories', async () => {
    const articles = await queryCollection('article')
      .where('published', '=', true)
      .select('category')
      .all()

    const counts = new Map<string, number>()
    for (const article of articles) {
      if (!article.category) continue
      counts.set(article.category, (counts.get(article.category) ?? 0) + 1)
    }

    return CATEGORIES
      .map((slug): CategorySummary => ({ slug, label: CATEGORY_LABELS[slug], count: counts.get(slug) ?? 0 }))
      .filter(category => category.count > 0)
  })
}
