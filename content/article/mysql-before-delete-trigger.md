---
title: "MySQLのBEFORE DELETEトリガーをちゃんと調べる"
description: "削除のたびに必ず走ると思っていたら、そうでもなかった話。"
published: true
date: 2026-09-14
tags:
  - mysql
  - trigger
category: blog
---
## 主題

「行が消えるときに何かしたい」という要件に、MySQLのトリガーは一見ぴったり当てはまる。

削除ログを残す、関連データを片付ける、消えた件数を数える。
どれも `BEFORE DELETE` で書けそうに見えるし、実際それっぽく動く。

ただ、これが成立するのは「行が消えるときに**必ず**走る」場合だけなので、
「本当に必ず走るのか？」がずっと気になっていた。ちゃんと調べる。

※ 以降の内容はすべて MySQL 8.0.46 で確認しています。

## そもそもトリガーとは？

あるテーブルへの操作をきっかけに、自動で走るSQLのこと。
`BEFORE DELETE` なら、行が削除される直前に、削除される行1件ごとに走る。

```sql
CREATE TRIGGER posts_before_delete BEFORE DELETE ON posts
FOR EACH ROW
  INSERT INTO deleted_posts_log (post_id) VALUES (OLD.id);
```

`FOR EACH ROW` が「1行ごとに」の意味で、`OLD` がこれから消える行を指している。
`OLD.id` のようにカラムを読めるが、削除の場合 `OLD` は読み取り専用なので、代入しようとすると怒られる。

```txt
ERROR 1362 (HY000): Updating of OLD row is not allowed in trigger
```

自分が仕掛けられているテーブル自身も更新できない。これも怒られる。

```txt
ERROR 1442 (HY000): Can't update table 'items' in stored function/trigger because it is
already used by statement which invoked this stored function/trigger.
```

## 実際に試してみる

親子テーブルを `ON DELETE CASCADE` で繋ぎ、子テーブルの方に `BEFORE DELETE` を仕掛けてみる。

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

まずは `posts` を直接消してみる。

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

ログが1件積まれた。ここまでは想定通り。

次に、親の `users` の方を消して `CASCADE` を発動させてみると、、、

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

`posts` は空になっている。id=20の行は確かに消えた。
にもかかわらず、ログは1件のままで増えていない。**トリガーが走っていない。**

## 発火しない経路がある

同じ「postsの行が消える」でも、経路によって結果が違った。

| 行の消え方 | BEFORE DELETEトリガー |
| :--- | :--- |
| `DELETE FROM posts ...` | 発火する |
| 外部キーの `ON DELETE CASCADE` による削除 | **発火しない** |
| `TRUNCATE TABLE posts` | **発火しない** |
| `DROP TABLE posts` | 発火しない（トリガーも一緒に消える） |

`CASCADE` と `TRUNCATE` が厄介なのは、**行は確かに消えているのに、トリガーだけが走らない**という点。

> [!WARNING] 気づく手段がない
> `CASCADE` も `TRUNCATE` もエラーにはならず、普通に成功として返ってくる。
> トリガーが走らなかったことを実行結果から知る方法がないので、
> 後からログの件数が合わないときに初めて発覚することになる。

## 注意したい点

つまりトリガーが守れる範囲は、**アプリケーションが自分で `DELETE` 文を打つ経路だけ**ということになる。

逆に、以下のような要件はトリガーでは満たせない。

1. 外部キーの `CASCADE` で連鎖的に消える子テーブルの削除ログを取る
2. `TRUNCATE` を含む運用作業も漏らさず記録する
3. 「このテーブルから消えた行は必ずどこかに残る」を保証する

「必ず記録される」が要件に入っているなら、トリガーは選ばない方がよさそう。
`CASCADE` をやめてアプリ側で子テーブルの削除を明示的に書くか、
そもそも物理削除をやめて論理削除にしてしまう方が確実だと思う。

`CASCADE` で消える行も記録したい、というのが最初から分かっているなら、
**外部キーの `CASCADE` とトリガーは組み合わせない**と決めておくのが早い。

## おわりに

今回はMySQLだけで確認したが、この挙動はDBによって違うらしい。
PostgreSQLでは `CASCADE` で消える行でもトリガーが動く、という話を見かけたので、
他のDBから来た人ほど「動くはず」で踏みそうだなと思っている。そのうち手元で確かめたい😴

## 参考

- [MySQL 8.0 リファレンス: CREATE TRIGGER Statement](https://dev.mysql.com/doc/refman/8.0/ja/create-trigger.html)
- [MySQL 8.0 リファレンス: FOREIGN KEY 制約](https://dev.mysql.com/doc/refman/8.0/ja/create-table-foreign-keys.html)
- [MySQL Bugs #11472: Triggers not executed following foreign key updates/deletes](https://bugs.mysql.com/bug.php?id=11472)
