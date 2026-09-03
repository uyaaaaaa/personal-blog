# 付録：Vue / Nuxt 実装

> **最終確認日：2026-09-02**
> このファイルは腐ることを前提に隔離した場所です。バージョン・ツール設定・エコシステムの現況を扱います。
> 規約本体（[../rules/](../rules/)）には日付を書きません。本体まで賞味期限があるように読まれるためです。

Vue / Nuxt を採用するプロジェクトでは、このファイルを残し `react.md` を削除してください。

---

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
  imports: { scan: false },
  // A-11: コンポーネントの自動登録を止める
  components: false,
})
```

**許可されるもの**：`ref` `computed` `watch` `useRoute` 等のフレームワーク組み込み API と、
`pages/` によるファイルベースルーティング。

**`autoImport: false` ではなく `scan: false` を使うこと。** `autoImport: false` は
フレームワーク組み込み API まで止めるため、上の「許可されるもの」と両立しません
（Nuxt 4.2 / `@nuxt/content` 3.9 で確認。`useColorMode is not defined` で 500 になります）。
`scan: false` は `app/composables/`・`app/utils/`・`shared/` の走査だけを止め、
プリセット由来の `ref` / `useAsyncData` / `useColorMode` / `queryCollection` は解決されたままです。
どちらでも `#imports` から手動 import はできますが、`A-11` が求めているのは前者だけの停止です。

**Nuxt Layers を使う場合**：公式に「層で構成する場合は auto-import に頼らず明示的に import せよ、
さもないと層のオーバーライド機能が壊れる」という警告があります。
`A-11` 〜 `A-13` はこの警告と同じ方向を向いており、**両立します。**

`unplugin-auto-import` / `unplugin-vue-components` を新規に導入しません（`A-13` の証明が必要）。

### `components: false` の2つの注意点

**`app/components/content/` はこの設定の影響を受けません。** `@nuxt/content` が
`components:dirs` フックで `nuxt.options.components` とは独立にこのディレクトリを登録するためです。
markdown 側がコンポーネントを名前で解決する以上ここは明示 import できないので、
`A-12` の適用対象外として扱います（`Callout` / `ProseA` / `ProseTable`）。

**コンポーネントの未 import はビルドで落ちません。** Vue の警告が出るだけで prerender は成功し、
そのコンポーネントが消えた HTML が生成されます。composable / util の未 import が実行時
`ReferenceError` → prerender 失敗になるのとは非対称です。このため `A-12` のコンポーネント側は
`vue/no-undef-components`（`eslint.config.mjs`）で強制します。

---

## 境界の lint 設定（`A-1` / `A-5`）

`react.md` と同じ構成です。`extensions` に `.vue` を含めること。

```js
'import/no-cycle': ['error', { maxDepth: 3, ignoreExternal: true }],
```

```sh
madge --circular --extensions ts,vue src
```

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

