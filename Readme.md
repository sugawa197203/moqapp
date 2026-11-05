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

## テスト配信 (Publisher)

- Relay は [moqx](https://github.com/openmoq/moqx)、Publisher は [moqxr](https://github.com/openmoq/moqxr) を想定
- サイマルキャストは、ffmpeg で 1080p を 1080p / 720p / 360p / 144p
- ffmpeg -> publisher は HTTP

```sh
./build/openmoq-publisher \
  --live-source dash \
  --dash-listen 0.0.0.0:8080 \
  --dash-path /ingest \
  --endpoint https://127.0.0.1:4433/moq \
  --transport webtransport \
  --namespace live/broadcast \
  --draft 18 \
  --publish-catalog \
  --forward 1 \
  --insecure
```

### Web カメラ

```sh
ffmpeg -f v4l2 -framerate 25 -video_size 1920x1080 -i /dev/video0 \
  -f alsa -i default \
  -filter_complex "[0:v]split=4[v1][v2][v3][v4];[v1]scale=1920:1080[v1080];[v2]scale=1280:720[v720];[v3]scale=640:360[v360];[v4]scale=256:144[v144]" \
  -map "[v1080]" -c:v:0 libx264 -preset veryfast -tune zerolatency -b:v:0 5000k -g 50 -keyint_min 50 -sc_threshold 0 \
  -map "[v720]" -c:v:1 libx264 -preset veryfast -tune zerolatency -b:v:1 2500k -g 50 -keyint_min 50 -sc_threshold 0 \
  -map "[v360]" -c:v:2 libx264 -preset veryfast -tune zerolatency -b:v:2 800k -g 50 -keyint_min 50 -sc_threshold 0 \
  -map "[v144]" -c:v:3 libx264 -preset veryfast -tune zerolatency -b:v:3 200k -g 50 -keyint_min 50 -sc_threshold 0 \
  -map 1:a -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -f dash -seg_duration 2 -use_template 1 -use_timeline 0 \
  -init_seg_name 'video$RepresentationID$' \
  -media_seg_name 'video$RepresentationID$' \
  -adaptation_sets "id=0,streams=v id=1,streams=a" \
  -multiple_requests 1 -streaming 1 -remove_at_exit 0 \
  -window_size 20 -extra_window_size 20 \
  http://127.0.0.1:8080/ingest/
```

### 動画ファイル

```sh
ffmpeg -re -stream_loop -1 -i input.mp4 \
  -filter_complex "[0:v]fps=25,split=4[v1][v2][v3][v4];[v1]scale=1920:1080[v1080];[v2]scale=1280:720[v720];[v3]scale=640:360[v360];[v4]scale=256:144[v144]" \
  -map "[v1080]" -c:v:0 libx264 -preset veryfast -b:v:0 5000k -g 50 -keyint_min 50 -sc_threshold 0 \
  -map "[v720]" -c:v:1 libx264 -preset veryfast -b:v:1 2500k -g 50 -keyint_min 50 -sc_threshold 0 \
  -map "[v360]" -c:v:2 libx264 -preset veryfast -b:v:2 800k -g 50 -keyint_min 50 -sc_threshold 0 \
  -map "[v144]" -c:v:3 libx264 -preset veryfast -b:v:3 200k -g 50 -keyint_min 50 -sc_threshold 0 \
  -map 0:a:0 -c:a aac -b:a 128k -ar 48000 -ac 2 \
  -f dash -seg_duration 2 -use_template 1 -use_timeline 0 \
  -init_seg_name 'video$RepresentationID$' \
  -media_seg_name 'video$RepresentationID$' \
  -adaptation_sets "id=0,streams=v id=1,streams=a" \
  -multiple_requests 1 -streaming 1 -remove_at_exit 0 \
  -window_size 20 -extra_window_size 20 \
  http://127.0.0.1:8080/ingest/
```

## draft18 でテスト配信

### Relay

```sh
docker build -f Dockerfile.moqx -t moqapp-moqx .
docker run -d --name moqx -p 4433:4433/udp moqapp-moqx
```

### Publisher のホスト

- `--endpoint`: Relay の URL

```sh
docker build -f Dockerfile.moqxr -t moqapp-moqxr .
docker run -d --name moqxr --restart unless-stopped -p 8080:8080 moqapp-moqxr \
  --endpoint https://RELAY.HOST:4433/moq-relay \
  --namespace live/broadcast
```

Publisher起動後、ffmpeg で動画を Publisher に送信する (送信先は `http://127.0.0.1:8080/ingest/`)。

### Subscriber のブラウザ

- Relay URL は `https://RELAY.HOST:4433/moq-relay`、Namespace は `live/broadcast`。
