// State sementara per chat_id, hidup di memory saja (bukan database).
// Dipakai untuk alur multi-step: input tugas step-by-step, dan konfirmasi
// hasil parsing keuangan (Ya/Edit/Batal) sebelum ditulis ke Supabase.
const sessions = new Map();

function get(chatId) {
  return sessions.get(chatId);
}

function set(chatId, state) {
  sessions.set(chatId, state);
}

function clear(chatId) {
  sessions.delete(chatId);
}

module.exports = { get, set, clear };
