const { sendText, sendButtons } = require('./whatsappService');
const { createBooking } = require('../database/db');
const logger = require('../utils/logger');

const sessions = new Map();

const SERVICES = {
  cleaning: 'Home Cleaning',
  ac: 'AC Service',
  plumber: 'Plumber',
};

function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, { step: 'new', data: {} });
  }
  return sessions.get(phone);
}

function resetSession(phone) {
  sessions.set(phone, { step: 'new', data: {} });
}

async function startFlow(phone) {
  resetSession(phone);
  const session = getSession(phone);
  session.step = 'choose_service';

  await sendButtons(phone, 'Assalamu Alaikum! 👋 Welcome to Urban Pronto.\n\nAap kaunsi service book karna chahte hain?', [
    { id: 'svc_cleaning', title: 'Home Cleaning' },
    { id: 'svc_ac', title: 'AC Service' },
    { id: 'svc_plumber', title: 'Plumber' },
  ]);
}

async function handleIncomingMessage(phone, message) {
  const session = getSession(phone);
  const text = message.text?.body?.trim();
  const buttonId = message.interactive?.button_reply?.id;

  if (text && /^(hi|hello|start|hi bot|salam)$/i.test(text)) {
    await startFlow(phone);
    return;
  }

  switch (session.step) {
    case 'new':
      await startFlow(phone);
      break;

    case 'choose_service': {
      const map = { svc_cleaning: 'cleaning', svc_ac: 'ac', svc_plumber: 'plumber' };
      const chosen = map[buttonId];
      if (!chosen) {
        await sendText(phone, 'Please neeche diye gaye buttons me se ek option choose karein.');
        return;
      }
      session.data.service = SERVICES[chosen];
      session.step = 'ask_name';
      await sendText(phone, `Great! ${SERVICES[chosen]} select kiya hai.\n\nAapka pura naam kya hai?`);
      break;
    }

    case 'ask_name': {
      if (!text) {
        await sendText(phone, 'Please apna naam type karein.');
        return;
      }
      session.data.customerName = text;
      session.step = 'ask_location';
      await sendText(phone, 'Shukriya! Ab apna location/address bhejein (area, city).');
      break;
    }

    case 'ask_location': {
      if (!text) {
        await sendText(phone, 'Please apna location type karein.');
        return;
      }
      session.data.location = text;
      session.step = 'ask_datetime';
      await sendText(phone, 'Kis din aur time par service chahiye? (jaise: Kal shaam 5 baje)');
      break;
    }

    case 'ask_datetime': {
      if (!text) {
        await sendText(phone, 'Please date aur time batayein.');
        return;
      }
      session.data.preferredDatetime = text;
      session.step = 'confirm';

      const summary = `Booking confirm karne se pehle ek nazar daal lein:\n\n` +
        `🔧 Service: ${session.data.service}\n` +
        `👤 Naam: ${session.data.customerName}\n` +
        `📍 Location: ${session.data.location}\n` +
        `🕒 Time: ${session.data.preferredDatetime}\n\n` +
        `Confirm karein?`;

      await sendButtons(phone, summary, [
        { id: 'confirm_yes', title: 'Confirm ✅' },
        { id: 'confirm_no', title: 'Cancel ❌' },
      ]);
      break;
    }

    case 'confirm': {
      if (buttonId === 'confirm_yes') {
        const bookingId = createBooking({
          customerPhone: phone,
          customerName: session.data.customerName,
          service: session.data.service,
          location: session.data.location,
          preferredDatetime: session.data.preferredDatetime,
        });

        await sendText(
          phone,
          `Booking confirm ho gayi! 🎉\n\nBooking ID: ${bookingId}\n\nHamari team jald aapse contact karegi. Shukriya Urban Pronto choose karne ke liye!`
        );

        await notifyAdmin(bookingId, session.data, phone);
        resetSession(phone);
      } else if (buttonId === 'confirm_no') {
        await sendText(phone, 'Booking cancel kar di gayi. Naya booking start karne ke liye "Hi" bhejein.');
        resetSession(phone);
      } else {
        await sendText(phone, 'Please Confirm ya Cancel button dabayein.');
      }
      break;
    }

    default:
      await startFlow(phone);
  }
}

async function notifyAdmin(bookingId, data, customerPhone) {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) {
    logger.warn('ADMIN_WHATSAPP_NUMBER not set, skipping admin notification');
    return;
  }

  const msg = `🔔 Nayi Booking!\n\n` +
    `ID: ${bookingId}\n` +
    `Service: ${data.service}\n` +
    `Naam: ${data.customerName}\n` +
    `Location: ${data.location}\n` +
    `Time: ${data.preferredDatetime}\n` +
    `Customer Phone: ${customerPhone}`;

  await sendText(adminNumber, msg);
}

module.exports = {
  handleIncomingMessage,
};
