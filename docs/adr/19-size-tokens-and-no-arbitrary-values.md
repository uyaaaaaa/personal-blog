# サイズにも名前を付けてトークンに置き、任意値を lint で落とす

`theme/tokens.ts` に `sizes` を足し、`tailwind.config.ts` が `theme.extend` へ展開する。Tailwind のスケールに無い値は `w-sidebar` `rounded-card` のような名前のクラスで書き、角括弧を含むクラス（`w-[264px]`）を `class` / `:class` に書くと `npm run lint` の `vue/no-restricted-syntax` が落とす。

- **検討した案**
  - **`eslint-plugin-tailwindcss` の `no-arbitrary-value`**: 任意値だけを名指しできるが、プラグインが Tailwind の設定を自前で解決するため依存が1つ増える。見るものは結局「角括弧を含むクラス」で同じ。
  - **Stylelint**: 対象は `<style>` と CSS で、`class` 属性を見ないので任意値には効かない（強制手段の表で任意値を Stylelint 側に置いていたのは誤り）。
  - **`vue/no-restricted-class` に `/\[/` を渡す**: 静的な `class`、`:class` のオブジェクト・配列・テンプレートリテラルは見るが、**三項演算子の分岐（`:class="cond ? 'max-h-[60vh]' : ''"`）を見ない**（プローブで確認）。この形はこのリポジトリで5箇所使っている。
  - **`vue/no-restricted-syntax`（採用）**: `class` の `VLiteral` と `:class` の中の文字列リテラル・テンプレート要素を見るので `vue/no-restricted-class` の穴が無く、message に直し方と参照先を書ける。
  - **値は残して `.claude/rules/` の規約だけで縛る**: Claude Code のセッションでしか効かない。
- **対価**: 3つある。
  - **名前が要る**: 1箇所でしか使わない値にも名前が要る。`hero-media` `shelf-card` `toc-hidden` のようにコンポーネント名を含む名前が `tokens.ts` に並ぶ。
  - **任意プロパティ・任意バリアントも書けない**: 角括弧を含むクラスを一律で落とすので、任意プロパティ（`[mask-type:alpha]`）と任意バリアント（`[&>svg]:`）も書けない。要るようになったらセレクタの正規表現を狭める。
  - **見る範囲が属性だけ**: `class` / `:class` 属性だけを見るので、`<style>` の直値と、変数に組み立ててから渡すクラス名は素通りする。`TocMobile.vue` の `STICKY_TOP` がスクリプト側に `74` を持ったままなのもこれで、トークンを import すると `theme/` を参照できるのは `app.vue` だけという依存方向を破る。
- **戻す条件**: `sizes` が増えて名前が値の言い換えになったとき（1コンポーネント専用の名前が過半を占めたとき）。その値はコンポーネントの scoped CSS に戻し、`<style>` を見られる Stylelint を入れて縛り直す。
