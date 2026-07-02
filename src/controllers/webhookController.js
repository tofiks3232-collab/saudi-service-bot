const logger = require('../utils/logger');
const { handleIncomingMessage } = require('../services/conversationService');

// GET /webhook - Meta isse call karta hai jab tum webhook setup/verify karte ho
function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    logger.info('Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  logger.warn('Webhook verification failed - token mismatch');
  return res.sendStatus(403);
}

// POST /webhook - Meta isse call karta hai jab koi message aata hai
async function receiveMessage(req, res) {
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return;
    }

    const from = message.from;
    logger.info('Incoming message from', from, JSON.stringify(message));

    await handleIncomingMessage(from, message);
  } catch (err) {
    logger.error('Error processing incoming message:', err);
  }
}

module.exports = {
  verifyWebhook,
  receiveMessage,
};
