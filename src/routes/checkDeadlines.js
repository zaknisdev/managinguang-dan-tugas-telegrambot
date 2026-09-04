const express = require('express');
const env = require('../config/env');
const { runCheckDeadlines } = require('../scheduler/checkDeadlines');

function createCheckDeadlinesRouter(bot) {
  const router = express.Router();

  router.all('/check-deadlines', async (req, res) => {
    if (env.cronSecret) {
      const provided = req.get('X-Cron-Secret');
      if (provided !== env.cronSecret) {
        return res.status(401).json({ error: 'unauthorized' });
      }
    }

    try {
      const result = await runCheckDeadlines(bot);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error('[check-deadlines] error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

module.exports = createCheckDeadlinesRouter;
