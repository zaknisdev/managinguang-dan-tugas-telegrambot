const cron = require('node-cron');
const { runCheckDeadlines } = require('./checkDeadlines');

// Dipakai saat bot dijalankan permanen di lokal/server sendiri (USE_INTERNAL_CRON=true).
// Proses ini tidak sleep seperti Render free tier, jadi cek deadline & keep-alive
// Supabase cukup dijadwalkan di dalam proses yang sama, tanpa GitHub Actions.
function startLocalCron(bot) {
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await runCheckDeadlines(bot);
      console.log(`[local-cron] cek deadline selesai: ${JSON.stringify(result)}`);
    } catch (err) {
      console.error('[local-cron] gagal cek deadline:', err);
    }
  });

  console.log('[local-cron] scheduler internal aktif (tiap jam, menit ke-0)');
}

module.exports = { startLocalCron };
