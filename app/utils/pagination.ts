const PAGE_PARAM_PATTERN = /^[1-9]\d*$/

export const parsePage = (param: unknown): number | null => {
	return typeof param === 'string' && PAGE_PARAM_PATTERN.test(param) ? Number(param) : null
}

export const stripPagePath = (path: string): string => {
	return path.replace(/\/$/, '').replace(/\/page\/\d+$/, '')
}

export const paginationItems = (
	page: number,
	totalPages: number,
	radius: number,
): (number | 'gap')[] => {
	const pages = new Set<number>([1, totalPages])
	for (let i = page - radius; i <= page + radius; i++) {
		if (i >= 1 && i <= totalPages) pages.add(i)
	}

	const sorted = [...pages].sort((a, b) => a - b)
	return sorted.flatMap((value, index) => {
		const previous = sorted[index - 1]
		return previous !== undefined && value - previous > 1 ? ['gap' as const, value] : [value]
	})
}

export const pageLink = (basePath: string, target: number): string => {
	return target === 1 ? basePath : `${basePath}/page/${target}`
}
