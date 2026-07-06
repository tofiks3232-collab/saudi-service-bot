const axios = require('axios');
const logger = require('../utils/logger');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GRAPH_API_VERSION = 'v20.0';

const client = axios.create({
  baseURL: `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}`,
  headers: {
    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function sendText(to, body) {
  try {
    await client.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    });
  } catch (err) {
    logger.error('sendText failed:', err.response?.data || err.message);
  }
}

async function sendButtons(to, bodyText, buttons) {
  try {
    await client.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    });
  } catch (err) {
    logger.error('sendButtons failed:', err.response?.data || err.message);
  }
}

// Sends WhatsApp's native "Send Location" prompt.
// Customer taps a button, WhatsApp opens their map picker, and they can
// share either their live/current GPS location or pick a point on the map.
async function sendLocationRequest(to, bodyText) {
  try {
    await client.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'location_request_message',
        body: { text: bodyText },
        action: { name: 'send_location' },
      },
    });
  } catch (err) {
    logger.error('sendLocationRequest failed:', err.response?.data || err.message);
  }
}

module.exports = {
  sendText,
  sendButtons,
  sendLocationRequest,
};
