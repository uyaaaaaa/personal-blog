# 付録：React 実装

> **最終確認日：2026-09-01**
> このファイルは腐ることを前提に隔離した場所です。バージョン・ツール設定・エコシステムの現況を扱います。
> 規約本体（[../rules/](../rules/)）には日付を書きません。本体まで賞味期限があるように読まれるためです。

React を採用するプロジェクトでは、このファイルを残し `vue.md` を削除してください。

---

## 既定のレンダリング戦略（`R-1`）

プロジェクトごとに1つ決めて、ここに記載します。

```
既定戦略：（未設定）
逸脱しているルート：（なし）
```

---

## 境界の lint 設定（`A-1` / `A-5`）

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
  // S-6: ストア層が API 層を import しない
  'import/no-restricted-paths': ['error', { zones: [
    { target: './src/**/store', from: './src/**/api',
      message: 'リモートデータをストアに置かない。docs/rules/state.md#s-6' },
  ]}],
}
```

CI 側（`A-4` / `A-13`）：

```sh
madge --circular --extensions ts,tsx src
depcruise src --config --ignore-known   # ベースライン運用
```

`entry-point` が同一 element 内部の import をどう扱うかはバージョンによって異なります。
導入時に、`features/<name>/model` からの相対 import が通ることを実際に確認してください。

---

## 暗黙解決（`A-11` 〜 `A-13`）

React には標準の auto-import 機構がないため、`A-11` は概ね自動的に満たされます。
**`A-13`（暗黙解決の新規導入には証明を伴う）が効く対象**は次です。

- コード生成物（GraphQL codegen、ルート型生成）
- `declare module` による module augmentation
- ビルド時マクロ、コンパイラプラグイン
- グローバル型定義（`global.d.ts` に置かれた型）

これらを追加する PR では、依存グラフツールがその依存を追跡できるかを確認します。

---

## 状態の実装（`S-6` 〜 `S-11`）

- サーバキャッシュ層：TanStack Query
- クライアント状態：必要になってから。既定はローカル state（`S-1` の「最後の手段」）
- URL 状態：ルータの search params。**型付きの parse を1モジュールに集約する**（`S-2` / `S-17`）
- スキーマ検証：Zod もしくは Valibot（バンドルサイズが問題なら後者）

**プロジェクト側で明示的に設定するデフォルト**

```ts
// staleTime を未指定にしない（S-11）。ドメイン別の値は本体の表を参照
new QueryClient({ defaultOptions: { queries: { staleTime: /* 要決定 */ } } })
```

---

## コンポーネントの実装

- headless プリミティブ（`C-11`）：採用するライブラリをここに記載する。
  **アプリコードから直接 import せず、`ui/` の wrapper 経由にする**（差し替え可能性の確保）
- `C-7`（ネイティブ属性を塞がない）：`ComponentPropsWithoutRef<'button'>` を extend し rest を spread。
  React 19 以降は `ref` が通常の prop なので `forwardRef` は不要
- `className` のマージ：ユーティリティファーストを使う場合、単純結合は CSS 順序に依存して不安定になるため
  衝突解決ライブラリを使う
- `C-2`（`XxxContainer` 禁止）の強制：

```js
'no-restricted-syntax': [{
  selector: 'VariableDeclarator[id.name=/Container$/]',
  message: 'Container サフィックスは禁止。docs/rules/components.md#c-2',
}]
```

---

## プラットフォームの lint（`P-7` / `P-14` / `P-18`）

- `P-7`：`eslint-plugin-jsx-a11y` の `no-static-element-interactions` / `click-events-have-key-events`
- `P-2`：`no-restricted-properties` で `navigator.userAgent`
- `P-14` / `P-18`：既製ルールがないため、`no-restricted-syntax` で個別に書く
