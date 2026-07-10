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
async function sendList(to, bodyText, buttonText, sections) {
  try {
    await client.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections,
        },
      },
    });
  } catch (err) {
    logger.error('sendList failed:', err.response?.data || err.message);
  }
}
async function sendImage(to, imageUrl, caption) {
  try {
    await client.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: {
        link: imageUrl,
        caption,
      },
    });
  } catch (err) {
    logger.error('sendImage failed:', err.response?.data || err.message);
  }
}
async function sendImageButton(to, imageUrl, bodyText, buttonId, buttonTitle) {
  try {
    await client.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: {
          type: 'image',
          image: { link: imageUrl },
        },
        body: { text: bodyText },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: { id: buttonId, title: buttonTitle },
            },
          ],
        },
      },
    });
  } catch (err) {
    logger.error('sendImageButton failed:', err.response?.data || err.message);
  }
}

// Downloads an incoming WhatsApp media file (e.g. a photo the customer sent
// us). WhatsApp's media URLs are temporary and require the same auth token
// to fetch, so we grab the bytes ourselves and hand them back to the caller
// to save wherever they like.
async function downloadMedia(mediaId) {
  try {
    const metaRes = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    });
    const { url, mime_type: mimeType } = metaRes.data;

    const fileRes = await axios.get(url, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      responseType: 'arraybuffer',
    });

    return { buffer: Buffer.from(fileRes.data), mimeType };
  } catch (err) {
    logger.error('downloadMedia failed:', err.response?.data || err.message);
    return null;
  }
}

module.exports = {
  sendText,
  sendButtons,
  sendLocationRequest,
  sendList,
  sendImage,
  sendImageButton,
  downloadMedia,
};
