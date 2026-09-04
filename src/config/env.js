require('dotenv').config();

const required = [
  'TELEGRAM_BOT_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'GEMINI_API_KEY',
];

function loadEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[env] Variabel wajib belum di-set: ${missing.join(', ')}`);
  }

  return {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiTextModel: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite',
    geminiVisionModel: process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash-lite',
    port: parseInt(process.env.PORT, 10) || 3000,
    cronSecret: process.env.CRON_SECRET || '',
  };
}

module.exports = loadEnv();
