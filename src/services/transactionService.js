const supabase = require('../db/supabase');
const { getDateRange } = require('../utils/dateUtils');

async function createTransaction(userId, { nominal, kategori, deskripsi, sumber }) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ user_id: userId, nominal, kategori, deskripsi, sumber })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function getReport(userId, period) {
  const { start, end } = getDateRange(period);

  const { data, error } = await supabase
    .from('transactions')
    .select('nominal, kategori')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());

  if (error) throw error;

  const byKategori = {};
  let total = 0;
  for (const row of data) {
    const kategori = row.kategori || 'Lainnya';
    const nominal = Number(row.nominal);
    byKategori[kategori] = (byKategori[kategori] || 0) + nominal;
    total += nominal;
  }

  return { total, byKategori, start, end, count: data.length };
}

module.exports = { createTransaction, getReport };
