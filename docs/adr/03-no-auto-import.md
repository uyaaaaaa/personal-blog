# 自作モジュールの auto-import を止める

`nuxt.config.ts` で `imports: { scan: false }` と `components: false` にし、自作の composable / util / コンポーネントは明示 import にする。

- **検討した案**: (1) 有効のまま。依存が `import` 文に現れず、循環検出や依存方向の lint が無言で無効になるため却下。(2) `imports.autoImport: false`。Nuxt / Vue の組み込み API まで止まり、`useColorMode` が解決できず 500 になるため却下（Nuxt 4.2 / `@nuxt/content` 3.9 で確認）。(3) `scan: false`（採用）。`app/composables/` `app/utils/` `shared/` の走査だけを止め、プリセット由来の `ref` `useAsyncData` `queryCollection` は解決されたまま。
- **対価**: 素の Nuxt より import を書く量が増える。`app/components/content/` は `@nuxt/content` が `components:dirs` フックで独立に登録するため止められず、`Callout` `ProseA` `ProseTable` は例外として残る。コンポーネントの未 import はビルドで落ちない（警告だけで、そのコンポーネントが消えた HTML が出る）ため、`vue/no-undef-components` を別に要する。
- **戻す条件**: auto-import を含む依存グラフを lint が正確に追えるようになったとき。
