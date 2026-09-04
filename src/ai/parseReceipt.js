const { getModel, extractJson } = require('./gemini');
const env = require('../config/env');

const PROMPT = `Kamu adalah asisten yang membaca struk belanja/pembayaran dari gambar dan mengubahnya menjadi data JSON terstruktur.

Ekstrak informasi berikut dari struk pada gambar:
- nominal: angka (number) total yang dibayar, dalam Rupiah, tanpa simbol/titik/koma pemisah ribuan.
- kategori: satu kata/frasa pendek, pilih yang paling sesuai dari: Makanan, Transportasi, Belanja, Tagihan, Kesehatan, Hiburan, Pendidikan, Lainnya.
- deskripsi: ringkasan singkat isi struk (nama toko/item utama, maks 10 kata).
- tanggal: tanggal transaksi pada struk dalam format YYYY-MM-DD. Jika tidak terbaca, gunakan tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.

Balas HANYA dengan JSON valid tanpa penjelasan tambahan, format persis:
{"nominal": number, "kategori": string, "deskripsi": string, "tanggal": "YYYY-MM-DD"}`;

// buffer gambar diproses langsung di memory, tidak pernah ditulis ke disk.
async function parseReceiptImage(buffer, mimeType) {
  const model = getModel(env.geminiVisionModel);
  const result = await model.generateContent([
    { inlineData: { data: buffer.toString('base64'), mimeType } },
    { text: PROMPT },
  ]);
  const rawText = result.response.text();
  return extractJson(rawText);
}

module.exports = { parseReceiptImage };
