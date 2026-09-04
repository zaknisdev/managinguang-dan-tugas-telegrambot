const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');

const client = new GoogleGenerativeAI(env.geminiApiKey);

function getModel(modelName) {
  return client.getGenerativeModel({ model: modelName });
}

// Gemini kadang membungkus JSON dalam ```json ... ``` — strip sebelum parse.
function extractJson(rawText) {
  const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '');
  return JSON.parse(cleaned);
}

module.exports = { getModel, extractJson };
