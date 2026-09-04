# Chatbot Telegram: Manajemen Tugas & Keuangan

Dokumen ini adalah rancangan arsitektur dan konteks project untuk dipakai sebagai acuan development (termasuk oleh Claude Code).

## Ringkasan Project

Chatbot Telegram dengan dua fitur utama:
1. **Manajemen tugas** — input tugas + deadline, notifikasi otomatis per jam
2. **Tracking keuangan** — parsing teks bebas atau screenshot struk jadi data pengeluaran terstruktur, dengan laporan mingguan/bulanan/tahunan

## Tech Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Platform bot | Telegram (long polling, bukan webhook) | Gratis, tidak butuh domain/SSL, cocok untuk hosting yang bisa sleep |
| Backend | Node.js + Express | Konsisten dengan stack project lain |
| Database | Supabase (PostgreSQL) | Gratis tanpa kartu, 500 MB storage — jauh cukup karena gambar tidak disimpan |
| AI (parsing teks + vision struk) | Gemini API (`gemini-2.5-flash-lite` untuk parsing ringan, model vision untuk struk) | Sudah punya langganan Google AI Pro, rate limit lebih tinggi |
| Hosting bot | Render (web service, free tier) | Gratis, tanpa kartu, tidak ada expiry waktu untuk web service |
| Scheduler | GitHub Actions (`schedule` cron, tiap jam) | Gratis, mengatasi keterbatasan Render yang sleep setelah 15 menit idle dan `node-cron` internal tidak reliable di platform yang bisa sleep |
| Process manager (kalau perlu) | PM2 | Auto-restart kalau app crash |

## Kenapa Bukan Platform Lain

- **Railway**: trial 30 hari / $5 kredit, setelah itu wajib kartu untuk plan apapun (termasuk plan "Free" $1/bulan) — tidak sesuai preferensi tanpa kartu.
- **Vercel**: serverless, cron Hobby tier minimum 1x/hari (bukan per jam), tidak ada proses persisten untuk `node-cron` — tidak cocok untuk notifikasi per jam.
- **Oracle Cloud Always Free**: opsi solid (VM asli, always-on, gratis selamanya) tapi tetap butuh kartu untuk verifikasi identitas saat daftar — tidak dipilih karena user tidak mau memberi info kartu sama sekali.

## Batasan Free Tier yang Perlu Diantisipasi

| Platform | Batasan | Mitigasi |
|---|---|---|
| Render | Web service sleep setelah 15 menit idle, cold start 30-60 detik | GitHub Actions cron hit endpoint tiap jam untuk "membangunkan" sekaligus jalankan pengecekan deadline |
| Supabase | Database auto-pause setelah 7 hari tanpa request | Job cron yang sama sekaligus melakukan query ringan ke Supabase agar tidak pernah idle 7 hari |
| Supabase | 500 MB database storage | Gambar struk tidak pernah disimpan ke database/storage — hanya hasil parsing terstruktur yang disimpan |

## Alur Fitur: Manajemen Tugas

1. User input judul tugas dan deadline (lewat command atau dipandu `ForceReply` step-by-step).
2. Bot validasi format tanggal (tidak boleh di masa lalu, format harus benar). Kalau gagal, minta user ulangi.
3. Simpan ke tabel `tasks` di Supabase.
4. Bot balas konfirmasi singkat berisi judul dan deadline (tanpa menampilkan ID database mentah ke user).
5. **GitHub Actions cron** (tiap jam) memanggil endpoint `/check-deadlines` di backend:
   - Query tugas berstatus `pending` yang deadline-nya mendekat.
   - Cek threshold notifikasi mana yang baru terlewati (H-24 jam, H-3 jam, H-1 jam) memakai flag `notified_24h`, `notified_3h`, `notified_1h` supaya tidak kirim notifikasi berulang di jam yang sama.
   - Kirim notifikasi ke `telegram_chat_id` user terkait, sertakan tombol inline `[Tandai Selesai]`.
   - Update flag notifikasi yang sudah terkirim.
6. User bisa lihat daftar tugas (`/tugas`) — ditampilkan dengan nomor urut tampilan (bukan ID database), masing-masing dengan tombol inline `[Selesai]` `[Hapus]`.
7. Tap tombol `[Selesai]`/`[Hapus]` mengirim `callback_data` berisi ID asli di belakang layar — user tidak pernah perlu tahu atau mengetik ID database secara manual.

