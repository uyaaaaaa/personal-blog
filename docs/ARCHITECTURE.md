# アーキテクチャ

このリポジトリの**構造の全体図**と、構造が守っている**不変条件**だけを置きます。
個々の取り決めは `.claude/rules/`、判断の理由は [DECISIONS.md](./DECISIONS.md)、デザインの大方針は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md)。

**守るのは、変更が数ファイルのコードで閉じること。** 型別のフラットな構成（→ [ADR 04](./adr/04-flat-directory-by-type.md)）を維持したまま、下の2枚で秩序を保ちます。

## 層と依存方向

```
   pages/    layouts/    app.vue    error.vue        入口。route を読めるのはここだけ
      └─────────┴──────────┴──────────┘
                      ║
                      ▼
              components/ ═══▶ composables/ ═══▶ utils/
                   │
                   ├── layout  article  content  error ═══▶ ui   4領域は互いに依存しない
                   │
                   └── content/ ╌◀── ContentRenderer ◀── @nuxt/content + remark/ ◀── content/*.md

              app.vue ═══▶ theme/tokens.ts
```

| 線 | 意味 | 誰が守るか |
| :--- | :--- | :--- |
| `═▶` | 逆流させない。循環も作らない。題材を知る4領域は互いに依存せず、共有する部品は `ui/` に置く。`theme/` を直接参照するのは `app.vue` だけ | dependency-cruiser |
| `╌▶` | 名前で解決され、`import` 文に現れない唯一の経路 | 人（→ [rules/imports.md](../.claude/rules/imports.md)、[ADR 03](./adr/03-no-auto-import.md)） |

テストは `tests/` に同じ構成でミラーして置くので（→ [ADR 06](./adr/06-tests-mirrored-under-tests.md)）、上の線は実装と同じ位置のテストにも当たります。

## 不変条件

```
        URL ═══(正本)══▶ 入口 ═══(props / 引数)═══▶ components/  composables/  utils/
                          │                              │
                route に依る取得                route に依らない取得

  scroll / resize ──▶ useScrollFrame（全体で1本）──▶ 購読側

  theme/tokens.ts ──▶ tailwind.config.ts ──▶ CSS 変数 / Tailwind theme

  ビルド時 ──▶ 全ページを静的生成
```

各条件の細目は [rules/structure.md](../.claude/rules/structure.md) と [rules/style.md](../.claude/rules/style.md)、理由は [ADR 14](./adr/14-route-read-only-at-entry.md)・[ADR 13](./adr/13-fetch-follows-route-dependency.md)・[ADR 09](./adr/09-size-tokens-and-no-arbitrary-values.md)・[ADR 12](./adr/12-style-block-token-lint.md) が持ちます。

## 検査の置き場

検査を足すときの置き場は、判定に何が要るかで決める。

| 判定に要るもの | 置き場 |
| :--- | :--- |
| 整形 | Prettier |
| ファイル1つ | ESLint（プリセットは取り込まず1本ずつ足す。整形ルールは足さない） |
| 型の解決 | `nuxt typecheck` |
| 依存グラフ | dependency-cruiser |
| ファイルをまたぐ突き合わせ | `scripts/` の検査 |
| ESLint が読まないファイル（記事の Markdown） | `scripts/` の検査 |
| ブラウザでの操作 | `scripts/` の probe（lint では回さない） |

commit のたびに回すのは lint だけにし、テストと型検査と build は PR で受ける。lint で落とせるようになったルールは `.claude/rules/` から消す。
