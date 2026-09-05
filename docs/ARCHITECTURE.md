# アーキテクチャ

このリポジトリの**現状の構造**を説明します。守るべき個々の取り決めは `.claude/rules/` にあり、Claude Code のセッションで自動的に読み込まれます。
人が読むための根拠は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md) と [DECISIONS.md](./DECISIONS.md)（索引）にあります。コンポーネントの値や構造は実装が正で、写した文書を持ちません。

以前ここにあったフレームワーク非依存の設計原則と規約は、このリポジトリの規模（1人・静的サイト）には合わないため退避しました。
復元方法は [#105](https://github.com/uyaaaaaa/personal-blog/issues/105) を参照してください。

---

## 何を守るか

**変更が数ファイルのコードと、判断の記録の数項目で閉じること。**

個人ブログなので、feature 分割や層の増設で得られるものより、ファイル数が増えるコストのほうが大きいです（検討した案と戻す条件は [DECISIONS.md](./adr/07-flat-directory-by-type.md)）。
型別のフラットな構成（`components` / `composables` / `utils`）を維持し、代わりに次の3点で秩序を保ちます。

1. 依存は一方向にしか流れない（下記）
2. 自作モジュール間の依存は必ず `import` 文に現れる（lint が依存を見られる状態を保つ）
3. 実装から読み取れない理由は判断の記録（[DECISIONS.md](./DECISIONS.md)）に書く（コードにコメントを書かず、実装を写した文書も持たない）

---

## 構造

```
content/article/*.md        記事。フロントマターのスキーマは content.config.ts
remark/obsidian-callout.mjs  Markdown 拡張（Obsidian 互換 callout）
app/mdc.config.ts            Shiki の transformer（diff の行に印を付ける）
theme/tokens.ts              色・フォント・サイズの単一情報源
tailwind.config.ts           tokens から CSS 変数と Tailwind theme を生成
vitest.config.ts             Vitest。environment は node
app/
  app.vue                    ローディングバー、theme-color
  error.vue                  全画面エラーの振り分け
  layouts/default.vue        Header / main / Footer とグローバル CSS
  pages/                     ルーティング。ルートファイルは実体コンポーネントを描画するだけ
  components/
    layout/                  Header、Explore ドロップダウン、ドロワー、ThemeToggle、Footer
    article/                 一覧の実体（AllArticles 等）、棚、カード、目次、ArticleFallback
    content/                 Nuxt Content が本文中で使う Callout / ProseA / ProsePre / ProseTable
    common/                  Sidebar、BackButton、Pagination、ScrollToTopButton
    error/                   ErrorView と NotFound / Server
    Hero.vue ArticleList.vue ルート直下（歴史的経緯。移動は未定）
  composables/               reactive / lifecycle を使う共有ロジック。スクロール購読は useScrollFrame に集約
  utils/                     純粋関数（日付、タグ、カテゴリ、ページング）
  **/*.test.ts               テストは実装の隣に置く（→ adr/14）
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
                                     → theme.extend のサイズ → w-sidebar 等のクラス
```

コンポーネントは Tailwind のクラスを基本にし、状態遷移やアニメーションが複雑なものだけ scoped CSS を持つ。
記事本文は `@tailwindcss/typography` の `prose` を土台に `tailwind.config.ts` の `typography` 拡張で差分を当てるが、コードブロックだけは `ProsePre.vue` が見た目を持つ（→ [DECISIONS.md](./adr/11-prose-pre-owns-code-block.md)）。

---

## 強制手段の現状

| 何を | 手段 | 状態 |
| :--- | :--- | :--- |
| 型と SFC の整合 | `npm run build` | あり |
| フロントマターのスキーマ | `content.config.ts` の zod | **無し**。`@nuxt/content` は schema をドキュメントの検証に使わず、DB の列と型の生成にだけ使う |
| タグのスラッグの一意性 | `scripts/check-tags.mjs`（`npm run lint`）。空になるタグと、既存のタグと同じスラッグになるタグを落とす | あり |
| 自作 composable / util の明示 import | `nuxt.config.ts` の `imports: { scan: false }`。書き忘れは prerender の `ReferenceError` で `npm run build` が落ちる | あり |
| 自作コンポーネントの明示 import | `components: false` + `eslint.config.mjs` の `vue/no-undef-components`（`npm run lint`）。未 import はビルドでは落ちず、そのコンポーネントが消えた HTML が出るため lint が要る | あり |
| 循環依存 | `.dependency-cruiser.cjs` の `no-circular`（`npm run lint`）。`import type` だけの循環は実行時依存が無いので許す | あり |
| 依存方向（上の図） | `.dependency-cruiser.cjs` の `*-no-upward` と `theme-only-from-app-vue`（`npm run lint`） | あり |
| 整形（インデント、属性の折り返し、引用符、Tailwind のクラス順） | `.prettierrc` の Prettier + `prettier-plugin-tailwindcss`（`npm run lint` の `prettier --check`）。Markdown と `package-lock.json` は対象外 | あり |
| 純粋関数の振る舞い | 実装の隣の `*.test.ts`（`npm test`。`app/utils/` の4ファイル） | あり |
| props で決まるコンポーネントの描画 | 実装の隣の `*.test.ts` を `mountSuspended` で（`npm test`。`Pagination` `ArticleShelf` `ArticleCard` `Callout` `ArticleFallback` の5ファイル） | あり |
| 上記以外のコンポーネントと composable の振る舞い | — | **未導入**。[#121](https://github.com/uyaaaaaa/personal-blog/issues/121) |
| コメント・スタイル・置き場・ドキュメント | `.claude/rules/` | Claude Code のセッションでのみ効く |
| Tailwind の任意値（角括弧を含むクラス） | `eslint.config.mjs` の `vue/no-restricted-syntax`（`npm run lint`）。`class` と `:class` の中の文字列を見る。サイズは `theme/tokens.ts` の `sizes` に名前を足して使う（→ [adr/19](./adr/19-size-tokens-and-no-arbitrary-values.md)） | あり |
| `<style>` の中のサイズ・色 | Stylelint | **未導入**。上のルールは `class` 属性しか見ない |
| `~/` 以外のエイリアス、`navigator.userAgent`、`unload` | ESLint | **未導入**。[#146](https://github.com/uyaaaaaa/personal-blog/issues/146) |

`npm run lint` は Prettier・ESLint・dependency-cruiser・タグの検査をこの順で続けて回す。整形は Prettier に、ファイル1つで判定できるそれ以外の違反は ESLint に、依存グラフが要る違反（循環・依存方向）は dependency-cruiser に、記事をまたいで突き合わせる違反（タグのスラッグ）は `scripts/` の検査に置く。
`prettier --check` が落ちたら `npm run format` で直す。整形して commit し直させる（`--write` してステージする）方式は取らない。commit の内容が黙って変わるため。
dependency-cruiser が `~/` `~~/` を解決するための paths は `tsconfig.depcruise.json` にある。ルートの `tsconfig.json` は生成物（`.nuxt/`）への references だけで paths を持たないため、生成物に依存しない専用の tsconfig を持つ。

lint は2箇所で走る。`npm install` が有効にする pre-commit フック（`.githooks/pre-commit`）が commit のたびに回し、GitHub Actions の `Lint`（`.github/workflows/lint.yml`）が PR と `main` への push で回す。テストは別ワークフローの `Test`（`.github/workflows/test.yml`）が同じトリガーで並列に回し、pre-commit には載せない（commit のたびに待たされるのは lint だけにする）。build は CI では回さず、Cloudflare Pages が PR ごとに行うビルドとその `Cloudflare Pages` チェックが担う。
2つのワークフローは `concurrency.group` を `lint-` / `test-` と別の接頭辞にする。同じグループ名にすると push のたびに互いをキャンセルし合い、片方しか完走しない。

`npm test` は Vitest を1回だけ走らせる（`vitest run`）。設定は `@nuxt/test-utils` の `defineVitestConfig` で書くが、既定の環境は `node` のままで、Nuxt を起こすのは先頭に `// @vitest-environment nuxt` を書いたファイルだけ（→ [DECISIONS.md](./adr/15-nuxt-environment-per-file.md)）。`vitest.setup.ts` は、その環境で `@nuxtjs/color-mode` のクライアントプラグインが読む `window.__NUXT_COLOR_MODE__` を置く。
`Test` だけ `npm ci` を scripts ありで走らせる（`Lint` は `--ignore-scripts`）。`defineVitestConfig` は設定を読む時点で Nuxt を起動し、`@nuxt/content` がそこで SQLite を開く。`--ignore-scripts` では `better-sqlite3` のネイティブがビルドされないため、`Could not locate the bindings file` で1件も走らない（起動まで進めても、postinstall の `nuxt prepare` が生成する `.nuxt/tsconfig.app.json` が無く `TSConfckParseError` になる）。

lint を入れる順序は費用対効果順で、import の書き分け → Tailwind の任意値 → プラットフォーム系の禁止3点。残っているのは最後の1つ（[#146](https://github.com/uyaaaaaa/personal-blog/issues/146)）。
任意値は既知の違反18箇所を先に直してから入れたのでベースラインを持たない。残りは既知の違反をベースラインに固定し、新規違反だけを落とす形で入れる。ESLint はスタイルガイドのプリセットを取り込まず、ルールを1本ずつ足す。整形は Prettier が持つので、ESLint には整形ルールを足さない（`eslint-config-prettier` は衝突が無いので入れていない）。
lint で落とせるようになったルールは `.claude/rules/` から消す（二重管理にしない）。

dependency-cruiser のベースラインは `.dependency-cruiser-known-violations.json`（今は空）。新規の違反は直し、ベースラインには足さない。ベースラインにある違反を直したら次のコマンドで作り直す（減らす方向にだけ使う）。

```sh
npx depcruise app --config --output-type baseline > .dependency-cruiser-known-violations.json
```

Prettier を入れたときの一括整形は独立した1コミットにしてあり、そのハッシュを `.git-blame-ignore-revs` に置いている。次のコマンドで `git blame` から外れる。

```sh
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## 既知のずれ

lint 導入時にまとめて直す。

- `useArticleTags.ts` だけ `../utils/tag` と相対パスで utils を参照している（他は `~/`）。
- `ref` `computed` を `'vue'` から明示 import しているファイルが10ある（プリセットの auto-import に任せる方針と不一致）。
- `Hero.vue` と `ArticleList.vue` が `components/` 直下にある。
