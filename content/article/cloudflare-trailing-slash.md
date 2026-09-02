---
title: "Cloudflare Pagesが付ける末尾スラッシュで、記事が「無い」ことになる"
emoji: "⛅"
description: "静的生成したページのキーは末尾スラッシュを持たないのに、Cloudflare Pagesはリロード時にURLへ末尾スラッシュを足す。route.pathをそのままクエリに渡すと、記事があるのに無いと判定される。"
published: true
date: 2026-09-02
tags:
  - cloudflare
  - nuxt.js
  - "@nuxt/content"
category: blog
---

## 前提条件・環境

- Nuxt 4.2 / `@nuxt/content` 3.9
- Nitro の preset は `cloudflare-pages`。`crawlLinks` で全ページをプリレンダ（静的生成）
- デプロイ先は Cloudflare Pages
- 記事ページは動的ルート `app/pages/article/[_slug].vue`。`useAsyncData` の中で `queryCollection('article')` を叩いて本文を取っている

## 発生した問題

本番の記事ページをリロードすると、本文が一瞬消えて「Article Not Found」のカードが出ます。記事は存在しているのに、です。

サイト内のリンクを踏んだ画面遷移では起きません。初回アクセスとリロード、つまりサーバから配信されたHTMLをブラウザが受け取り、Vue がそれを引き継ぐタイミングでだけ起きます。

そしてローカルの `npm run dev` では一度も再現しませんでした。

## wrangler pages dev で再現する

`npm run dev` で出ないのは当然で、この不具合の引き金を引いているのは Nuxt ではなくホスティング側だからです。手元で Cloudflare のランタイムを動かします。

```sh
npm run generate
npx wrangler pages dev dist
```

表示されたURLで記事ページを開くと、アドレスバーがこうなります。

```
開いたURL   /article/s3-to-rds
最終的なURL /article/s3-to-rds/
```

末尾にスラッシュが増えています。付けたのはアプリではありません。

## 原因: ビルド時のパスとブラウザのURLが違う

`nuxt generate` は記事ページをディレクトリ配下の `index.html` として出力します。

```
dist/article/s3-to-rds/index.html
```

Cloudflare Pages はこの構成を配信するとき、`/article/s3-to-rds` へのリクエストを `/article/s3-to-rds/` にリダイレクトしてから返します。リンクを踏んだだけの画面遷移ではこのリダイレクトが挟まらないので、URLも書き換わりません。**リロードして初めて、末尾スラッシュ付きのURLでページが読み込まれます。**

一方、ビルド成果物の中身は末尾スラッシュを持ちません。生成された `_payload.json` と `@nuxt/content` のデータを実際に覗くと、どちらもこうなっています。

```
dist/article/s3-to-rds/_payload.json のキー : "/article/s3-to-rds"
@nuxt/content が持つ記事の path            : "/article/s3-to-rds"
```

ここに `route.path` をそのまま渡していました。

```ts
const { data: page } = await useAsyncData(route.path, () =>
  queryCollection('article').path(route.path).where('published', '=', true).first(),
)
```

`route.path` は2箇所で使われています。`useAsyncData` の第1引数（＝ペイロードのキー）と、クエリの絞り込み条件です。ビルド時は両方 `/article/s3-to-rds` ですが、ブラウザでは両方 `/article/s3-to-rds/` になります。それぞれ別々に壊れます。

- **キーのずれ:** サーバ側が `"/article/s3-to-rds"` で埋めた結果を、クライアントは `"/article/s3-to-rds/"` で探しにいきます。見つからないので、取得し直しになります
- **クエリのずれ:** 取得し直したクエリは `.path('/article/s3-to-rds/')` です。記事が持つ `path` は末尾スラッシュなしなので、これは何にも一致せず `null` を返します

記事はあるのに「無い」という結論だけが残ります。

## 解決策: パスを正規化してから使う

`route.path` を直接使うのをやめ、末尾スラッシュを落とした値を1つ作って、キーとクエリの両方に渡します。

```diff
-const { data: page } = await useAsyncData(route.path, () =>
-  queryCollection('article').path(route.path).where('published', '=', true).first(),
+const articlePath = computed(() => route.path.replace(/\/+$/, '') || '/')
+
+const { data: page } = await useAsyncData(articlePath.value, () =>
+  queryCollection('article').path(articlePath.value).where('published', '=', true).first(),
 )
```

`|| '/'` は、ルート（`/`）を空文字にしないためのものです。

> [!WARNING] 片方だけ直しても足りない
> クエリの `.path()` だけ正規化すると記事は取れるようになりますが、`useAsyncData` のキーがずれたままなので、サーバが埋めたペイロードは使われず毎回取り直しになります。
> ペイロードのキーとクエリの条件は、同じ正規化を通した同じ値にします。

修正後、`wrangler pages dev` で同じURLを開き直すと、カードは出ずに記事だけが表示されます。

静的生成したサイトでは、**最終的なURLを決めるのはビルドではなくホスティングです。** ビルド時のパスとブラウザのURLは同じとは限らず、末尾スラッシュはその一番よくある食い違いです。パスを何かのキーに使っているなら、両方の値を一度は突き合わせておく価値があります。

## 参考

- [Nuxt: useAsyncData](https://nuxt.com/docs/api/composables/use-async-data)
- [Cloudflare Pages: Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- 同じ環境で先に踏んだ問題: [Nuxt Contentの記事がSSR時に取得できない問題とその解決策](/article/nuxt-content-cloudflare)
