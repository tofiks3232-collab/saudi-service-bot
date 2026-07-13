const logger = require('../utils/logger');
const { handleIncomingMessage } = require('../services/conversationService');

// Meta retries webhook delivery (sometimes hours or even days later) if our
// server didn't respond fast enough, or was asleep/down (common on Railway's
// free tier when the app has been idle). Without a guard, a retried "Hi"
// gets processed again as if it were brand new — sending the customer (or
// admin) a fresh language-menu / welcome message out of nowhere, at random
// times. We remember recently-seen message IDs and skip anything repeated.
const processedMessageIds = new Map(); // message.id -> timestamp first seen
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000; // keep IDs for 24 hours

function isDuplicate(messageId) {
  const now = Date.now();

  // Light cleanup so this Map doesn't grow forever.
  for (const [id, seenAt] of processedMessageIds) {
    if (now - seenAt > DEDUPE_TTL_MS) {
      processedMessageIds.delete(id);
    }
  }

  if (processedMessageIds.has(messageId)) {
    return true;
  }

  processedMessageIds.set(messageId, now);
  return false;
}

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
      // Status updates (sent/delivered/read) and other non-message events
      // land here too - nothing to do with them.
      return;
    }

    if (message.id && isDuplicate(message.id)) {
      logger.warn(`Duplicate webhook for message ${message.id}, skipping (Meta retry)`);
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
