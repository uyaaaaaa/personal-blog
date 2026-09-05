# パスの書き分けとプラットフォーム系の禁止を ESLint の標準ルールで落とす

`eslint.config.mjs` に `no-restricted-imports`（ディレクトリを跨ぐ相対パスと `@/`）と `no-restricted-syntax`（`navigator.userAgent` の参照、`unload` / `beforeunload` の購読、`on(before)unload` への代入）を足し、`app/` の `.ts` と `.vue` に同じ制限をかける。プラグインは足さない。

- **検討した案**: (1) `eslint-plugin-import` の `no-relative-parent-imports`。依存が1つ増え、`~/` を解決させる settings も要る。落としたいのは「`../` でディレクトリを跨ぐこと」だけで、解決先までは要らない。(2) dependency-cruiser に持たせる。あちらが見るのは解決後のモジュール同士の関係で、`~/utils/tag` と `../utils/tag` は同じ辺になるため、書き方は判定できない。(3) `.claude/rules/` の規約のままにする。Claude Code のセッションでしか効かない。(4) 標準ルール2本（採用）。依存が増えず、message に直し方と参照先を書ける。
- **対価**: 3つある。(a) `app/**/*.ts` を ESLint の対象に加えた。flat config の `files` が `.vue` だけだったため、composables と utils はこれまで1本も lint されていない。今後 `.ts` に効くルールを足すと、既存の違反がまとめて出る。(b) 見るのは構文の形だけで、変数に入れたイベント名や動的に組み立てたプロパティ名は素通りする（`userAgent` は `navigator.` 経由・`window.navigator.` 経由・角括弧の3形を落とすが、`const k = 'userAgent'` からの参照は見えない）。(c) `unload` の禁止は `addEventListener` / `removeEventListener` の第1引数と `on(before)unload` への代入に限る。フレームワーク経由の購読は見えない。
- **戻す条件**: ディレクトリを跨ぐ相対パスが要る構成に組み替えたとき（型別のフラット構成をやめる場合。→ [07](./07-flat-directory-by-type.md)）。`navigator.userAgent` は、機能検出で判定できない不具合の回避が要るときに、その1箇所だけ `eslint-disable` で開ける。
