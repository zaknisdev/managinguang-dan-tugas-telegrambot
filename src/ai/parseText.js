const { getModel, extractJson } = require('./gemini');
const env = require('../config/env');

const PROMPT = `Kamu adalah asisten yang mengubah catatan pengeluaran berbahasa Indonesia menjadi data JSON terstruktur.

Ekstrak informasi berikut dari teks yang diberikan user:
- nominal: angka (number, dalam Rupiah, tanpa simbol/titik/koma pemisah ribuan). Konversi singkatan seperti "15rb" atau "15k" menjadi 15000.
- kategori: satu kata/frasa pendek, pilih yang paling sesuai dari: Makanan, Transportasi, Belanja, Tagihan, Kesehatan, Hiburan, Pendidikan, Lainnya.
- deskripsi: ringkasan singkat pengeluaran (maks 10 kata), gunakan bahasa asli user.
- tanggal: tanggal transaksi dalam format YYYY-MM-DD. Jika tidak disebutkan, gunakan tanggal hari ini: ${new Date().toISOString().slice(0, 10)}.

Balas HANYA dengan JSON valid tanpa penjelasan tambahan, format persis:
{"nominal": number, "kategori": string, "deskripsi": string, "tanggal": "YYYY-MM-DD"}

Teks user: `;

async function parseExpenseText(text) {
  const model = getModel(env.geminiTextModel);
  const result = await model.generateContent(PROMPT + text);
  const rawText = result.response.text();
  return extractJson(rawText);
}

module.exports = { parseExpenseText };
