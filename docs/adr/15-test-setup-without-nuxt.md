# テストの土台は Nuxt を起こさない範囲に留める

Vitest 3系を `vitest/config` の `defineConfig` で使う。`@nuxt/test-utils` の `defineVitestConfig` には差し替えない。

- **検討した案**: (1) 最初から `defineVitestConfig` を使う。設定を読ませるだけで `@nuxt/content` が SQLite を開くため、純粋関数だけを見るテストのために毎回 Nuxt を起動し、`better-sqlite3` のネイティブ（`npm ci --ignore-scripts` では入らず `Could not locate the bindings file` になる）に依存することになる。(2) Vitest 4 + `@nuxt/test-utils` 4。Node 22 に同梱の npm 10 は、どちらかが入るだけで依存解決中に `TypeError: Cannot read properties of null (reading 'edgesOut')` で落ちる。npm 11 なら入るが、npm 11 が書いた lockfile を npm 10 の `npm ci` が `Missing: @oxc-parser/binding-* from lock file` で拒否するため、GitHub Actions と Cloudflare Pages の両方で npm を上げる必要がある。Cloudflare 側の npm はリポジトリから見えないので、デプロイを落とすリスクを負う。
- **対価**: `@nuxt/test-utils` / `@vue/test-utils` / `happy-dom` はコンポーネントのテストを書くまで使われない devDependency になる。`@nuxt/test-utils` を先に入れてあるのは、その peer（`vitest: ^3.2.0`）が Vitest を3系に固定し、うっかり4系に上がるのを防ぐため。
- **戻す条件**: コンポーネントのテストを書くときに `defineVitestConfig` へ差し替える（[#127](https://github.com/uyaaaaaa/personal-blog/issues/127)）。Vitest 4 に上げるのは、CI と Cloudflare の npm が11以降で揃ったとき。
