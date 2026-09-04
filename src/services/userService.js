const supabase = require('../db/supabase');

async function getOrCreateUser(telegramChatId, nama) {
  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_chat_id', telegramChatId)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing;

  const { data: created, error: insertError } = await supabase
    .from('users')
    .insert({ telegram_chat_id: telegramChatId, nama })
    .select('*')
    .single();

  if (insertError) throw insertError;
  return created;
}

module.exports = { getOrCreateUser };
