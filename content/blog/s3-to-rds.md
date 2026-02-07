---
title: "AmazonS3のファイルをRDSにロードして使う"
description: ""
published: true
date: 2026-01-25
tags:
  - AWS
  - S3
  - RDS
layout: default
---
## はじめに

みなさん、大量データの一括取り込みをした経験はありますか？私は最近初めて経験しました。

「大量」といっても150万件程度（実際には中規模...？）ですが、これまで本番環境にデータを取り込む経験はなかったので、いい経験になったなと思います。
本記事では、その覚書として調査〜実行までの流れを整理しました。

## 背景と前提条件

- 本番稼働中のECサイトで、決済代行会社移行に伴うクレジットカードのデータ移行。
    - アクティブユーザー30万人程度。過去会員も含めると100万人を超える。
    - 移行対象のクレジットカード情報は150万レコード程度
    - ECサイトの完全停止はせず、ユーザー操作への制限は**カード情報の変更**のみ
    - データ取り込み予定は22~24時ごろ。後続作業が必要なため、完了時間のリミットあり。
- DB: `Amazon Aurora`（MySQL互換）
    - 取り込み先のテーブルは今回の案件で**新規作成**するもので、移行完了まではアクセスなし。
- 移行するデータはCSV形式で提供される。

## まずは調査

実現にあたり、以下の3つの手法を検討しました。

1. 【不採用】ローカルPCのDBクライアントツール（SequelAce等）からの直接アップロード

    - 踏み台サーバ経由で本番DBに接続しているため、ネットワーク依存の多さとロールバックリスクが懸念点でした
    - また、1万件程度でのローカル検証ですら結構時間がかかりました。おそらくですが、SequelAceでのCSVアップロードでは1件ずつ`INSERT`しているため非効率なようで、150万件を任せるにはさすがに不安でした。

1. 【不採用】`AWS Database Migration Service(DMS)`を使った移行

    - 使ったことのないサービスであり、社内にを持つエンジニアがいなかったため、**時間的制約** + **リスク**を考慮して断念しました。もっと時間があれば、しっかり検証した上で採用してよかったかもしれません。

1. 【⭐️**採用**】CSVファイルを`S3`に格納し、SQLで`Aurora`に取り込む

    - あまり知らなかった手法ですが、非常に高速かつ環境整備＆検証が容易にできそうでした。
    - Geminiに聞いてみても「**最もプロフェッショナルで、かつ本番環境への影響を最小限に抑えられます**」とのことで、しっかり検証すれば問題ないだろうと考えました。

1. 【不採用】アプリケーションでロジックを実装

    - 1回きりの単純なデータ移行のためにアプリケーション実装をするのは若干コスパが悪いなと感じ、不採用にしました。
    - 複雑なデータ加工が必要なケースでは適切かもしれません。

結果、`3番`の`S3`から直接ロードする手法を採用することに決めました。

## 実行クエリの作成

S3からAuroraにデータをロードするには、`LOAD DATA FROM S3`というクエリを使用します。

```sql
LOAD DATA FROM S3 FILE 's3://[bucket-name]/[path]/[file_name].csv'
INTO TABLE [target_rds_table_name]
FIELDS TERMINATED BY ','  -- CSVファイルの場合、カンマ区切り
ENCLOSED BY '"'           -- ダブルクォーテーションで囲まれている場合に削除する
LINES TERMINATED BY '\n'  -- 行の終端は改行
IGNORE 1 LINES            -- ヘッダー行をスキップする
(col1, col2, col3, ...);  -- テーブルのカラム名とCSVの列の順序が一致している場合(CSVにないカラムは指定しない)
```

※ 参考: <[https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.LoadFromS3.html](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.LoadFromS3.html#AuroraMySQL.Integrating.LoadFromS3.Text)>

## S3へのファイル配置

`LOAD DATA FROM S3 FILE ~~~`で指定した`S3`のパスに対し、取り込み対象のCSVファイルを配置します。

## 権限設定

今回の手法だと`Aurora → S3`へのアクセスが発生するため、それを許可するロールの設定が必要なようです。

私は（組織体制の都合上）インフラエンジニアの方に実施いただいたのですが、ざっくりと内容を記載します。

1. IAMロールの作成

    - S3バケットへの読み取り権限（`s3:GetObject`）を持つIAMロールを作成
    - RDSインスタンスが引き受けられるように、ポリシーで `rds.amazonaws.com` サービスを許可する
    
2. RDSインスタンスへのIAMロールのアタッチ

    - RDSコンソールまたはAWS CLIにて、作成したIAMロールを対象のRDSインスタンスにアタッチする
    - 「IAM ロールを DB インスタンスにアタッチする」または「S3 からデータをロードする権限を付与する」といった設定で行う

※ 詳細はこちら: [AmazonS3へのアクセスをAuroraに許可する](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.LoadFromS3.html#AuroraMySQL.Integrating.LoadFromS3.Authorize)

## 検証(LOAD DATE FROM S3)

本番環境とほぼ同等のSTG環境にて、レコード数ごとに検証を行いました。下記がその結果です。

   - 1万件: 約0.3秒
   - 10万件: 約1.8秒
   - 50万件: 約8秒
   - 150万件: 約20秒

20秒程度であれば本番環境でも許容範囲なので

## 実行

実際に150万件をアップロードするのにかかったのは約18秒でした！

STGよりも本番の方がAuroraのスペックが良い分、早く終わったのかと思われます。

### 参考

- [Amazon S3 バケットのテキストファイルから Amazon Aurora MySQL DB クラスターへのデータのロード](https://docs.aws.amazon.com/ja_jp/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.LoadFromS3.html)

