# 判断の記録

思想が反映されていて、簡単には変えられない判断だけを `docs/adr/` に1判断1ファイルで置きます。
コンポーネント内の設計や個々の制約は書きません（実装が正です）。基準と書き方は [.claude/rules/docs.md](../.claude/rules/docs.md)、デザインの大方針は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md)、構造と強制手段は [ARCHITECTURE.md](./ARCHITECTURE.md) にあります。

番号は連番で、ADR を消したら詰め直します。番号は固定の識別子ではなく、リンクはファイル名で引きます。

- [01 ページ番号をクエリではなくパスで持つ](./adr/01-page-number-in-path.md)
- [02 `prefers-reduced-motion` を参照しない](./adr/02-no-prefers-reduced-motion.md)
- [03 自作モジュールの auto-import を止める](./adr/03-no-auto-import.md)
- [04 ディレクトリは型別のフラット構成を維持する](./adr/04-flat-directory-by-type.md)
- [05 整形は Prettier に任せ、ESLint には持たせない](./adr/05-prettier-owns-formatting.md)
- [06 テストは実装の隣に置く](./adr/06-tests-next-to-source.md)
- [07 Nuxt を起こすのはコンポーネントのテストだけにする](./adr/07-nuxt-environment-per-file.md)
- [08 テストを2回目の使用とみなして抽出する](./adr/08-test-as-second-use.md)
- [09 サイズにも名前を付けてトークンに置く](./adr/09-size-tokens-and-no-arbitrary-values.md)
- [10 ドキュメントは原則持たず、思想が反映され簡単に変えられない判断だけを ADR に残す](./adr/10-docs-only-for-hard-to-reverse-decisions.md)
