// Cloudflare Pages は /a/b を /a/b/ にリダイレクトするが、collection のパスと
// プリレンダ済みペイロードのキーは末尾スラッシュなし。揃えないとページがあるのに無いと判定される
export const contentPath = (path: string) => path.replace(/\/+$/, '') || '/'
