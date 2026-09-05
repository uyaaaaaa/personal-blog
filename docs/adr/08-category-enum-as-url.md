# カテゴリは `z.enum` で固定し、値をそのまま URL セグメントにする

`content.config.ts` の `category: z.enum(['blog', 'book'])` を正とし、`/category/blog` のように値をそのまま URL に使う。表示名は `app/utils/category.ts` の `CATEGORY_LABELS` が持つ。

- **検討した案**: タグと同じ自由文字列 + slug 化。タグは記事側で自由に増えるので slug 化と逆引きが要るが、カテゴリはサイト設計として固定する値なので、enum にすれば slug 化も表示名の逆引きも要らない。
- **対価**: カテゴリの追加は `content.config.ts` と `category.ts` の2箇所を同時に直す。全カテゴリの一覧ページは持たず、[索引はヘッダーが担う](./10-category-index-in-header.md)。
- **戻す条件**: カテゴリを記事側で自由に増やしたくなったとき。
