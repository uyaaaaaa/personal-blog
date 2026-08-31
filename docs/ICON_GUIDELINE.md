# Icon guidelines

## 採用マーク: `u/`

`uyaaaaaa` の頭文字にスラッシュを添えたモノグラム。スラッシュは旧ロゴ `</> Tech Blog`
から受け継いだ要素で、パスの区切り（`u/`）としても読める。個人ブログとしての
固有性を持たせつつ、技術的な文脈を保つことを狙っている。

候補として `</>`（既存ロゴの図形化）、`>_`（シェルプロンプト）、`≡`（TOC の図案化）、
`◦—◦`（記事同士のつながり）も検討したうえで本案を採用した。

## 仕様

| 項目 | 値 |
| :-- | :-- |
| グリッド | 32×32 |
| 角丸 | 7（タイル版のみ） |
| 地 | `#1A1A1A` |
| マーク | `#FFFFFF` |
| アクセント | `#8B5CF6`（`tailwind.config.ts` の `accent` と同値） |
| ストローク | `u` = 3.2 / スラッシュ = 3.0（16px 表示で潰れない下限） |

形状には 2 つのバリエーションがある。

- **タイル版**（角丸あり）: `public/favicon.svg`、`favicon.ico`、ヘッダーロゴ。
  タブやヘッダーなど、周囲に背景がある場所で使う。
- **フルブリード版**（角丸なし・マークを 0.82 倍に縮小して中央配置）:
  `apple-touch-icon.png`、`icon-192.png`、`icon-512.png`。
  iOS / Android 側がマスクをかけるため、角丸を自前で持たず余白を確保している。
  この余白により maskable アイコンのセーフゾーン（中心から直径 80%）も満たす。

## ファイル一覧

| ファイル | 用途 |
| :-- | :-- |
| `public/favicon.svg` | モダンブラウザ向けの本体。ベクターなので全サイズを兼ねる |
| `public/favicon.ico` | 16 / 32 / 48px を内包。旧ブラウザ・ブックマーク用のフォールバック |
| `public/apple-touch-icon.png` | 180×180。iOS のホーム画面追加時 |
| `public/icon-192.png` / `icon-512.png` | PWA・Android。`purpose: any maskable` |
| `public/site.webmanifest` | アイコン定義とテーマカラー |

`<link>` の登録は `nuxt.config.ts` の `app.head` で行っている（全ページ共通）。
ヘッダーのロゴは `app/components/layout/Header.vue` にインライン SVG で埋め込み、
リクエストを増やさずに済ませている。

## 更新するとき

ラスタ画像（`.ico` / `.png`）は `public/favicon.svg` から生成している。
形を変える場合は SVG を編集したうえで、全ラスタを描き直すこと。
`theme-color` は追従ヘッダーの背景（白）に合わせているため、
ヘッダーの配色を変える場合は `nuxt.config.ts` と `site.webmanifest` の両方を更新する。

## OGP 画像

SNS などにシェアされたときのカード画像。`public/ogp.png`（1200×630）が
全ページ共通のデフォルトで、記事側でフロントマターの `image` を指定すれば
その記事だけ差し替わる。

構図はサイトそのものを縮めたもので、上部の白帯 + 下線でサイトの追従ヘッダーを、
その中にヘッダーと同じロゴロックアップを置いている。左端のアクセントバーと
`for Experts` の 1 行だけに `#8B5CF6` を使い、それ以外は無彩色に寄せている。

| 項目 | 値 |
| :-- | :-- |
| サイズ | 1200×630（`summary_large_image` / 1.91:1） |
| 地 | `#F9F9F9` / ヘッダー帯 `#FFFFFF` / 罫 `#E5E5E5` |
| 文字 | 見出し `#1A1A1A` / アクセント `#8B5CF6` / 補足 `#888888` |
| 書体 | JetBrains Mono（使用文字のみサブセット化して SVG に埋め込み済み） |

### 生成方法

元データは `docs/ogp.svg`。サブセット化した woff2 を data URI で内包しているため、
フォントを別途インストールしなくても同じ絵になる。Chromium でラスタライズする。

```sh
chromium --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --window-size=1360,790 --screenshot=raw.png "file://$PWD/docs/ogp.svg"
# ウィンドウちょうどのサイズだと下端に白帯が出るため、大きめに描いて 1200x630 に切り出す
python3 -c "from PIL import Image; Image.open('raw.png').convert('RGB').crop((0,0,1200,630)).save('public/ogp.png', optimize=True)"
```

文言を変えて文字種が増える場合は、SVG 内の `@font-face` も
[Google Fonts の `text=` サブセット](https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&text=AB)
で作り直す。埋め込まれていない文字は等幅のフォールバックで描かれてしまう。

### メタタグ

`app/composables/usePageSeo.ts` が title / description と OGP・Twitter Card を
まとめて出力する。各ページはこれを呼ぶだけでよい。

`og:image` と `og:url` は絶対 URL でないとクローラが解決できないため、
`nuxt.config.ts` の `runtimeConfig.public.siteUrl` を基準に組み立てている。
独自ドメインに移すときはここか、環境変数 `NUXT_PUBLIC_SITE_URL` を変更する。
