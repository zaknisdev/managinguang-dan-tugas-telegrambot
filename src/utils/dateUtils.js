// Format input yang diterima dari user: "DD-MM-YYYY HH:mm" (contoh: 25-12-2026 14:30)
const DEADLINE_REGEX = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/;

function parseDeadlineInput(text) {
  const match = String(text).trim().match(DEADLINE_REGEX);
  if (!match) {
    return { error: 'Format salah. Gunakan format: DD-MM-YYYY HH:mm (contoh: 25-12-2026 14:30)' };
  }

  const [, dd, mm, yyyy, hh, min] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), 0, 0);

  // Validasi tanggal benar-benar valid (misal 31-02 akan overflow ke bulan lain)
  if (
    date.getFullYear() !== Number(yyyy) ||
    date.getMonth() !== Number(mm) - 1 ||
    date.getDate() !== Number(dd) ||
    date.getHours() !== Number(hh) ||
    date.getMinutes() !== Number(min)
  ) {
    return { error: 'Tanggal tidak valid. Periksa kembali input kamu.' };
  }

  if (date.getTime() <= Date.now()) {
    return { error: 'Deadline tidak boleh di masa lalu. Masukkan tanggal dan jam yang akan datang.' };
  }

  return { date };
}

function formatDeadline(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDateRange(period) {
  const now = new Date();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000); // sampai akhir hari ini (eksklusif besok)
  let start;

  switch (period) {
    case 'minggu':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case 'bulan':
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      break;
    case 'tahun':
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      throw new Error(`Periode tidak dikenal: ${period}`);
  }

  return { start, end };
}

function formatRupiah(nominal) {
  return `Rp${Number(nominal).toLocaleString('id-ID')}`;
}

module.exports = { parseDeadlineInput, formatDeadline, getDateRange, formatRupiah };
