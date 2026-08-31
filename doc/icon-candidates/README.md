# アイコン候補（提案フェーズ）

このディレクトリは選定用の候補データです。採用案が決まったら `public/` 配下に
favicon 一式として書き出し、このディレクトリは削除または記録として残します。

すべて 32×32 のグリッド上で設計しています。

| 案 | ファイル | モチーフ | 要旨 |
| :-- | :-- | :-- | :-- |
| 01 | `a1-bracket.svg` | `</>` | 既存ロゴ `</> Tech Blog` の図形化。ブランド継承性が最も高い |
| 02 | `a2-prompt.svg` | `>_` | シェルプロンプト。記事の実態（vim/shell/linux）に一致し、16px での可読性が最良 |
| 03 | `a3-monogram.svg` | `u/` | uyaaaaaa のモノグラム。5案中で唯一の固有マーク |
| 04 | `a4-index.svg` | `≡` | 追従型 TOC の図案化。読み物としての性格を表現 |
| 05 | `a5-graph.svg` | `◦—◦` | 記事同士のつながり（Obsidian のグラフビュー） |

## 共通スペック

- グリッド: 32×32 / 角丸: 7
- ストローク: 3.0–3.4（16px 表示時に潰れない下限）
- 地: `#1A1A1A` / マーク: `#FFFFFF` / アクセント: `#8B5CF6`（`tailwind.config.ts` の `accent` と同値）

## 採用後の作業範囲

- `public/favicon.svg`（本体）
- `public/favicon.ico`（16/32px を含む ICO に差し替え）
- `public/apple-touch-icon.png`（180×180）
- `public/icon-192.png` / `public/icon-512.png`
- `public/site.webmanifest`
- `nuxt.config.ts` の `app.head.link` にアイコンを登録
- `app/components/layout/Header.vue` のロゴをマーク＋テキストに変更
