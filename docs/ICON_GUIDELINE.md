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
