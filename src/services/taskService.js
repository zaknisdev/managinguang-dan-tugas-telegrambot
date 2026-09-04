const supabase = require('../db/supabase');

async function createTask(userId, judul, deadline) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ user_id: userId, judul, deadline: deadline.toISOString() })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function listPendingTasks(userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('deadline', { ascending: true });

  if (error) throw error;
  return data;
}

async function getTaskById(taskId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function markTaskDone(taskId) {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'done' })
    .eq('id', taskId);

  if (error) throw error;
}

async function deleteTask(taskId) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

async function getTasksNeedingNotification() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, users(telegram_chat_id)')
    .eq('status', 'pending')
    .or('notified_24h.eq.false,notified_3h.eq.false,notified_1h.eq.false');

  if (error) throw error;
  return data;
}

async function markNotified(taskId, field) {
  const { error } = await supabase
    .from('tasks')
    .update({ [field]: true })
    .eq('id', taskId);

  if (error) throw error;
}

module.exports = {
  createTask,
  listPendingTasks,
  getTaskById,
  markTaskDone,
  deleteTask,
  getTasksNeedingNotification,
  markNotified,
};
