const { Telegraf, Markup } = require('telegraf');
const env = require('../config/env');
const session = require('../utils/session');
const userService = require('../services/userService');
const taskService = require('../services/taskService');
const transactionService = require('../services/transactionService');
const { parseExpenseText } = require('../ai/parseText');
const { parseReceiptImage } = require('../ai/parseReceipt');
const { parseDeadlineInput, formatDeadline, formatRupiah } = require('../utils/dateUtils');
const { taskListKeyboard, confirmKeyboard } = require('./keyboards');

const bot = new Telegraf(env.telegramBotToken);

async function ensureUser(ctx) {
  return userService.getOrCreateUser(ctx.chat.id, ctx.from?.first_name || null);
}

function formatParsed(parsed) {
  return (
    `📝 Hasil parsing:\n` +
    `Nominal: ${formatRupiah(parsed.nominal)}\n` +
    `Kategori: ${parsed.kategori}\n` +
    `Deskripsi: ${parsed.deskripsi}\n` +
    `Tanggal: ${parsed.tanggal}\n\n` +
    `Simpan transaksi ini?`
  );
}

bot.start(async (ctx) => {
  await ensureUser(ctx);
  await ctx.reply(
    'Halo! Aku bantu kamu kelola tugas & catat pengeluaran.\n\n' +
      '📌 Tugas:\n' +
      '/tambahtugas — tambah tugas baru\n' +
      '/tugas — lihat daftar tugas\n\n' +
      '💰 Keuangan:\n' +
      'Ketik pengeluaran bebas, misal "abis jajan bakso 15rb", atau kirim foto struk.\n' +
      '/laporan minggu | /laporan bulan | /laporan tahun'
  );
});

bot.command('tambahtugas', async (ctx) => {
  await ensureUser(ctx);
  session.set(ctx.chat.id, { type: 'awaiting_task_title' });
  await ctx.reply('Judul tugas apa?', Markup.forceReply());
});

bot.command('tugas', async (ctx) => {
  const user = await ensureUser(ctx);
  const tasks = await taskService.listPendingTasks(user.id);

  if (tasks.length === 0) {
    await ctx.reply('Tidak ada tugas pending. 🎉');
    return;
  }

  const lines = tasks.map(
    (task, index) => `${index + 1}. ${task.judul} — ${formatDeadline(task.deadline)}`
  );
  await ctx.reply(lines.join('\n'), taskListKeyboard(tasks));
});

bot.command('laporan', async (ctx) => {
  const user = await ensureUser(ctx);
  const arg = ctx.message.text.split(' ')[1];
  const period = { minggu: 'minggu', bulan: 'bulan', tahun: 'tahun' }[arg];

  if (!period) {
    await ctx.reply('Gunakan: /laporan minggu, /laporan bulan, atau /laporan tahun');
    return;
  }

  const report = await transactionService.getReport(user.id, period);
  if (report.count === 0) {
    await ctx.reply(`Belum ada transaksi dalam periode ${period} ini.`);
    return;
  }

  const lines = Object.entries(report.byKategori)
    .sort((a, b) => b[1] - a[1])
    .map(([kategori, total]) => `- ${kategori}: ${formatRupiah(total)}`);

  await ctx.reply(
    `📊 Laporan ${period} ini:\n\n${lines.join('\n')}\n\nTotal: ${formatRupiah(report.total)}`
  );
});

bot.on('photo', async (ctx) => {
  const user = await ensureUser(ctx);
  await ctx.reply('Membaca struk...');

  try {
    const photos = ctx.message.photo;
    const fileId = photos[photos.length - 1].file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    const response = await fetch(fileLink.href);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parsed = await parseReceiptImage(buffer, 'image/jpeg');

    session.set(ctx.chat.id, { type: 'pending_confirmation', parsed, sumber: 'struk', userId: user.id });
    await ctx.reply(formatParsed(parsed), confirmKeyboard());
  } catch (err) {
    console.error('[photo] gagal parsing struk:', err);
    await ctx.reply('Maaf, gagal membaca struk. Coba kirim ulang dengan foto yang lebih jelas.');
  }
});

bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return; // command tidak ditangani di sini

  const user = await ensureUser(ctx);
  const state = session.get(ctx.chat.id);
  const text = ctx.message.text.trim();

  if (state?.type === 'awaiting_task_title') {
    session.set(ctx.chat.id, { type: 'awaiting_task_deadline', judul: text });
    await ctx.reply('Deadline kapan? Format: DD-MM-YYYY HH:mm (contoh: 25-12-2026 14:30)', Markup.forceReply());
    return;
  }

  if (state?.type === 'awaiting_task_deadline') {
    const result = parseDeadlineInput(text);
    if (result.error) {
      await ctx.reply(`${result.error}\n\nCoba lagi:`, Markup.forceReply());
      return;
    }

    const task = await taskService.createTask(user.id, state.judul, result.date);
    session.clear(ctx.chat.id);
    await ctx.reply(`✅ Tugas disimpan: "${task.judul}" — deadline ${formatDeadline(task.deadline)}`);
    return;
  }

  if (state?.type === 'awaiting_expense_edit') {
    try {
      const parsed = await parseExpenseText(text);
      session.set(ctx.chat.id, { type: 'pending_confirmation', parsed, sumber: state.sumber, userId: user.id });
      await ctx.reply(formatParsed(parsed), confirmKeyboard());
    } catch (err) {
      console.error('[edit] gagal parsing:', err);
      await ctx.reply('Gagal memproses. Coba ketik ulang deskripsi pengeluarannya.', Markup.forceReply());
    }
    return;
  }

  // Default: teks bebas dianggap input pengeluaran manual
  try {
    const parsed = await parseExpenseText(text);
    session.set(ctx.chat.id, { type: 'pending_confirmation', parsed, sumber: 'manual', userId: user.id });
    await ctx.reply(formatParsed(parsed), confirmKeyboard());
  } catch (err) {
    console.error('[text] gagal parsing pengeluaran:', err);
    await ctx.reply('Maaf, gagal memproses teks itu. Coba tulis ulang, misal: "jajan bakso 15rb".');
  }
});

bot.action(/task_done:(\d+)/, async (ctx) => {
  const taskId = ctx.match[1];
  await taskService.markTaskDone(taskId);
  await ctx.answerCbQuery('Tugas ditandai selesai ✅');
  await ctx.editMessageText('✅ Tugas ditandai selesai.');
});

bot.action(/task_delete:(\d+)/, async (ctx) => {
  const taskId = ctx.match[1];
  await taskService.deleteTask(taskId);
  await ctx.answerCbQuery('Tugas dihapus 🗑️');
  await ctx.editMessageText('🗑️ Tugas dihapus.');
});

bot.action('confirm_yes', async (ctx) => {
  const state = session.get(ctx.chat.id);
  if (!state || state.type !== 'pending_confirmation') {
    await ctx.answerCbQuery('Tidak ada data untuk disimpan.');
    return;
  }

  const { parsed, sumber, userId } = state;
  await transactionService.createTransaction(userId, {
    nominal: parsed.nominal,
    kategori: parsed.kategori,
    deskripsi: parsed.deskripsi,
    sumber,
  });

  session.clear(ctx.chat.id);
  await ctx.answerCbQuery('Tersimpan ✅');
  await ctx.editMessageText(`✅ Transaksi tersimpan: ${formatRupiah(parsed.nominal)} — ${parsed.kategori}`);
});

bot.action('confirm_edit', async (ctx) => {
  const state = session.get(ctx.chat.id);
  if (!state || state.type !== 'pending_confirmation') {
    await ctx.answerCbQuery('Tidak ada data untuk diedit.');
    return;
  }

  session.set(ctx.chat.id, { type: 'awaiting_expense_edit', sumber: state.sumber });
  await ctx.answerCbQuery();

  const placeholder = `${state.parsed.deskripsi} ${state.parsed.nominal} ${state.parsed.kategori}`;
  await ctx.reply(
    `Ketik ulang deskripsi pengeluaran yang benar.\n(contoh sebelumnya: "${placeholder}")`,
    Markup.forceReply()
  );
});

bot.action('confirm_cancel', async (ctx) => {
  session.clear(ctx.chat.id);
  await ctx.answerCbQuery('Dibatalkan');
  await ctx.editMessageText('❌ Dibatalkan, tidak ada data yang disimpan.');
});

// Tanpa ini, error yang terjadi saat memproses satu update (misal tabel
// belum ada, Gemini timeout, dll) akan merambat ke atas dan menghentikan
// seluruh long polling — bot jadi diam total sampai proses di-restart.
bot.catch((err, ctx) => {
  console.error(`[bot] error saat proses update ${ctx.updateType}:`, err);
  ctx.reply('Maaf, terjadi kesalahan saat memproses permintaan kamu. Coba lagi.').catch(() => {});
});

// Daftarkan command ke menu "/" Telegram supaya muncul di autocomplete.
bot.telegram
  .setMyCommands([
    { command: 'start', description: 'Mulai & lihat menu bantuan' },
    { command: 'tambahtugas', description: 'Tambah tugas baru' },
    { command: 'tugas', description: 'Lihat daftar tugas pending' },
    { command: 'laporan', description: 'Laporan keuangan (minggu/bulan/tahun)' },
  ])
  .then(() => console.log('[bot] command menu terdaftar'))
  .catch((err) => console.error('[bot] gagal daftar command menu:', err));

module.exports = bot;
