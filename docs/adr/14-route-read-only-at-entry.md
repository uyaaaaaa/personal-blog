# route を読むのは入口だけにし、下の層は props と引数で受け取る

`useRoute` / `useRouter` / `$route` を呼べるのを入口（`pages/` `layouts/` `app.vue` `error.vue`）に限り、`components/` `composables/` `utils/` では `npm run lint` が落とす。route の値が要る下の層は、コンポーネントなら props、composable なら引数で受け取る。落とすのは値の読み方（`.params`・分割代入）ではなく取得の呼び出しそのものなので、route から何を引くかに関わらず同じ1本で落ちる。

- **検討した案**
  - **`.params` の読み取りだけを落とす（従来）**: `const { params } = useRoute()` と、`components/` から呼んだ `composables/` の中の読み取りが素通りする。値の読み方を列挙する形なので、`path` や `fullPath` を足すたびにルートが増え、書き方を変えれば抜けられる。
  - **route を読む composable の名前を lint の一覧に持つ**: `usePagination` のように route を読む composable を `components/` から呼べなくできるが、一覧は composable が増えるたびに手で足す必要があり、足し忘れが穴になる。効いている検査を文書ではなく設定に持つだけで、[ADR 11](./11-no-enforcement-inventory.md) が避けた台帳と同じものができる。
  - **`layouts/` も route を読めない側に入れ、`pages/` だけに閉じる**: 全ページ共通の枠に置くヘッダーは `pages/` から見えないため、遷移で被せた UI を閉じる signal の出どころが無くなる。ルートを持たない枠のために、ルートを持つ層から値を逆流させる経路が要る。
  - **取得の呼び出しを落とす（採用）**: route に届く入口は `useRoute` / `useRouter` / `$route` の3つしかなく、下の層はここを塞げば props と引数以外から route に届けない。判定がファイル1つで閉じるので ESLint に置ける。
- **対価**
  - **入口が2階層になる**: 「route を読めるのは `pages/` だけ」とは言えず、`layouts/` を含めた入口の集合を覚える必要がある。`layouts/` は全ページ共通の枠で、route の値ではなく遷移そのものを配る。
  - **props の中継が生える**: ヘッダーは受け取った現在地を自分でも使い、`HeaderNavigation` にも渡す。[ADR 13](./13-fetch-follows-route-dependency.md) が取得について退けた「中継だけの層」とは違い、中継する側も同じ値で閉じるが、階層が深くなれば同じ形の受け渡しは増える。
  - **composable の引数が増える**: `usePagination` と `usePageSeo` は route から取っていた値を引数で受け取るので、呼び出し側が何を渡すかを毎回書く。渡し忘れは型が落とす。
- **戻す条件**: route を必要とする層が入口から遠くなり、props の中継が3階層を超えたとき。そのときは provide / inject か、route を読む唯一の composable を1つ決めて例外にする。
