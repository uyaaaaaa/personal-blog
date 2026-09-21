# 判断の記録

ディレクトリ構造と依存関係に影響する判断だけを `docs/adr/` に1判断1ファイルで置きます。
運用の設計（整形・検査の置き方・テストの走らせ方・デザインの大方針）は書きません。基準と書き方は [.claude/rules/docs.md](../.claude/rules/docs.md)、デザインの大方針は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md)、構造と検査の置き場は [ARCHITECTURE.md](./ARCHITECTURE.md) にあります。

番号は固定の識別子ではなく、リンクはファイル名で引きます。

- [01 ページ番号をクエリではなくパスで持つ](./adr/01-page-number-in-path.md)
- [02 自作モジュールの auto-import を止める](./adr/02-no-auto-import.md)
- [03 ディレクトリは型別のフラット構成を維持する](./adr/03-flat-directory-by-type.md)
- [04 テストは `tests/` に実装の構成をミラーして置く](./adr/04-tests-mirrored-under-tests.md)
- [05 route に依らない取得は、それを出すコンポーネントが持つ](./adr/05-fetch-follows-route-dependency.md)
- [06 route を読むのは入口だけにし、下の層は props と引数で受け取る](./adr/06-route-read-only-at-entry.md)
- [07 `components/` の共有部品は題材を知らないものだけを `ui/` に置く](./adr/07-ui-knows-no-domain.md)
- [08 機械が集めたものは記事と別の URL 系統に出す](./adr/08-collected-content-in-its-own-url-family.md)
