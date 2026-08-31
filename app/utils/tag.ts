// タグ名をURLセーフなスラグに変換する
// 例: "github action" -> "github-action", "@nuxt/content" -> "nuxt-content", "S3" -> "s3"
export const tagToSlug = (tag: string): string => {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
