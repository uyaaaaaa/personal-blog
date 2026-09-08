# アーキテクチャ

このリポジトリの**現状の構造**と、検査をどこに置くかを説明します。守るべき個々の取り決めは `.claude/rules/` にあります。
判断の理由は [DECISIONS.md](./DECISIONS.md)（ADR の索引）、デザインの大方針は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md) にあります。コンポーネントの値や構造は実装が正で、写した文書を持ちません。

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
pages     ─┐
layouts   ─┤
app.vue   ─┤
error.vue ─┼─→ components ─→ composables ─→ utils
           │        │             │
           └────────┴─────────────┴──→ theme/tokens.ts（app.vue のみ直接参照）
content/ ─→ @nuxt/content + remark/ ─→ ContentRenderer ─→ components/content/
```

- 右から左への import は作らない。`utils` は上の層を import しない。`composables` はコンポーネントを import しない。
- `layouts/` は `pages/` と並ぶ入口で、ルートを持たず全ページ共通の枠を置く。ルートに紐付かない表示はここから下に生える。
- `components/` は領域のディレクトリ（`layout/` `article/` `content/` `common/` `error/`）に分け、直下にファイルは置かない。領域の間では `article/` が `common/` を使い、`layout/` は他の領域を使わない。
- `content/` の記事は `@nuxt/content` と `remark/` を経て描画され、本文中のコンポーネントは `components/content/` だけが受ける。
- `components/` はページの文脈（route の読み取り・404 の送出・ページのメタの設定）を持たない。route を読むのは入口（`pages/` `layouts/` `app.vue` `error.vue`）だけで、`components/` は props、`composables/` と `utils/` は引数で受け取る（[ADR 14](./adr/14-route-read-only-at-entry.md)）。ページ番号の分だけルートファイルが増える一覧（[ADR 01](./adr/01-page-number-in-path.md)）は、本体を `pages/` 配下に `-` 始まりのファイル名（Nuxt のスキャン除外規則）で置き、ルートファイルはそれを import して描画するだけにする。

## 静的生成とスタイルの流れ

- 静的生成でビルド時に全ページを作る。ビルド時刻が焼き付く値はクライアントで `onMounted` 後に計算する。
- スタイルは `theme/tokens.ts` → `tailwind.config.ts` → CSS 変数と Tailwind theme の一方向。テーマの切り替えは CSS 変数の再定義で成立させる。

データの流れと状態の持ち方は `.claude/rules/structure.md` にある。

---

## 検査の置き場

検査を足すときの置き場は、判定に何が要るかで決める。整形は Prettier に、ファイル1つで判定できるそれ以外の違反は ESLint に、型の解決が要る違反（シグネチャの不一致・解決できない型の import）は `nuxt typecheck` に、依存グラフが要る違反（循環・依存方向）は dependency-cruiser に、記事をまたいで突き合わせる違反（タグのスラッグ）と ESLint が読まないファイルの違反（記事のフロントマター）は `scripts/` の検査に置く。
ブラウザで操作しないと判定できない違反（被せた UI のキーボード・日本語入力・履歴の経路）は `scripts/` の probe に置き、lint では回さない。
ESLint はスタイルガイドのプリセットを取り込まず、ルールを1本ずつ足す。整形ルールは足さない。
lint で落とせるようになったルールは `.claude/rules/` から消す（二重管理にしない）。

commit のたびに回すのは lint だけにする。待たされるものを増やさないため、テストと型検査と build は PR で受ける。

dependency-cruiser のベースラインは `.dependency-cruiser-known-violations.json`。新規の違反は直し、ベースラインには足さない。ベースラインにある違反を直したら次のコマンドで作り直す（減らす方向にだけ使う）。

```sh
npx depcruise app --config --output-type baseline > .dependency-cruiser-known-violations.json
```
