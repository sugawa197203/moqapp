# Media over Quic Client Web App

MoQ の Subscriber の Web アプリケーション

## 機能

- ブラウザで動作
- テキストボックスで指定した URL の Relay サーバーに接続
- ABR (Adaptive Bitrate) ストリーミングに対応
  - アルゴリズムを選択可能
  - CBRも選択可能

## 技術

- [moq-playa](https://github.com/openmoq/moq-playa) (`@openmoq/playa`)

## 開発

- miseで開発環境を構築

### セットアップ

```sh
mise install
mise run install
mise run dev
mise run build
```

### 構成

- `src/main.ts` — UI
