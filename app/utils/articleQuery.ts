export const publishedArticles = () => queryCollection('article').where('published', '=', true)

export const publishedArticleList = () =>
	publishedArticles().order('date', 'DESC').select('path', 'title', 'date', 'tags')

const jsonArrayItem = (value: string) => `%"${value}"%`

export const articlesTaggedWith = (tag: string) =>
	publishedArticleList().where('tags', 'LIKE', jsonArrayItem(tag))
