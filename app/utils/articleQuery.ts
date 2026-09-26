export const publishedArticles = () => queryCollection('article').where('published', '=', true)

export const publishedArticleList = () =>
	publishedArticles().order('date', 'DESC').select('path', 'title', 'date', 'tags')

const jsonArrayItem = (value: string) => `%${JSON.stringify(value)}%`

export const articlesTaggedWith = async (tag: string) => {
	const candidates = await publishedArticleList().where('tags', 'LIKE', jsonArrayItem(tag)).all()

	return candidates.filter((article) => article.tags?.includes(tag))
}
