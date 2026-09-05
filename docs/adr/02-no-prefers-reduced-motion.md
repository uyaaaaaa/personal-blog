# `prefers-reduced-motion` を参照しない

サイトのモーションは、OS の「視差効果を減らす」設定に関わらず常に同じように動く。`@media (prefers-reduced-motion)` も `matchMedia` も置かない。

- **検討した案**: 参照して全モーションを止める。以前はそう実装していた（`layouts/default.vue` のグローバル `*` セレクタ、`useScrollTo` の `behavior` 分岐、`HeaderMenuPanel` の開閉）。意図的にユーザーの申告を無視する側に倒した。
- **対価**: 前庭障害への配慮という本来の趣旨に反する。
- **戻す条件**: 読者からの要望があったとき、または WCAG の準拠を要件にしたとき。戻す場合は上の3箇所に手を入れる。`NuxtLoadingIndicator` のようにインライン style で当ててくるものを打ち消すため、CSS 側には `!important` が要る。
