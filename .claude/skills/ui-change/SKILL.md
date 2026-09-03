---
name: ui-change
description: このブログの UI（コンポーネント・ページ・スタイル）を追加・変更するときの手順。spec を先に読み、実装と同じ変更で spec と DESIGN_GUIDELINE を直し、build で確認するところまでを1セットにする。「〜のデザインを変えたい」「〜コンポーネントを追加したい」「表示がおかしい」のような依頼で使う。
---

# UI 変更の手順

コーディングの制約は `.claude/rules/` が自動で読み込まれる。このスキルは**手順**だけを扱う。

## 1. 読む

| 変更の対象 | 先に読むもの |
| :--- | :--- |
| ヘッダー・ナビ・フッター | `docs/spec/layout.md` |
| TOP・一覧・カード・ページャ | `docs/spec/article-list.md`、`docs/DESIGN_GUIDELINE.md` 3-C / 3-D |
| 記事ページ・目次・先頭に戻る | `docs/spec/article-detail.md` |
| 本文の見た目・Callout・脚注 | `docs/spec/content.md`、`docs/DESIGN_GUIDELINE.md` 4 |
| エラー表示 | `docs/spec/error.md` |
| 色・フォント・角丸・余白 | `docs/DESIGN_GUIDELINE.md` 2、`theme/tokens.ts` |

spec の「なぜ」を読んでから触る。一見不要に見える指定には理由が書いてある。

## 2. 実装する

- 既存の同種コンポーネントの書き方に揃える（Tailwind のクラスを基本にし、複雑な状態やアニメーションだけ scoped CSS）。
- 新しい色・サイズが要るときは、先に `theme/tokens.ts` または DESIGN_GUIDELINE 2-D に足す。
- コメントは書かない。理由は spec へ。

## 3. ドキュメントを直す

- spec の該当セクションを更新する。Props / 表示要件 / インタラクションの順。実装から読み取れない理由を残す。
- 新しいコンポーネントは、対応する spec ファイルに `##` を1つ足し、`docs/spec/README.md` の表の「主な実装」にファイルを追加する。
- 既知の課題（DESIGN_GUIDELINE 6）を解消したなら行を消す。

## 4. 確認する

```sh
npm run lint && npm run build
```

lint はコンポーネントの import 忘れだけを見る。composable / util の import 忘れは build（prerender）で落ちる。テストは未導入で、`npm run dev` での目視が最後の確認になる。
目視は SP 幅（375px）と PC 幅（1280px）の両方、ライトとダークの両方で行う。
横スクロールが出ていないか、着地位置がヘッダーに潜り込んでいないかを見る。

## 5. コミットする

日本語の言い切りで、何をどう変えたかを1行に書く（例: `ヘッダーメニューの先読みをホバー/フォーカスまで遅らせる`）。
ドキュメントの更新は実装と同じコミットに含める。
