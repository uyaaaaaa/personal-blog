# アーキテクチャ

このリポジトリの**現状の構造**を説明します。守るべき個々の取り決めは `.claude/rules/` にあり、Claude Code のセッションで自動的に読み込まれます。
人が読むための根拠と仕様は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md) と [spec/](./spec/README.md) にあります。

以前ここにあったフレームワーク非依存の設計原則と規約は、このリポジトリの規模（1人・静的サイト）には合わないため退避しました。
復元方法は [#105](https://github.com/uyaaaaaa/personal-blog/issues/105) を参照してください。

---

## 何を守るか

**変更が1枚の spec と数ファイルのコードで閉じること。**

個人ブログなので、feature 分割や層の増設で得られるものより、ファイル数が増えるコストのほうが大きいです。
型別のフラットな構成（`components` / `composables` / `utils`）を維持し、代わりに次の3点で秩序を保ちます。

1. 依存は一方向にしか流れない（下記）
2. 自作モジュール間の依存は必ず `import` 文に現れる（lint が依存を見られる状態を保つ）
3. 実装から読み取れない理由は spec に書く（コードにコメントを書かない）

---

## 構造

```
content/article/*.md        記事。フロントマターのスキーマは content.config.ts
remark/obsidian-callout.mjs  Markdown 拡張（Obsidian 互換 callout）
theme/tokens.ts              色・フォントの単一情報源
tailwind.config.ts           tokens から CSS 変数と Tailwind theme を生成
app/
  app.vue                    ローディングバー、theme-color
  error.vue                  全画面エラーの振り分け
  layouts/default.vue        Header / main / Footer とグローバル CSS
  pages/                     ルーティング。ルートファイルは実体コンポーネントを描画するだけ
  components/
    layout/                  Header、Explore ドロップダウン、ドロワー、ThemeToggle、Footer
    article/                 一覧の実体（AllArticles 等）、棚、カード、目次、ArticleFallback
    content/                 Nuxt Content が本文中で使う Callout / ProseA / ProseTable
    common/                  Sidebar、BackButton、Pagination、ScrollToTopButton
    error/                   ErrorView と NotFound / Server
    Hero.vue ArticleList.vue ルート直下（歴史的経緯。移動は未定）
  composables/               reactive / lifecycle を使う共有ロジック
  utils/                     純粋関数（日付、タグ、カテゴリ）
public/                      favicon、OGP 画像、manifest
```

## 依存方向

```
pages ─→ components ─→ composables ─→ utils
  │           │             │
  └───────────┴─────────────┴──→ theme/tokens.ts（app.vue のみ直接参照）
content/ ─→ @nuxt/content + remark/ ─→ ContentRenderer ─→ components/content/
```

- 右から左への import は作らない。`utils` は何も import しない。`composables` はコンポーネントを import しない。
- `components/` の間では、`article/` の一覧実体が `common/` と `ArticleList` を使う。`layout/` は他の領域を使わない。
- `composables/` 同士の依存は `useScrollTo` → `useProgrammaticScroll` と `useScrollDirection` → `useProgrammaticScroll` の2本だけ。

## データの流れ

- `queryCollection('article')` を呼ぶのはページと、ページの実体である一覧コンポーネントだけ。部品は props で受け取る。
- 静的生成（`nuxt generate`）でビルド時に全ページを作る。ビルド時刻が焼き付く値（相対日付）はクライアントで `onMounted` 後に計算する。
- URL が持つ状態（ページ番号・タグ・カテゴリ）は `route.params` から `computed` で導く。別の state を持たない。
- テーマは `@nuxtjs/color-mode` が `<html>` のクラスで持ち、CSS 変数の再定義で切り替わる。

## スタイルの流れ

```
theme/tokens.ts → tailwind.config.ts → :root / .dark の CSS 変数 → text-main 等のクラス と var(--color-*)
```

コンポーネントは Tailwind のクラスを基本にし、状態遷移やアニメーションが複雑なものだけ scoped CSS を持つ。

---

## 強制手段の現状

| 何を | 手段 | 状態 |
| :--- | :--- | :--- |
| 型と SFC の整合 | `npm run build` | あり |
| フロントマターのスキーマ | `content.config.ts` の zod | あり |
| コメント・スタイル・import・置き場・ドキュメント | `.claude/rules/` | Claude Code のセッションでのみ効く |
| 循環依存、依存方向、`~/` 以外のエイリアス、任意値、`navigator.userAgent`、`unload` | ESLint / Stylelint | **未導入**。次に入れる |

lint を入れる順序は費用対効果順で、循環禁止 → 依存方向 → import の書き分け → Tailwind の任意値 → プラットフォーム系（`P` 系）の禁止3点。
いずれも既知の違反をベースラインに固定し、新規違反だけを落とす形で入れる。
lint で落とせるようになったルールは `.claude/rules/` から消す（二重管理にしない）。

## 既知のずれ

lint 導入時にまとめて直す。

- import のエイリアスが `~/` `@/` `../` で混在している（`Header.vue` `HeaderNavigation.vue` `layouts/default.vue` `error.vue`）。
- `ref` `computed` を `'vue'` から明示 import しているファイルが8つある（コンポーネント5、composable 3。auto-import に任せる方針と不一致）。
- `Hero.vue` と `ArticleList.vue` が `components/` 直下にある。
