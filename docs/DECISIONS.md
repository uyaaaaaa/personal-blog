# 判断の記録

思想が反映されていて、簡単には変えられない判断だけを `docs/adr/` に1判断1ファイルで置きます。
コンポーネント内の設計や個々の制約は書きません（実装が正です）。基準と書き方は [.claude/rules/docs.md](../.claude/rules/docs.md)、デザインの大方針は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md)、構造と強制手段は [ARCHITECTURE.md](./ARCHITECTURE.md) にあります。

番号は連番で、消した番号は再利用しません。

- [01 ページ番号をクエリではなくパスで持つ](./adr/01-page-number-in-path.md)
- [02 `prefers-reduced-motion` を参照しない](./adr/02-no-prefers-reduced-motion.md)
- [03 自作モジュールの auto-import を止める](./adr/03-no-auto-import.md)
- [07 ディレクトリは型別のフラット構成を維持する](./adr/07-flat-directory-by-type.md)
- [13 整形は Prettier に任せ、ESLint には持たせない](./adr/13-prettier-owns-formatting.md)
- [14 テストは実装の隣に置く](./adr/14-tests-next-to-source.md)
- [15 Nuxt を起こすのはコンポーネントのテストだけにする](./adr/15-nuxt-environment-per-file.md)
- [17 テストを2回目の使用とみなして抽出する](./adr/17-test-as-second-use.md)
- [19 サイズにも名前を付けてトークンに置く](./adr/19-size-tokens-and-no-arbitrary-values.md)
- [21 ドキュメントは原則持たず、思想が反映され簡単に変えられない判断だけを ADR に残す](./adr/21-docs-only-for-hard-to-reverse-decisions.md)
