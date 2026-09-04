export const CATEGORY_LABELS = {
	blog: 'Blog',
	book: 'Books',
} as const

export type Category = keyof typeof CATEGORY_LABELS

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]

export const isCategory = (value: string): value is Category => value in CATEGORY_LABELS
