---
title: "BEFORE DELETEトリガーは、削除のたびに走るとは限らない"
emoji: "🐬"
description: "CASCADEとTRUNCATEでは発火しない。使いどころはその線の内側だけ。"
published: true
date: 2026-09-14
tags:
  - mysql
  - trigger
category: blog
---
## 削除のたびに必ず走る、と思っていいのか

「行が消えるときに何かしたい」という要件に、MySQLのトリガーは一見ぴったり当てはまる。
削除ログを残す、関連データを片付ける、削除された数を数える。どれも `BEFORE DELETE` で書けそうに見える。

ただ、これが成立するのは「行が消えるときに必ず走る」場合だけ。
そこが気になったので、MySQL 8.0.46 で実際に確かめた。**結論から言うと、必ずは走らない。**

## BEFORE DELETEトリガーの書き方

トリガーは「あるテーブルへの操作をきっかけに、自動で走るSQL」。
`BEFORE DELETE` なら、行が削除される直前に、削除される行1件ごとに走る。

```sql
CREATE TRIGGER posts_before_delete BEFORE DELETE ON posts
FOR EACH ROW
  INSERT INTO deleted_posts_log (post_id) VALUES (OLD.id);
```

`FOR EACH ROW` が「1行ごとに」の意味で、`OLD` がこれから消える行を指す。
`OLD.id` のようにカラムを読める。削除の場合 `OLD` は読み取り専用で、代入しようとするとエラーになる。

```txt
ERROR 1362 (HY000): Updating of OLD row is not allowed in trigger
```

自分が仕掛けられているテーブル自身も更新できない。

```txt
ERROR 1442 (HY000): Can't update table 'items' in stored function/trigger because it is
already used by statement which invoked this stored function/trigger.
```

## 発火する経路と、しない経路

ここが本題。同じ「postsの行が消える」でも、経路によって結果が違った。

| 行の消え方 | BEFORE DELETEトリガー |
| :--- | :--- |
| `DELETE FROM posts ...` | 発火する |
| 外部キーの `ON DELETE CASCADE` による削除 | **発火しない** |
| `TRUNCATE TABLE posts` | **発火しない** |
| `DROP TABLE posts` | 発火しない（トリガーも一緒に消える） |

**行は確かに消えているのに、トリガーだけが走らない。** これが `CASCADE` と `TRUNCATE` の厄介なところで、
削除ログが欠けても、エラーは何も出ない。

## 実際に確かめる

親子テーブルを `ON DELETE CASCADE` で繋ぎ、子テーブルに `BEFORE DELETE` を仕掛ける。

```sql
CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TABLE posts (
  id INT PRIMARY KEY,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE deleted_posts_log (id INT AUTO_INCREMENT PRIMARY KEY, post_id INT);

CREATE TRIGGER posts_before_delete BEFORE DELETE ON posts
FOR EACH ROW
  INSERT INTO deleted_posts_log (post_id) VALUES (OLD.id);

INSERT INTO users VALUES (1,'a'),(2,'b');
INSERT INTO posts VALUES (10,1),(20,2);
```

まず `posts` を直接消すと、ログが1件積まれる。

```sql
DELETE FROM posts WHERE id = 10;
SELECT * FROM deleted_posts_log;
```

```txt
+----+---------+
| id | post_id |
+----+---------+
|  1 |      10 |
+----+---------+
```

次に、親の `users` を消して `CASCADE` を発動させる。

```sql
DELETE FROM users WHERE id = 2;
SELECT * FROM posts;
SELECT * FROM deleted_posts_log;
```

```txt
Empty set (0.00 sec)

+----+---------+
| id | post_id |
+----+---------+
|  1 |      10 |
+----+---------+
```

`posts` は空になった。id=20の行は確かに消えている。それでもログは1件のままで、増えていない。
`TRUNCATE TABLE posts` でも同じで、行だけが消えてログは増えなかった。

> [!WARNING] 「発火しなかった」は成功として返る
> `CASCADE` も `TRUNCATE` もエラーにはならない。トリガーが走らなかったことに気づく手段が実行結果の側に無いので、
> ログの件数が合わないときに初めて発覚する。

## 使いどころは、アプリが打つDELETE文の内側だけ

トリガーが守れる範囲は「アプリケーションが自分で `DELETE` 文を打つ経路」に限られる。
逆に、次のような要件はトリガーでは満たせない。

- 外部キーの `CASCADE` で連鎖的に消える子テーブルの削除ログを取る
- `TRUNCATE` を含む運用作業も漏らさず記録する
- 「このテーブルから消えた行は必ずどこかに残る」を保証する

**「必ず記録される」ことが要件に入っているなら、トリガーは選ばない。**
`CASCADE` をやめてアプリ側で子の削除を明示的に書くか、そもそも物理削除をやめて論理削除にするほうが確実になる。

`CASCADE` で消える行を記録したい、という要件が最初から分かっているなら、
**外部キーの `CASCADE` とトリガーは組み合わせない**と決めておくのが早い。

## 参考

- [MySQL 8.0 リファレンス: CREATE TRIGGER Statement](https://dev.mysql.com/doc/refman/8.0/ja/create-trigger.html)
- [MySQL 8.0 リファレンス: FOREIGN KEY 制約](https://dev.mysql.com/doc/refman/8.0/ja/create-table-foreign-keys.html)
- [MySQL Bugs #11472: Triggers not executed following foreign key updates/deletes](https://bugs.mysql.com/bug.php?id=11472)
