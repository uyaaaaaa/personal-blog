# アーキテクチャ

このリポジトリの**現状の構造**と、検査をどこに置くかを説明します。守るべき個々の取り決めは `.claude/rules/` にあります。
判断の理由は [DECISIONS.md](./DECISIONS.md)（ADR の索引）、デザインの大方針は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md) にあります。コンポーネントの値や構造は実装が正で、写した文書を持ちません。

以前ここにあったフレームワーク非依存の設計原則と規約は、このリポジトリの規模（1人・静的サイト）には合わないため退避しました。
復元方法は [#105](https://github.com/uyaaaaaa/personal-blog/issues/105) を参照してください。

---

## 何を守るか

**変更が数ファイルのコードで閉じること。**

個人ブログなので、feature 分割や層の増設で得られるものより、ファイル数が増えるコストのほうが大きいです（→ [ADR 04](./adr/04-flat-directory-by-type.md)）。
型別のフラットな構成（`components` / `composables` / `utils`）を維持し、代わりに次の3点で秩序を保ちます。

1. 依存は一方向にしか流れない（下記）
2. 自作モジュール間の依存は必ず `import` 文に現れる（lint が依存を見られる状態を保つ → [ADR 03](./adr/03-no-auto-import.md)）
3. 文書で守らず、lint / build / テストで守る。機械的に縛れないものは `.claude/rules/` に置く（→ [ADR 10](./adr/10-docs-only-for-hard-to-reverse-decisions.md)）

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

## 検査の置き場

検査を足すときの置き場は、判定に何が要るかで決める。整形は Prettier に、ファイル1つで判定できるそれ以外の違反は ESLint に、依存グラフが要る違反（循環・依存方向）は dependency-cruiser に、記事をまたいで突き合わせる違反（タグのスラッグ）は `scripts/` の検査に置く。
ESLint はスタイルガイドのプリセットを取り込まず、ルールを1本ずつ足す。整形ルールは足さない。
lint で落とせるようになったルールは `.claude/rules/` から消す（二重管理にしない）。

commit のたびに回すのは lint だけにする。待たされるものを増やさないため、テストと build は PR で受ける。

dependency-cruiser のベースラインは `.dependency-cruiser-known-violations.json`。新規の違反は直し、ベースラインには足さない。ベースラインにある違反を直したら次のコマンドで作り直す（減らす方向にだけ使う）。

```sh
npx depcruise app --config --output-type baseline > .dependency-cruiser-known-violations.json
```
