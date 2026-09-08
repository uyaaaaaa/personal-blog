# アーキテクチャ

このリポジトリの**構造の全体図**と、構造が守っている**不変条件**だけを置きます。
個々の取り決めは `.claude/rules/`、判断の理由は [DECISIONS.md](./DECISIONS.md)、デザインの大方針は [DESIGN_GUIDELINE.md](./DESIGN_GUIDELINE.md)。実装を読めば分かること（値・props・ファイルの一覧）は持ちません。

**守るのは、変更が数ファイルのコードで閉じること。** 型別のフラットな構成（→ [ADR 04](./adr/04-flat-directory-by-type.md)）を維持したまま、下の2枚で秩序を保ちます。

## 層と依存方向

```
   pages/    layouts/    app.vue    error.vue        入口。ルートとページの文脈を持つ
      └─────────┴──────────┴──────────┘
                      ║
                      ▼
              components/ ═══▶ composables/ ═══▶ utils/
                   │
                   ├── article ─▶ common          領域間の依存はこの1本だけ
                   │
                   └── content/ ╌◀── ContentRenderer ◀── @nuxt/content + remark/ ◀── content/*.md

              app.vue ═══▶ theme/tokens.ts
```

| 線 | 意味 | 誰が守るか |
| :--- | :--- | :--- |
| `═▶` | 逆流させない。循環も作らない。`theme/` を直接参照するのは `app.vue` だけ | dependency-cruiser。破れば `npm run lint` が落ちる |
| `─▶` | `components/` の領域間の依存。`layout/` は他の領域を使わない | 人（→ [rules/structure.md](../.claude/rules/structure.md)） |
| `╌▶` | 名前で解決され、`import` 文に現れない唯一の経路 | 人（→ [rules/imports.md](../.claude/rules/imports.md)、[ADR 03](./adr/03-no-auto-import.md)） |

## 不変条件

```
        URL ═══(正本)══▶ pages/ ───(props)──▶ components/
                           │                      │
                 route に依る取得         route に依らない取得

  scroll / resize ──▶ useScrollFrame（全体で1本）──▶ 購読側

  theme/tokens.ts ──▶ tailwind.config.ts ──▶ CSS 変数 / Tailwind theme

  ビルド時 ──▶ 全ページを静的生成
```

1. **保持されるべき状態の正本は URL。** 別の state に複製せず、URL が表現できない値は 404 にする。
2. **取得の所有は route への依存で決まる**（→ [ADR 13](./adr/13-fetch-follows-route-dependency.md)）。置かれる場所で中身が変わる部品は props で受け取る。
3. **購読は全体で1本**にまとめ、1フレームに集約する。表示の出し分けは CSS が行う。
4. **スタイルの値はトークンから一方向に流れ**、テーマの切り替えは再定義で成立する（→ [ADR 09](./adr/09-size-tokens-and-no-arbitrary-values.md)、[ADR 12](./adr/12-style-block-token-lint.md)）。
5. **ビルド時刻が焼き付く値はクライアントで計算する。** 静的生成なので、ビルド時に決めた値はページの寿命の間そのまま出る。

細目は [rules/structure.md](../.claude/rules/structure.md) と [rules/style.md](../.claude/rules/style.md) が持ちます。

## 検査の置き場

検査を足すときの置き場は、判定に何が要るかで決める。

| 判定に要るもの | 置き場 |
| :--- | :--- |
| 整形 | Prettier |
| ファイル1つ | ESLint（プリセットは取り込まず1本ずつ足す。整形ルールは足さない） |
| 型の解決 | `nuxt typecheck` |
| 依存グラフ | dependency-cruiser |
| 記事をまたぐ突き合わせ | `scripts/` の検査 |
| ブラウザでの操作 | `scripts/` の probe（lint では回さない） |

機械に落とせないものは `.claude/rules/` か skill が持ち、文書は持たない（→ [ADR 10](./adr/10-docs-only-for-hard-to-reverse-decisions.md)、[ADR 11](./adr/11-no-enforcement-inventory.md)）。lint で落とせるようになったルールは rules から消す。
commit のたびに回すのは lint だけにする。テストと型検査と build は PR で受ける。
