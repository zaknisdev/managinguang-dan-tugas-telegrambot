const express = require('express');
const env = require('./config/env');
const bot = require('./telegram/bot');
const createCheckDeadlinesRouter = require('./routes/checkDeadlines');

const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('OK'));
app.use(createCheckDeadlinesRouter(bot));

app.listen(env.port, () => {
  console.log(`[server] listening on port ${env.port}`);
});

bot
  .launch()
  .then(() => console.log('[bot] Telegram bot berjalan (long polling)'))
  .catch((err) => console.error('[bot] gagal start:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
