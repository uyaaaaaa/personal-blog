# 判断の記録

覆すと公開 URL かディレクトリ全体が動く判断だけを `docs/adr/` に1判断1ファイルで置きます。
運用の設計（整形・検査の置き方・テストの置き場と走らせ方・デザインの大方針）は書きません。基準と書き方は [.claude/rules/docs.md](../.claude/rules/docs.md)、デザインの大方針は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md)、構造と検査の置き場は [ARCHITECTURE.md](./ARCHITECTURE.md) にあります。

番号は固定の識別子ではなく、リンクはファイル名で引きます。

- [01 ページ番号をクエリではなくパスで持つ](./adr/01-page-number-in-path.md)
- [02 ディレクトリは型別のフラット構成を維持する](./adr/02-flat-directory-by-type.md)
- [03 `components/` の共有部品は題材を知らないものだけを `ui/` に置く](./adr/03-ui-knows-no-domain.md)
- [04 機械が集めたものは記事と別の URL 系統に出す](./adr/04-collected-content-in-its-own-url-family.md)
