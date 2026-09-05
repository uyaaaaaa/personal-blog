# Nuxt を起こすのはコンポーネントのテストだけにする

Vitest は `@nuxt/test-utils` の `defineVitestConfig` で設定し、既定の環境は `node` のままにする。Nuxt を起こすのはファイル先頭に `// @vitest-environment nuxt` を書いたテストだけで、`app/utils/` の純粋関数はこれまでどおり Nuxt 抜きで走る。

- **検討した案**
  - **`vitest/config` の `defineConfig` のままコンポーネントを `@vue/test-utils` で浅くマウントする**: `NuxtLink` が解決されずスタブになるため、このリポジトリのコンポーネントで守りたいことの多くを占める `href`（[ページ番号はパスで持つ](./01-page-number-in-path.md)、`View All` の導線）を確かめられない。
  - **既定の環境ごと `nuxt` にする**: テスト自体の速さは変わらない（`app/utils/` の4ファイルは合わせて 33ms のまま）が、環境の用意がファイルごとに要るため、その4ファイルだけで 0.8 秒台から 3.0 秒台になる。
  - **Vitest 4 + `@nuxt/test-utils` 4**: Node 22 に同梱の npm 10 は、どちらかが入るだけで依存解決中に `TypeError: Cannot read properties of null (reading 'edgesOut')` で落ちる。npm 11 なら入るが、npm 11 が書いた lockfile を npm 10 の `npm ci` が `Missing: @oxc-parser/binding-* from lock file` で拒否するため、GitHub Actions と Cloudflare Pages の両方で npm を上げる必要がある。Cloudflare 側の npm はリポジトリから見えないので、デプロイを落とすリスクを負う。
- **対価**: `defineVitestConfig` は設定を読む時点で Nuxt を起動するため、テスト全体が `better-sqlite3` のネイティブに依存する。`npm ci --ignore-scripts` の環境では `Could not locate the bindings file` で1件も走らない（`Test` ワークフローは scripts ありの `npm ci` なので影響しない）。`nuxt` 環境のファイルは Nuxt の起動分だけ遅く、`npm test` 全体は 4ファイル 0.6 秒台から 9ファイル 3.9 秒台になる。
- **戻す条件**: 純粋関数のテストが Nuxt 環境でも十分速くなったら、ファイルごとの指定をやめて既定を `nuxt` に寄せる。Vitest 4 に上げるのは、CI と Cloudflare の npm が11以降で揃ったとき。
