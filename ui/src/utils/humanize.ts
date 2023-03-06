export const humanizeCount = (count: number) => {
	if (count < 1000) return count
	if (count < 1000000) return `${Math.round((count / 1000) * 10) / 10}K`
	return `${Math.round((count / 1000000) * 10) / 10}M`
}