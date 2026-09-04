const taskService = require('../services/taskService');
const { taskNotifKeyboard } = require('../telegram/keyboards');

const THRESHOLDS = [
  { hours: 24, field: 'notified_24h', label: 'H-24 jam' },
  { hours: 3, field: 'notified_3h', label: 'H-3 jam' },
  { hours: 1, field: 'notified_1h', label: 'H-1 jam' },
];

async function runCheckDeadlines(bot) {
  const tasks = await taskService.getTasksNeedingNotification();
  const now = Date.now();
  let sent = 0;

  for (const task of tasks) {
    const chatId = task.users?.telegram_chat_id;
    if (!chatId) continue;

    const hoursRemaining = (new Date(task.deadline).getTime() - now) / (1000 * 60 * 60);
    if (hoursRemaining < 0) continue; // sudah lewat deadline, biarkan user yang urus manual

    for (const threshold of THRESHOLDS) {
      if (hoursRemaining <= threshold.hours && !task[threshold.field]) {
        await bot.telegram.sendMessage(
          chatId,
          `⏰ Pengingat (${threshold.label}): "${task.judul}" — deadline ${new Date(task.deadline).toLocaleString('id-ID')}`,
          taskNotifKeyboard(task.id)
        );
        await taskService.markNotified(task.id, threshold.field);
        sent += 1;
      }
    }
  }

  return { checked: tasks.length, notificationsSent: sent };
}

module.exports = { runCheckDeadlines };
