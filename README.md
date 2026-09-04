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

## 5. Jalankan lokal

```bash
npm start
```

Bot akan polling Telegram secara langsung. Untuk test endpoint cron secara lokal:

```bash
curl -X POST http://localhost:3000/check-deadlines -H "X-Cron-Secret: <isi CRON_SECRET kamu>"
```

## 6. Deploy ke Render

1. Push project ini ke repo GitHub (lihat langkah 7).
2. Buat **Web Service** baru di https://render.com, connect ke repo GitHub tersebut.
3. Build command: `npm install`. Start command: `npm start`.
4. Set semua environment variable dari `.env` di dashboard Render (jangan commit `.env` ke git).
5. Setelah deploy sukses, catat URL Render kamu (misal `https://nama-app.onrender.com`) — dipakai di langkah 7.

## 7. Setup GitHub Actions (cron per jam)

1. Push project ke repo GitHub.
2. Di repo, buka **Settings → Secrets and variables → Actions**, tambahkan:
   - `RENDER_URL` = URL Render kamu (tanpa trailing slash), misal `https://nama-app.onrender.com`
   - `CRON_SECRET` = nilai yang sama persis dengan `CRON_SECRET` di environment variable Render
3. Workflow `.github/workflows/cron.yml` akan otomatis jalan tiap jam, memanggil `/check-deadlines` — ini sekaligus membangunkan Render dari sleep dan mencegah Supabase auto-pause.
4. Bisa juga trigger manual lewat tab **Actions → Hourly deadline check → Run workflow**.

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
  scheduler/checkDeadlines.js # logika cek & kirim notifikasi deadline
  routes/checkDeadlines.js   # endpoint Express /check-deadlines
  utils/                     # date parsing/formatting, in-memory session
  index.js                   # entry point: start Express + bot polling
.github/workflows/cron.yml  # GitHub Actions cron per jam
```

## Catatan keamanan

- Endpoint `/check-deadlines` publik (URL Render bisa ditebak), makanya dilindungi header `X-Cron-Secret`. Jangan skip variabel `CRON_SECRET` saat deploy.
- `SUPABASE_SERVICE_KEY` punya akses penuh ke database — jangan pernah commit ke git atau expose ke client-side.
- Gambar struk tidak pernah ditulis ke disk atau storage permanen; hanya diproses in-memory lalu dibuang setelah dikirim ke Gemini.
