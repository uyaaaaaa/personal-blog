# アーキテクチャ

このリポジトリの**現状の構造**を説明します。守るべき個々の取り決めは `.claude/rules/` にあり、Claude Code のセッションで自動的に読み込まれます。
人が読むための根拠は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md) と [DECISIONS.md](./DECISIONS.md) にあります。コンポーネントの値や構造は実装が正で、写した文書を持ちません。

以前ここにあったフレームワーク非依存の設計原則と規約は、このリポジトリの規模（1人・静的サイト）には合わないため退避しました。
復元方法は [#105](https://github.com/uyaaaaaa/personal-blog/issues/105) を参照してください。

---

## 何を守るか

**変更が数ファイルのコードと、DECISIONS.md の数項目で閉じること。**

個人ブログなので、feature 分割や層の増設で得られるものより、ファイル数が増えるコストのほうが大きいです（検討した案と戻す条件は [DECISIONS.md](./DECISIONS.md#ディレクトリは型別のフラット構成を維持する)）。
型別のフラットな構成（`components` / `composables` / `utils`）を維持し、代わりに次の3点で秩序を保ちます。

1. 依存は一方向にしか流れない（下記）
2. 自作モジュール間の依存は必ず `import` 文に現れる（lint が依存を見られる状態を保つ）
3. 実装から読み取れない理由は DECISIONS.md に書く（コードにコメントを書かず、実装を写した文書も持たない）

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
  composables/               reactive / lifecycle を使う共有ロジック。スクロール購読は useScrollFrame に集約
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
- `composables/` 同士の依存は `useScrollTo` → `useProgrammaticScroll`、`useScrollDirection` → `useProgrammaticScroll` / `useScrollFrame`、`useTocActive` → `useScrollFrame` だけ。

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
| 自作 composable / util の明示 import | `nuxt.config.ts` の `imports: { scan: false }`。書き忘れは prerender の `ReferenceError` で `npm run build` が落ちる | あり |
| 自作コンポーネントの明示 import | `components: false` + `eslint.config.mjs` の `vue/no-undef-components`（`npm run lint`）。未 import はビルドでは落ちず、そのコンポーネントが消えた HTML が出るため lint が要る | あり |
| 循環依存 | `.dependency-cruiser.cjs` の `no-circular`（`npm run lint`）。`import type` だけの循環は実行時依存が無いので許す | あり |
| 依存方向（上の図） | `.dependency-cruiser.cjs` の `*-no-upward` と `theme-only-from-app-vue`（`npm run lint`） | あり |
| コメント・スタイル・置き場・ドキュメント | `.claude/rules/` | Claude Code のセッションでのみ効く |
| `~/` 以外のエイリアス、任意値、`navigator.userAgent`、`unload` | ESLint / Stylelint | **未導入**。次に入れる |

`npm run lint` は ESLint と dependency-cruiser を続けて回す。ファイル1つで判定できる違反は ESLint に、依存グラフが要る違反（循環・依存方向）は dependency-cruiser に置く。
dependency-cruiser が `~/` `~~/` を解決するための paths は `tsconfig.depcruise.json` にある。ルートの `tsconfig.json` は生成物（`.nuxt/`）への references だけで paths を持たないため、生成物に依存しない専用の tsconfig を持つ。

lint は2箇所で走る。`npm install` が有効にする pre-commit フック（`.githooks/pre-commit`）が commit のたびに回し、GitHub Actions（`.github/workflows/lint.yml`）が PR と `main` への push で回す。build は CI では回さず、Cloudflare Pages が PR ごとに行うビルドとその `Cloudflare Pages` チェックが担う。

lint を入れる順序は費用対効果順で、import の書き分け → Tailwind の任意値 → プラットフォーム系の禁止3点。
いずれも既知の違反をベースラインに固定し、新規違反だけを落とす形で入れる。ESLint はスタイルガイドのプリセットを取り込まず、ルールを1本ずつ足す。
lint で落とせるようになったルールは `.claude/rules/` から消す（二重管理にしない）。

dependency-cruiser のベースラインは `.dependency-cruiser-known-violations.json`（今は空）。新規の違反は直し、ベースラインには足さない。ベースラインにある違反を直したら次のコマンドで作り直す（減らす方向にだけ使う）。

```sh
npx depcruise app --config --output-type baseline > .dependency-cruiser-known-violations.json
```

## 既知のずれ

lint 導入時にまとめて直す。

- `useArticleTags.ts` だけ `../utils/tag` と相対パスで utils を参照している（他は `~/`）。
- `ref` `computed` を `'vue'` から明示 import しているファイルが10ある（プリセットの auto-import に任せる方針と不一致）。
- `Hero.vue` と `ArticleList.vue` が `components/` 直下にある。
