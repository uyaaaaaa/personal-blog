# アーキテクチャ

このリポジトリの**現状の構造と強制手段**を説明します。守るべき個々の取り決めは `.claude/rules/` にあり、Claude Code のセッションで自動的に読み込まれます。
判断の理由は [DECISIONS.md](./DECISIONS.md)（ADR の索引）、デザインの大方針は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md) にあります。コンポーネントの値や構造は実装が正で、写した文書を持ちません。

以前ここにあったフレームワーク非依存の設計原則と規約は、このリポジトリの規模（1人・静的サイト）には合わないため退避しました。
復元方法は [#105](https://github.com/uyaaaaaa/personal-blog/issues/105) を参照してください。

---

## 何を守るか

**変更が数ファイルのコードで閉じること。**

個人ブログなので、feature 分割や層の増設で得られるものより、ファイル数が増えるコストのほうが大きいです（→ [ADR 07](./adr/07-flat-directory-by-type.md)）。
型別のフラットな構成（`components` / `composables` / `utils`）を維持し、代わりに次の3点で秩序を保ちます。

1. 依存は一方向にしか流れない（下記）
2. 自作モジュール間の依存は必ず `import` 文に現れる（lint が依存を見られる状態を保つ → [ADR 03](./adr/03-no-auto-import.md)）
3. 文書で守らず、lint / build / テストで守る。機械的に縛れないものは `.claude/rules/` に置く（→ [ADR 21](./adr/21-docs-only-for-hard-to-reverse-decisions.md)）

---

## 依存方向

```
pages ─→ components ─→ composables ─→ utils
  │           │             │
  └───────────┴─────────────┴──→ theme/tokens.ts（app.vue のみ直接参照）
content/ ─→ @nuxt/content + remark/ ─→ ContentRenderer ─→ components/content/
```

- 右から左への import は作らない。`utils` は何も import しない。`composables` はコンポーネントを import しない。
- `components/` の間では、`article/` が `common/` を使う。`layout/` は他の領域を使わない。
- `content/` の記事は `@nuxt/content` と `remark/` を経て描画され、本文中のコンポーネントは `components/content/` だけが受ける。

## データとスタイルの流れ

- データ取得（`queryCollection`）を呼ぶのはページと、ページの実体である一覧コンポーネントだけ。部品は props で受け取る。
- 静的生成でビルド時に全ページを作る。ビルド時刻が焼き付く値はクライアントで `onMounted` 後に計算する。
- URL が持つ状態（ページ番号・タグ・カテゴリ）は `route.params` から導き、別の state を持たない。
- スタイルは `theme/tokens.ts` → `tailwind.config.ts` → CSS 変数と Tailwind theme の一方向。コンポーネントは Tailwind のクラスを基本にし、状態遷移やアニメーションが複雑なものだけ scoped CSS を持つ。
- テーマは `@nuxtjs/color-mode` が `<html>` のクラスで持ち、CSS 変数の再定義で切り替わる。

---

## 強制手段の現状

| 何を | 手段 | 状態 |
| :--- | :--- | :--- |
| 型と SFC の整合 | `npm run build` | あり |
| フロントマターのスキーマ | `content.config.ts` の zod | **無し**。`@nuxt/content` は schema をドキュメントの検証に使わず、DB の列と型の生成にだけ使う |
| タグのスラッグの一意性 | `scripts/check-tags.mjs`（`npm run lint`） | あり |
| 自作 composable / util の明示 import | `nuxt.config.ts` の `imports: { scan: false }`。書き忘れは prerender の `ReferenceError` で `npm run build` が落ちる | あり |
| 自作コンポーネントの明示 import | `components: false` + `eslint.config.mjs` の `vue/no-undef-components`（`npm run lint`）。未 import はビルドでは落ちず、そのコンポーネントが消えた HTML が出るため lint が要る | あり |
| 循環依存 | `.dependency-cruiser.cjs` の `no-circular`（`npm run lint`）。`import type` だけの循環は許す | あり |
| 依存方向（上の図） | `.dependency-cruiser.cjs` の `*-no-upward` と `theme-only-from-app-vue`（`npm run lint`） | あり |
| 整形 | `.prettierrc` の Prettier + `prettier-plugin-tailwindcss`（`npm run lint` の `prettier --check`）。Markdown と `package-lock.json` は対象外（→ [ADR 13](./adr/13-prettier-owns-formatting.md)） | あり |
| Tailwind の任意値（角括弧を含むクラス） | `eslint.config.mjs` の `vue/no-restricted-syntax`（`npm run lint`）。`class` と `:class` の中の文字列を見る（→ [ADR 19](./adr/19-size-tokens-and-no-arbitrary-values.md)） | あり |
| 純粋関数の振る舞い | 実装の隣の `*.test.ts`（`npm test`） | あり |
| props で決まるコンポーネントの描画 | 実装の隣の `*.test.ts` を `mountSuspended` で（`npm test`。→ [ADR 15](./adr/15-nuxt-environment-per-file.md)） | あり |
| 上記以外のコンポーネントと composable の振る舞い | — | **未導入**。[#121](https://github.com/uyaaaaaa/personal-blog/issues/121) |
| `<style>` の中のサイズ・色 | Stylelint | **未導入**。上の任意値のルールは `class` 属性しか見ない |
| `~/` 以外のパス、`navigator.userAgent`、`unload` | `eslint.config.mjs` の `no-restricted-imports` と `no-restricted-syntax`（`npm run lint`）。`app/` の `.ts` と `.vue` の両方を見る | あり |
| コメント・スタイル・置き場・ドキュメント | `.claude/rules/` | Claude Code のセッションでのみ効く |

`npm run lint` は Prettier・ESLint・dependency-cruiser・タグの検査をこの順で続けて回す。整形は Prettier に、ファイル1つで判定できるそれ以外の違反は ESLint に、依存グラフが要る違反（循環・依存方向）は dependency-cruiser に、記事をまたいで突き合わせる違反（タグのスラッグ）は `scripts/` の検査に置く。
ESLint はスタイルガイドのプリセットを取り込まず、ルールを1本ずつ足す。整形ルールは足さない。
lint で落とせるようになったルールは `.claude/rules/` から消す（二重管理にしない）。

lint は pre-commit フック（`.githooks/pre-commit`）と GitHub Actions の `Lint` で走る。テストは別ワークフローの `Test` が同じトリガーで並列に回し、pre-commit には載せない（commit のたびに待たされるのは lint だけにする）。build は CI では回さず、Cloudflare Pages が PR ごとに行うビルドとその `Cloudflare Pages` チェックが担う。

dependency-cruiser のベースラインは `.dependency-cruiser-known-violations.json`（今は空）。新規の違反は直し、ベースラインには足さない。ベースラインにある違反を直したら次のコマンドで作り直す（減らす方向にだけ使う）。

```sh
npx depcruise app --config --output-type baseline > .dependency-cruiser-known-violations.json
```
