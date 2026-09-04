# Bot Telegram: Manajemen Tugas & Keuangan

Lihat `CLAUDE.md` untuk rancangan arsitektur lengkap. Dokumen ini berisi langkah setup praktis.

## 1. Install dependencies

```bash
npm install
```

Salin `.env.example` menjadi `.env` dan isi semua variabel (langkah 2-4 di bawah menjelaskan cara mendapatkannya).

## 2. Setup Supabase

1. Buat project baru di https://supabase.com (gratis, tanpa kartu).
2. Buka **SQL Editor**, jalankan isi file `src/db/schema.sql` untuk membuat tabel `users`, `tasks`, `transactions`.
3. Buka **Project Settings → API**, salin:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (bukan `anon` key, karena bot butuh akses penuh dari server) → `SUPABASE_SERVICE_KEY`

## 3. Setup Telegram Bot

1. Chat `@BotFather` di Telegram, jalankan `/newbot`, ikuti instruksinya.
2. Salin token yang diberikan → `TELEGRAM_BOT_TOKEN`.

## 4. Setup Gemini API

1. Buka https://aistudio.google.com/apikey, generate API key dari akun Google AI Pro.
2. Salin key → `GEMINI_API_KEY`.
3. Cek daftar model yang tersedia di akunmu; default di `.env.example` adalah `gemini-2.5-flash-lite` (dipakai untuk parsing teks maupun vision struk). Ganti `GEMINI_TEXT_MODEL` / `GEMINI_VISION_MODEL` kalau nama modelnya berbeda.

## 5. Jalankan lokal (development / test cepat)

```bash
npm start
```

Bot akan polling Telegram secara langsung. Untuk test endpoint cron secara lokal:

```bash
curl -X POST http://localhost:3000/check-deadlines -H "Authorization: Bearer <isi CRON_SECRET kamu>"
```

## 6. Mode hosting permanen di lokal (PM2) — status saat ini

Project ini saat ini dijalankan **permanen di komputer/server lokal**, bukan Render, jadi tidak ada endpoint publik yang dipanggil GitHub Actions. Sebagai gantinya dipakai **scheduler internal** (`node-cron`, di `src/scheduler/localCron.js`) yang jalan di dalam proses bot itu sendiri, tiap jam — ini juga otomatis menjaga Supabase tidak auto-pause karena proses selalu hidup dan rutin query database.

1. Set `USE_INTERNAL_CRON=true` di `.env` (sudah default di `.env.example`).
2. Pastikan PM2 sudah terinstall global: `npm install -g pm2`.
3. Jalankan bot lewat PM2 (pakai `ecosystem.config.js` yang sudah disiapkan):

   ```bash
   pm2 start ecosystem.config.js
   pm2 logs managinguang-dan-tugas-telegrambot   # lihat log
   pm2 status                                     # cek status proses
   pm2 restart managinguang-dan-tugas-telegrambot # restart manual kalau perlu
   ```

4. PM2 otomatis restart proses kalau crash (`autorestart: true` di `ecosystem.config.js`). Untuk bot ikut nyala otomatis saat komputer restart/reboot:
   - **Windows**: PM2 tidak native support `pm2 startup` di Windows. Solusi termudah: pakai Task Scheduler Windows untuk menjalankan `pm2 resurrect` (setelah sebelumnya `pm2 save`) saat logon, atau install paket `pm2-installer` (community) kalau butuh service Windows yang lebih rapi.
   - **Linux/macOS**: jalankan `pm2 startup` (ikuti instruksi command yang muncul), lalu `pm2 save` supaya daftar proses PM2 ter-restore otomatis saat boot.

5. Endpoint `/check-deadlines` tetap ada dan bisa dipakai untuk trigger manual/testing, tapi bukan lagi jalur utama pengecekan deadline selama `USE_INTERNAL_CRON=true`.

## 7. (Opsional, kalau nanti pindah ke hosting Render)

Kalau di kemudian hari kamu ingin pindah dari lokal ke Render (misal karena butuh uptime tanpa bergantung komputer sendiri menyala 24/7), langkah-langkahnya:

1. Set `USE_INTERNAL_CRON=false` (atau hapus variabelnya) di environment Render — supaya scheduler internal tidak jalan dobel dengan GitHub Actions.
2. Buat **Web Service** baru di https://render.com, connect ke repo GitHub ini. Build command: `npm install`. Start command: `npm start`. Set semua environment variable dari `.env` di dashboard Render.
3. Catat URL Render kamu (misal `https://nama-app.onrender.com`).
4. Di repo GitHub, buka **Settings → Secrets and variables → Actions**, tambahkan:
   - `RENDER_URL` = URL Render kamu (tanpa trailing slash)
   - `CRON_SECRET` = nilai yang sama persis dengan `CRON_SECRET` di environment variable Render
5. Workflow `.github/workflows/cron-check.yml` akan otomatis jalan tiap jam, memanggil `/check-deadlines` dengan header `Authorization: Bearer <CRON_SECRET>` — ini sekaligus membangunkan Render dari sleep dan mencegah Supabase auto-pause. Bisa juga trigger manual lewat tab **Actions → Cron Check Deadlines → Run workflow**.

## Format input yang perlu diketahui user

- **Deadline tugas**: `DD-MM-YYYY HH:mm`, contoh `25-12-2026 14:30`.
- **Laporan**: `/laporan minggu`, `/laporan bulan`, atau `/laporan tahun`.
- **Pengeluaran**: ketik bebas (contoh `"abis jajan bakso 15rb"`) atau kirim foto struk langsung ke bot.

## Struktur project

```
src/
  config/env.js            # load & validasi environment variable
  db/
    supabase.js             # Supabase client
    schema.sql               # DDL tabel users/tasks/transactions
  services/                 # akses data (users, tasks, transactions)
  ai/                        # integrasi Gemini (parsing teks & vision struk)
  telegram/
    bot.js                   # semua command & handler Telegraf
    keyboards.js              # inline keyboard builders
  scheduler/
    checkDeadlines.js         # logika cek & kirim notifikasi deadline
    localCron.js               # scheduler internal (node-cron) untuk mode hosting lokal
  routes/checkDeadlines.js   # endpoint Express /check-deadlines
  utils/                     # date parsing/formatting, in-memory session
  index.js                   # entry point: start Express + bot polling + (opsional) local cron
ecosystem.config.js         # konfigurasi PM2 untuk mode hosting lokal
.github/workflows/cron-check.yml  # GitHub Actions cron per jam (dipakai kalau hosting di Render)
```

## Catatan keamanan

- Endpoint `/check-deadlines` dilindungi header `Authorization: Bearer <CRON_SECRET>`. Jangan skip variabel `CRON_SECRET`, terutama kalau endpoint ini nanti terekspos publik (misal saat pindah ke Render).
- `SUPABASE_SERVICE_KEY` punya akses penuh ke database — jangan pernah commit ke git atau expose ke client-side.
- Gambar struk tidak pernah ditulis ke disk atau storage permanen; hanya diproses in-memory lalu dibuang setelah dikirim ke Gemini.
