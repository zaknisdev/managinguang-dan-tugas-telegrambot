const { Markup } = require('telegraf');

function taskListKeyboard(tasks) {
  const rows = tasks.map((task, index) => [
    Markup.button.callback(`✅ Selesai #${index + 1}`, `task_done:${task.id}`),
    Markup.button.callback(`🗑️ Hapus #${index + 1}`, `task_delete:${task.id}`),
  ]);
  return Markup.inlineKeyboard(rows);
}

function taskNotifKeyboard(taskId) {
  return Markup.inlineKeyboard([
    Markup.button.callback('✅ Tandai Selesai', `task_done:${taskId}`),
  ]);
}

function confirmKeyboard() {
  return Markup.inlineKeyboard([
    Markup.button.callback('✅ Ya', 'confirm_yes'),
    Markup.button.callback('✏️ Edit', 'confirm_edit'),
    Markup.button.callback('❌ Batal', 'confirm_cancel'),
  ]);
}

module.exports = { taskListKeyboard, taskNotifKeyboard, confirmKeyboard };
