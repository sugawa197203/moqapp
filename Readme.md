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

- Relay URL は `https://RELAY.HOST:4433/moq-relay`、Namespace は `live/broadcast`

```
ffmpeg `
  -hide_banner `
  -stats `
  -f dshow `
  -rtbufsize 256M `
  -thread_queue_size 2048 `
  -pixel_format nv12 `
  -framerate 30 `
  -video_size 1920x1080 `
  -i 'video=HP Wide Vision 5MP Camera' `
  -f dshow `
  -rtbufsize 16M `
  -thread_queue_size 1024 `
  -i 'audio=マイク配列 (2- デジタルマイク向けインテル® スマート・サウンド・テクノロジー)' `
  -filter_complex "[0:v]split=4[v1080][v720src][v360src][v144src];[v720src]scale=1280:720:flags=bicubic,format=nv12[v720];[v360src]scale=640:360:flags=bicubic,format=nv12[v360];[v144src]scale=256:144:flags=bicubic,format=nv12[v144]" `
  -map "[v1080]" `
  -c:v:0 h264_qsv `
  -preset:v:0 medium `
  -async_depth:v:0 1 `
  -look_ahead:v:0 0 `
  -b:v:0 12000k `
  -minrate:v:0 12000k `
  -maxrate:v:0 12000k `
  -bufsize:v:0 12000k `
  -g:v:0 15 `
  -bf:v:0 0 `
  -map "[v720]" `
  -c:v:1 h264_qsv `
  -preset:v:1 medium `
  -async_depth:v:1 1 `
  -look_ahead:v:1 0 `
  -b:v:1 3500k `
  -minrate:v:1 3500k `
  -maxrate:v:1 3500k `
  -bufsize:v:1 3500k `
  -g:v:1 15 `
  -bf:v:1 0 `
  -map "[v360]" `
  -c:v:2 h264_qsv `
  -preset:v:2 faster `
  -async_depth:v:2 1 `
  -look_ahead:v:2 0 `
  -b:v:2 1000k `
  -minrate:v:2 1000k `
  -maxrate:v:2 1000k `
  -bufsize:v:2 1000k `
  -g:v:2 15 `
  -bf:v:2 0 `
  -map "[v144]" `
  -c:v:3 h264_qsv `
  -preset:v:3 faster `
  -async_depth:v:3 1 `
  -look_ahead:v:3 0 `
  -b:v:3 250k `
  -minrate:v:3 250k `
  -maxrate:v:3 250k `
  -bufsize:v:3 250k `
  -g:v:3 15 `
  -bf:v:3 0 `
  -map 1:a:0 `
  -c:a aac `
  -b:a 128k `
  -ar 48000 `
  -ac 2 `
  -af "aresample=async=1:first_pts=0" `
  -f dash `
  -seg_duration 2 `
  -use_template 1 `
  -use_timeline 0 `
  -init_seg_name 'video$RepresentationID$' `
  -media_seg_name 'video$RepresentationID$' `
  -adaptation_sets 'id=0,streams=v id=1,streams=a' `
  -multiple_requests 1 `
  -streaming 1 `
  -remove_at_exit 0 `
  -window_size 20 `
  -extra_window_size 20 `
  'http://172.22.170.159:8080/ingest/'
```