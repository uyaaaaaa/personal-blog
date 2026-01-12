---
title: " Arch Linux インストールの悪戦苦闘メモ"
description: ""
published: true
date: 2026-01-14
tags:
  - linux
  - beginner
layout: default
---

## Arch Linuxを使ってみようと思ったきっかけ

なんかかっこいいから。以上。

## 環境

PC: Lenovo ThinkPad X13 Gen 1
- CPU: AMD Ryzen 5 PRO(?)
- メモリ: 16GB
- ストレージ: 256GB SSD
- elementary OS（linux）をインストール済み
インストールメディア
- 事前にisoイメージを焼いたUSB
- 作り方は [arch linux - USB インストールメディア](https://wiki.archlinux.jp/index.php/USB_%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB%E3%83%A1%E3%83%87%E3%82%A3%E3%82%A2#GNU.2FLinux_.E3.81.A7) を参考にした（わからない人は 「arch linux iso 作り方」とかで検索してね）

※ PCの機種によってBIOS起動などの手順は異なります。今回はThinkPadが前提です。

※ Arch Linux初心者 & Linuxに精通しているわけでもない ため、詳細までは保証できません。あくまで自分用の**環境構築メモ**となります。

##  Arch Linuxの起動

**F12** を連打するとブートメニューが開けるので、事前に作成したインストールメディアを選択する。

※ ThinkPadの場合は **F1** を連打し、セキュアブートを無効化しておく必要がある。

正しく起動できるとarch linuxの画面が開くので、`Arch Linux install medium (X86_64, UEFI)`を選択する。
BIOS起動の場合は `Arch Linux install medium (X86_64, BIOS)`となっているはず。

適当に待っていると、`root@archiso ~ #`という文字列が表示される
→ ここからインストールを始めていく！！！

※ 補足: JIS配列を使いたい場合は以下を実行する。自分はUS配列のため実行しない。

```terminal
$ loadkeys jp106
```

## wifi設定

`ping`でインターネット接続を確認する。

```terminal
$ ping -c 3 archlinux.jp
```

`64 bytes from ...`みたいな感じで出力されていれば接続済み。

今回はwifiに接続したいので、`iwctl`を使う

```terminal
$ iwctl

[iwd]# device list  -- 'wlan0'のみ表示された

[iwd]# station wlan0 get-networks  -- 利用できるwifi一覧が表示された

[iwd]# station wlan0 connect xxxxxxxx(SSID)  -- passphraseを求められるので入力

[iwd]# quit
```

もう一度 `ping -c 3 archlinux.jp`を実行すると、無事接続できていた模様🎉

## システムクロック設定

以下を実行する。

```terminal
$ timedatectl set-ntp true
```

`timedatectl status`で正しい時刻になっているか確認できる。

## パーティションの割当

ここからが難関だった。
正直詳細を説明する自信はないが、↓のような手順でなんとか成功した...

まずは、`lsblk`を用いてPC本体のストレージを特定する。

```sh
$ lsblk -o NAME,TRAN,RM,SIZE,MOUNTPOINT

# 結果
NAME        TRAN    RM   SIZE  MOUNTPOINT
sda         usb      1  14.4G
├─sda1               1   1.2G
└─sda2               1   248M
nvme0n1     nvme     0 238.5G
├─nvme0n1p1 nvme     0   500M
├─nvme0n1p2 nvme     0   954M
└─nvme0n1p3 nvme     0 237.1G
```

`nvme0n1`がPC本体のストレージと判断した。不安。。。

すでにインストール済みの elementary OS はぶち消してしまって構わないので、この`nvme0n1`にパーティションを割り当てて行こうと決意した。

> [!FAIL] 警告
> 失敗した際の動きを保証できないので、ぶち消す際は自己責任でお願いします...!

### `fdisk`によるパーティショニング

`fdisk /dev/nvme0n1`を実行すると、対話型のコマンドが進んでいく

コマンドの実行手順を書くと、
1. `fdisk /dev/nvme0n1`を実行
2. `g`で新しいGPTテーブルを作成
3. `n`で1つ目のパーティションを作成
    - `Partition number: 1`
    - `First sector: 2048`
    - `Last sector: +500M`
4. `3`で作成したパーティションに対し、`t`でタイプを`EFI System`に設定
5. `n`で2つ目のパーティションを作成
    - `Partition number: 2`
    - `First sector: [デフォルト値]`
    - `Last sector: +1G`
6. `5`で作成したパーティションに対し、`t`でタイプを`Linux swap`に設定
7. `n`で3つ目のパーティションを作成
    - `Partition number: 3`
    - `First sector: [デフォルト値]`
    - `Last sector: [デフォルト値]`  -> 残りすべてを割り当てる
8. `7`で作成したパーティションに対し、`t`でタイプを`Linux root(x86-64)`に設定
9.  `w`で保存して`exit`
10. 念のため、`lsblk -f`で確認する

### パーティションのフォーマット

```sh
$ mkfs.fat -F 32 /dev/nvme0n1p1
$ mkswap /dev/nvme0n1p2
$ mkfs.ext4 /dev/nvme0n1p3
```

### パーティションのマウント

```sh
$ mount /dev/nvme0n1p3 /mnt
$ mount --mkdir /dev/nvme0n1p1 /mnt/boot
$ swapon /dev/nvme0n1p2
```

### 最終的なパーティション割当

| パーティション          | パーティションタイプ         | first sector | last sector | マウントポイント  |
| :--------------- | ------------------ | :----------- | :---------- | :-------- |
| `/dev/nvme0n1p1` | EFI System         | default      | +1GB        | /mnt/boot |
| `/dev/nvme0n1p2` | Linux swap         | default      | +16GB       | swap      |
| `/dev/nvme0n1p3` | Linux root(x86-64) | default      | default     | /mnt      |

## OSのインストール

`/etc/pacman.d/mirrorlist`を`vim`で編集し、先頭に以下を追加する。

```txt
Server = http://ftp.tsukuba.wide.ad.jp/Linux/archlinux/$repo/os/$arch
```

次に、必要なパッケージを`pacstrap`でインストールする。

```sh
$ pacstrap /mnt base base-devel linux linux-firmware
```

これで基本パッケージのインストールが完了した。

## システム設定

  fstabを生成する。
  これは、パーティション情報等が書き込まれているファイルで、起動時にどのパーティションをマウントするかなどを指定しているらしい。詳しくはわからない。

```sh
$ genfstab -U /mnt >> /mnt/etc/fstab
```

続けて、インストールしたシステムに`chroot`で入る。

```sh
$ arch-chroot /mnt
```

`chroot`環境に入ったらタイムゾーンを設定する。

```sh
$ ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime
$ hwclock --systohc
```

## ロケール設定

いくつかの設定ファイルを編集したいので、まずは`vim`をインストールする。

```sh
$ pacman -Syyu
$ pacman -S vim
```

`/etc/locale.gen`を開き、`en_US.UTF-8`と`ja_JP.UTF-8`の行のコメントアウトを外す。
最上部に以下を追記してもよい。

```txt
ja_JP.UTF-8 UTF-8
en_US.UTF-8 UTF-8
```

完了後、`locale-gen`を実行して`/etc/locale.gen`の内容をコンパイルする。

次に、`/etc/locale.conf`にLANG環境変数を設定する。

```sh
$ echo "LANG=en_US.UTF-8" > /etc/locale.conf
```

JIS配列を使っている場合は、`/etc/vconsole.conf` にキーマップを設定する。

```sh
$ echo "KEYMAP=jp106" > /etc/vconsole.conf
```

## ホスト名の設定

`/etc/hostname`にホスト名を追記する。

```sh
$ echo "myhostname" > /etc/hostname
```

上記で設定したホスト名を`/etc/hosts`にも設定する。

```/etc/hosts
127.0.0.1    localhost
::1    localhost
127.0.1.1    myhostname.localdomain    myhostname
```

正しく設定されているか確認。

```sh
$ getent hosts

127.0.0.1 localhost
::1       localhost
127.0.1.1 myhostname
```

## ネットワーク設定

今回は無線LANを利用しているため、Network Managerなるものが良いらしい。

```sh
$ pacman -S networkmanager

# 次回起動時にNetwork Managerが自動で有効化されるように設定
$ systemctl enable NetworkManager
```

## rootパスワードの設定

```sh
$ passwd
```

## ブートローダー

`systemd-boot`を使う。

先に、マイクロコードのアップデートに対応するためのライブラリ（らしい）`amd-ucode`をインストールする。

```sh
$ pacman -S amd-ucode  -- intelのCPUの場合は intel-ucode
```

EFIシステムパーティションに `systemd-boot` をインストールし、自動更新を設定。

```sh
$ bootctl --path=/boot install

$ systemctl enable systemd-boot-update
```

次は`/boot/loader/loader.conf` を開いて、ローダーの設定をする。
自分は以下のように設定した。

```/boot/loader/loader.conf
default arch.conf
timeout 5
console-mode max
editor no
```

完了したら、`/boot/loader/entries/arch.conf` を作成し以下を追加。

```/boot/loader/entries/arch.conf
title Arch Linux
linux /vmlinuz-linux
initrd /amd-ucode.img
initrd /initramfs-linux.img
```

`option`値を取得するため、ルートパーティションのUUIDを取得して `/boot/loader/entries/arch.conf`に書き込む。

```sh
$ echo $(blkid -s UUID -o value /dev/nvme0n1p3) >> /boot/loader/entries/arch.conf
```

末尾にUUIDのみが追加されているはずなので、以下のように整形する。

```/boot/loader/entries/arch.conf
title   Arch Linux
linux   /vmlinuz-linux
initrd  /amd-ucode.img
initrd  /initramfs-linux.img
options root=UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx rw
```

## 準備は整った！！あとは再起動！！

の前に、`chroot`環境から抜けて`/mnt`にマウントしたパーティションをアンマウントする。

```sh
$ exit
$ umount -R /mnt
```

**願いを込めて**再起動。

```sh
$ reboot
```

問題なくインストールできていれば、USBを抜いてもArch Linuxが起動する。
ログインが求められるので、先ほど設定したパスワードを使って`root`ユーザーでログインする。

無事起動できたなら、以下も合わせて対応してしまった方がよい。

## 無線LANの設定

`nmcli` を使う。
まず、以下でSSIDのリストを確認する。

```sh
$ nmcli device wifi
```

接続したいSSIDを選択し、パスワードを入力する。
`--ask`はパスワードを対話式で入力するためのオプション。

```sh
$ nmcli device wifi connect [SSID] --ask
```

## ユーザーの追加

`root`ユーザーは手放したいので、新しいユーザーを作成する。

```sh
$ useradd -m -G wheel -s /bin/bash [username]
```

各オプションの意味はこんな感じ

- `-m` : ホームディレクトリを作成する
- `-G wheel` : wheelグループ ( `su` が使えるユーザーのグループ) に追加する
- `-s /bin/bash` : ログインシェルをbashに設定する

パスワードも設定。

```sh
$ passwd [username]
```

次に、`sudo`をインストールする

```sh
$ pacman -S sudo
```

`wheel` グループに対して `sudo` の権限を与える。
これをしないと、追加したユーザーが`sudo`を使えない。

```sh
$ vim /etc/sudoers

## uncomment to allow members of group wheel to execute any command
%wheel ALL=(ALL:ALL) ALL
```

`exit`で`root`ユーザーからログアウトし、作成したユーザーでログイン
→ `sudo ls`などが問題なく実行できればOK

## おわりに

5回くらいやり直しました。Arch Linuxむずい。

---
### 参考にした記事

- [私的Arch Linuxインストール講座](https://zenn.dev/ytjvdcm/articles/0efb9112468de3)
- [2025年のArch Linux インストールメモ (インストール〜SSHまで)](https://zenn.dev/ama_nenee/articles/6d7d145044b035)
- [Linux初心者がGWにArchLinuxをインストールしてみた話](https://qiita.com/ryota37/items/c6fc400567c76698b271)

