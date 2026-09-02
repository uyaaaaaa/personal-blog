# 付録：Vue / Nuxt 実装

> **最終確認日：2026-09-01**
> このファイルは腐ることを前提に隔離した場所です。バージョン・ツール設定・エコシステムの現況を扱います。
> 規約本体（[../rules/](../rules/)）には日付を書きません。本体まで賞味期限があるように読まれるためです。

## 既定のレンダリング戦略（`R-1`）

```
既定戦略：（未設定）
逸脱しているルート：（なし）
```

---

## 暗黙解決の設定（`A-11` 〜 `A-13`）

**Nuxt では、この設定が `A-11` 〜 `A-13` の成否をそのまま決めます。**

Nuxt の auto-import は既定で `app/components/`・`app/composables/`・`app/utils/` を対象にします。
このうち**自作の composable / util / コンポーネントは `A-12` により明示 import が必須**です。

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  // A-11: 自作 composable / util の auto-import を止める
  imports: { autoImport: false },
  // A-11: コンポーネントの自動登録を止める
  components: false,
})
```

**許可されるもの**：`ref` `computed` `watch` `useRoute` 等のフレームワーク組み込み API と、
`pages/` によるファイルベースルーティング。

**Nuxt Layers を使う場合**：公式に「層で構成する場合は auto-import に頼らず明示的に import せよ、
さもないと層のオーバーライド機能が壊れる」という警告があります。
`A-11` 〜 `A-13` はこの警告と同じ方向を向いており、**両立します。**

`unplugin-auto-import` / `unplugin-vue-components` を新規に導入しません（`A-13` の証明が必要）。

`autoImport: false` にしたとき Nuxt 組み込み composable の解決がどこまで残るかはバージョン依存です。
設定後に `ref` / `useRoute` 等が解決されることを確認してください。

---

## 境界の lint 設定（`A-1` / `A-5`）

`eslint-plugin-boundaries` と `eslint-plugin-import` の `extensions` に `.vue` を含めること。
パターンの `src/` は、このリポジトリでは `app/` に読み替えます。

```js
// eslint.config.js
// プラグインのバージョン差があるため、導入時に実挙動で検証すること
settings: {
  'boundaries/elements': [
    { type: 'app',     pattern: 'src/app/**' },
    { type: 'feature', pattern: 'src/features/*', capture: ['name'] },
    { type: 'shared',  pattern: 'src/shared/*',   capture: ['name'] },
  ],
},
rules: {
  // A-5: 依存方向
  'boundaries/element-types': ['error', {
    default: 'disallow',
    rules: [
      { from: ['app'],     allow: ['feature', 'shared'] },
      { from: ['feature'], allow: ['shared', ['feature', { name: '${from.name}' }]] },
      { from: ['shared'],  allow: [['shared', { name: '${from.name}' }]] },
    ],
    message: '依存方向違反: shared → features → app の一方向のみ。docs/rules/boundaries.md#a-5',
  }],
  // A-1: 公開面はディレクトリ構造
  'boundaries/entry-point': ['error', {
    default: 'disallow',
    rules: [
      { target: ['feature'], allow: '{ui,api}/**' },
      { target: ['shared'],  allow: '**' },
    ],
    message: 'features/<name>/{ui,api} 以外への import は禁止。docs/rules/boundaries.md#a-1',
  }],
  // A-2: barrel 禁止
  'no-restricted-syntax': ['error', {
    selector: 'ExportAllDeclaration',
    message: 'export * は禁止。docs/rules/boundaries.md#a-2',
  }],
  // A-4: 循環禁止（速度が問題なら lint から外し CI の madge のみにする）
  'import/no-cycle': ['error', { maxDepth: 3, ignoreExternal: true }],
}
```

CI 側（`A-4` / `A-13`）：

```sh
madge --circular --extensions ts,vue src
depcruise src --config --ignore-known   # ベースライン運用
```

`entry-point` が同一 element 内部の import をどう扱うかはバージョンによって異なります。
導入時に、`features/<name>/model` からの相対 import が通ることを実際に確認してください。

**注意**：auto-import を有効にしたまま `madge` / `dependency-cruiser` を回すと、
**依存グラフが実態より疎に見えます。**「循環なし」の結果が、循環がないことを意味しません。
上記の `autoImport: false` はこの検証可能性のための設定でもあります。

---

## 状態の実装（`S-6` 〜 `S-11`）

- サーバキャッシュ層：Pinia Colada、もしくは `useAsyncData` / `useFetch`
- クライアント状態：Pinia。ただし `S-1` の「最後の手段」
- URL 状態：`useRoute().query` を型付き parse でラップし、1モジュールに集約する（`S-2` / `S-17`）

**`$fetch` を setup で直接使わないこと。**
サーバとクライアントで二重にフェッチが走り、重複排除もナビゲーション制御も効きません。
`$fetch` はクライアント側のインタラクション用です。

**`useAsyncData` を副作用のトリガに使わないこと**（Pinia アクションの呼び出し等）。
nullish な値で繰り返し実行される既知の問題があります。

---

## コンポーネントの実装

- `C-7`（ネイティブ属性を塞がない）：Vue の attribute fallthrough は既定で機能しますが、
  **ルート要素が複数、または `inheritAttrs: false` にすると壊れます。**
  その場合は `v-bind="$attrs"` を置く場所を明示的に決めること。attrs が「どこにも行かない」状態を作らない
- カスタムイベント名：Vue 3 では camelCase / kebab-case どちらも動くため、**プロジェクト内で統一**する
  （`eslint-plugin-vue` の `custom-event-name-casing`）
- `C-8`（polymorphic）：Vue には `is` / dynamic component があり React ほど型コストがありませんが、
  **`is` に任意文字列を許さず union で絞る**こと
- `C-14`（SSR 状態汚染）：**モジュールスコープの `ref` を composable に持たせない。**
  Nuxt では `useState()` を使う

---

## プラットフォームの lint（`P-7` / `P-14` / `P-18`）

- `P-7`：`eslint-plugin-vuejs-accessibility`
- `P-2`：`no-restricted-properties` で `navigator.userAgent`
- `P-14` / `P-18`：既製ルールがないため `no-restricted-syntax` で個別に書く

---

## Vue 公式スタイルガイドから採用する項目

フレームワーク非依存の規約に安全に転記できる、数少ない公式ガイダンスです。

- 親コンポーネントの文脈でしか意味を成さない子は、**親名を接頭辞にする**（`TodoList` / `TodoListItem`）→ `C-7`
- コンポーネント名は**最も一般的な語で始まり、記述的な修飾語で終わる**（`SearchButtonClear`）→ `C-7`
- 1コンポーネント1ファイル
- ファイル名の casing はリポジトリ全体で1つに固定する

