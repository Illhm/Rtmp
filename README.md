# Simple RTMP Server

Server RTMP yang sederhana, stabil, dan siap dipakai menggunakan Node.js dan `node-media-server`.
Server ini mendukung penerimaan *live stream* via OBS atau FFmpeg, dilengkapi dengan HTTP endpoint untuk melihat status stream yang sedang aktif, serta file Docker untuk kemudahan *deployment*.

## Arsitektur Singkat
Aplikasi ini menggunakan Node.js karena *ecosystem*-nya stabil untuk pengolahan *streaming* ringan.
- **`node-media-server`**: Menangani koneksi RTMP (port 1935) masuk (*publish*) dan keluar (*play*), serta *logging* event seperti koneksi dan pemutusan stream.
- **`express`**: Menyediakan HTTP API sederhana (port 3000) untuk mengecek status dan *uptime* dari RTMP Server dan *stream* yang sedang aktif.

## Struktur Direktori
```
.
├── src/
│   └── server.js        # File utama server (RTMP + HTTP API)
├── Dockerfile           # Konfigurasi image Docker
├── docker-compose.yml   # File Compose untuk menjalankan server sebagai layanan
├── package.json         # Dependensi Node.js
└── README.md            # Dokumentasi ini
```

## Cara Menjalankan

### Menggunakan Docker & Docker Compose (Rekomendasi)
Pilihan yang sangat direkomendasikan untuk menghindari konflik lingkungan dan dependensi:

1. Build dan jalankan container di *background*:
   ```bash
   docker-compose up -d --build
   ```
2. Untuk melihat log stream:
   ```bash
   docker-compose logs -f
   ```
3. Menghentikan container:
   ```bash
   docker-compose down
   ```

### Menjalankan Secara Manual (Node.js Terinstal)
1. Install dependensi:
   ```bash
   npm install
   ```
2. Jalankan server:
   ```bash
   node src/server.js
   ```

## Info Koneksi RTMP
Untuk melakukan push/publish stream, gunakan *URL format* berikut:

- **RTMP Server URL:** `rtmp://localhost:1935/live`
- **Stream Key:** `test_stream` (atau apapun yang kamu mau)
- **Full URL:** `rtmp://localhost:1935/live/test_stream`

*(Catatan: Ganti `localhost` dengan IP server / Domain jika di-*deploy* secara publik).*

## Mengecek Status Server
Server ini juga menyediakan API sederhana untuk mengecek *stream* yang sedang aktif. API berjalan pada port `3000`.

- **Endpoint**: `GET http://localhost:3000/status`

**Contoh Response:**
```json
{
  "status": "online",
  "uptime": 120,
  "activeStreamCount": 1,
  "hasActiveStreams": true,
  "streams": [
    {
      "app": "live",
      "key": "test_stream",
      "path": "/live/test_stream",
      "uptimeSeconds": 15
    }
  ]
}
```

## Push Stream Menggunakan OBS
1. Buka **Settings** -> **Stream**.
2. **Service**: Pilih **Custom...**.
3. **Server**: Masukkan `rtmp://localhost:1935/live`
4. **Stream Key**: Masukkan `test_stream` (contoh).
5. Klik **OK** dan tekan **Start Streaming**.

## Push Stream Menggunakan FFmpeg (Untuk Testing)
Kamu bisa menggunakan FFmpeg untuk mem-*push* video simulasi ke server secara lokal:

```bash
# Push video looping untuk test
ffmpeg -re -i test_video.mp4 -c:v libx264 -preset veryfast -b:v 3000k -maxrate 3000k -bufsize 6000k -pix_fmt yuv420p -g 50 -c:a aac -b:a 160k -ar 44100 -f flv "rtmp://localhost:1935/live/test_stream"
```

*Jika kamu tidak memiliki file video:*
```bash
# Mengirim test pattern bawaan ffmpeg
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine=frequency=1000:sample_rate=44100 -c:v libx264 -preset veryfast -c:a aac -f flv "rtmp://localhost:1935/live/test_stream"
```
