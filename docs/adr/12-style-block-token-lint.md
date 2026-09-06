# scoped CSS の値も Tailwind の語彙に限り、ESLint で落とす

`<style>` に書く色の直値と `px` / `rem` の直値を `npm run lint` が落とす。色は `var(--color-*)` 由来だけを許し、長さは Tailwind の既定のスケールと `theme/tokens.ts` の `sizes` にある値だけを許す。許す値は Tailwind の既定に `sizes` を重ねて解決した theme から作るので、`sizes` に名前を足せばそのまま通る。

- **検討した案**
  - **Stylelint を入れる**: CSS の構文木が手に入るが、「値が解決済みの theme にあるか」は既存のルールで書けず結局は自作ルールになる。lint のツールだけが1つ増える。
  - **`.claude/rules/` の規約だけで縛る**: Claude Code のセッションでしか効かない。ADR 09 でクラス側を lint に移した理由がそのまま残る。
  - **ESLint の自作ルールで落とす（採用）**: `<style>` の生テキストを postcss で読む。ファイル1つで判定できる違反を ESLint に置く取り決めに沿い、クラス側の任意値と同じコマンドで落ちる。
- **対価**
  - **単一情報源ではなく語彙の検査**: サイズには CSS 変数が無いため、`border-radius: 10px` は `rounded-card` と同じ値でも別々に持たれる。落ちるのは語彙の外の値までで、トークンと同じ値の写しは落ちない。
  - **`<style>` の中に逃げ道が無い**: `eslint-disable` のコメントは `<style>` の中では効かない。例外を作る唯一の手段は `theme/tokens.ts` に名前を足すこと（クラス側の任意値と同じ）。
  - **`.css` ファイルは見ない**: ESLint が読むのは `.vue` の `<style>` だけ。スタイルを `.css` に出すと検査から外れる。
  - **`em` と相対単位は見ない**: 語彙を持たないため対象外。`letter-spacing` を `em` で書けば長さの検査は通る。
- **戻す条件**: スタイルを `.css` ファイルに持つようになったとき。そのときは Stylelint に移す。