## Alur Fitur: Tracking Keuangan

### Input teks manual
1. User ketik kalimat bebas, misal `"abis jajan bakso 15rb"`.
2. Backend kirim teks ke Gemini API, minta output JSON terstruktur: `{ nominal, kategori, deskripsi, tanggal }`.
3. Bot tampilkan hasil parsing + tombol inline `[Ya]` `[Edit]` `[Batal]`.

### Input screenshot struk
1. User kirim gambar struk ke bot.
2. Backend download gambar dari Telegram **ke memory saja** (tidak ditulis ke disk/storage permanen).
3. Gambar dikirim langsung ke **Gemini Vision** (satu API call, tanpa OCR terpisah) dengan prompt yang minta output JSON: `{ nominal, kategori, deskripsi, tanggal }`.
4. Setelah dapat hasil, **gambar langsung dibuang** dari memory — tidak pernah disimpan ke Supabase Storage atau tempat lain.
5. Bot tampilkan hasil parsing + tombol inline `[Ya]` `[Edit]` `[Batal]` (sama seperti alur teks manual).

### Konfirmasi (berlaku untuk kedua alur di atas)
- **[Ya]** → simpan ke tabel `transactions` di Supabase.
- **[Edit]** → bot kirim `ForceReply` dengan *placeholder* berisi nilai hasil parsing sebelumnya sebagai panduan. User mengetik ulang nilai yang benar (Telegram tidak mendukung pre-fill otomatis ke kolom input — placeholder hanya teks bantuan, bukan nilai yang otomatis terkirim).
- **[Batal]** → semua data dan hasil parsing dibuang, tidak ada yang disimpan.

### Hasil parsing sementara (state)
Karena ada jeda antara "Gemini balas JSON" dan "user konfirmasi", hasil parsing disimpan **sementara di memory/session** (bukan database) sambil menunggu balasan Ya/Edit/Batal. Baru ditulis ke Supabase setelah dikonfirmasi.

### Laporan
User minta laporan (`/laporan minggu` / `/laporan bulan` / `/laporan tahun`) → backend query dan agregasi (`SUM(nominal) GROUP BY kategori`) dari tabel `transactions` sesuai rentang waktu, lalu format jadi teks balasan.

## Skema Database (Supabase / PostgreSQL)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_chat_id BIGINT UNIQUE NOT NULL,
  nama TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  judul TEXT NOT NULL,
  deadline TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'done'
  notified_24h BOOLEAN DEFAULT FALSE,
  notified_3h BOOLEAN DEFAULT FALSE,
  notified_1h BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  nominal NUMERIC NOT NULL,
  kategori TEXT,
  deskripsi TEXT,
  sumber TEXT, -- 'manual' | 'struk'
  created_at TIMESTAMP DEFAULT NOW()
);
```

Catatan: kolom untuk menyimpan path/URL gambar **sengaja tidak ada** karena gambar tidak pernah disimpan.

## Estimasi Biaya

| Item | Biaya |
|---|---|
| Hosting (Render) | Rp0 |
| Database (Supabase) | Rp0 (dalam batas 500 MB) |
| Gemini API (parsing + vision, volume personal) | Rp0 – ~Rp1.600/bulan, kemungkinan besar masih dalam kuota gratis Google AI Studio/Pro |
| Scheduler (GitHub Actions) | Rp0 |
| **Total** | **Rp0 – hampir Rp0/bulan** |

## Hal yang Masih Perlu Diputuskan / Dikerjakan

- [ ] Setup project Supabase + generate connection string
- [ ] Generate API key Gemini dari akun Google AI Pro, catat nama model persis yang tersedia
- [ ] Setup repo GitHub + workflow Actions (`schedule` cron per jam)
- [ ] Setup project Render (connect ke repo GitHub, deploy web service)
- [ ] Implementasi endpoint `/check-deadlines` untuk dipanggil GitHub Actions
- [ ] Desain prompt final untuk Gemini (parsing teks & vision struk) agar output JSON konsisten
- [ ] Implementasi state sementara (in-memory/session) untuk alur konfirmasi Ya/Edit/Batal
