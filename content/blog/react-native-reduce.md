---
title: "ReactNativeでのiOS実機確認(Expo Go)で、アプリが動かない事象とその解決法"
description: "アプリ開発に挑戦した時の備忘録です。"
published: true
date: 2026-01-25
tags:
  - ReactNative
  - ExpoGo
  - ios
layout: default
---

## 事象

[Expoのチュートリアル](https://docs.expo.dev/tutorial/introduction/)（React Native）でExpo Goを使ったiOS実機確認をすると、文字や色の変更は反映されるがタップ・スクロール・入力などが全くできない

## 当時の状況

1. `npx create-expo-app@latest`でプロジェクト作成
2. `npx expo start`でローカルサーバー起動
3. 表示されたQRコードをiPhoneのカメラで読み取り
4. Expo Goアプリが起動し、作成したアプリが起動。ここで、**タップやスクロールが全く反応しなかった**...
※ なおxcodeのシミュレータでは再現せず、普通に動く...

## 原因と解決方法

- それっぽい[Githubのissues](https://github.com/expo/expo/issues/37265)をみつけた
- 当初は`Reduce Motion`がよくわからずスルーしていたが、iPhone設定の「視差効果を減らす」だと判明
- ios（実機）の設定から「視差効果を減らす」をOFFにすると一瞬で治った...
    設定 > アクセシビリティ > 動作 > 視差効果を減らす（`Reduce Motion`）をOFFにする

## さいごに
慣れない開発はムズカシイ😓
