const { sendText, sendButtons, sendLocationRequest } = require('./whatsappService');
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
  const location = message.location; // { latitude, longitude, name?, address? }

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
      await sendLocationRequest(
        phone,
        'Shukriya! Ab neeche button dabakar apni live location share karein, taaki hamari team sahi jagah pahunch sake.'
      );
      break;
    }

    case 'ask_location': {
      if (location && location.latitude && location.longitude) {
        // Customer shared a live/pinned location via WhatsApp's map picker
        const mapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
        session.data.location = location.address || location.name || `Pin location: ${mapsLink}`;
        session.data.locationCoords = `${location.latitude},${location.longitude}`;
        session.data.locationMapsLink = mapsLink;
      } else if (text) {
        // Fallback: customer typed an address instead of sharing location
        session.data.location = text;
      } else {
        await sendText(phone, 'Please upar diye gaye "Send Location" button se apni location share karein, ya address type karein.');
        return;
      }

      session.step = 'ask_datetime';
      await sendText(phone, 'Location mil gayi! ✅\n\nKis din aur time par service chahiye? (jaise: Kal shaam 5 baje)');
      break;
    }

    case 'ask_datetime': {
      if (!text) {
        await sendText(phone, 'Please date aur time batayein.');
        return;
      }
      session.data.preferredDatetime = text;
      session.step = 'confirm';

      let locationLine = `📍 Location: ${session.data.location}`;
      if (session.data.locationMapsLink) {
        locationLine += `\n🗺️ ${session.data.locationMapsLink}`;
      }

      const summary = `Booking confirm karne se pehle ek nazar daal lein:\n\n` +
        `🔧 Service: ${session.data.service}\n` +
        `👤 Naam: ${session.data.customerName}\n` +
        `${locationLine}\n` +
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

  let msg = `🔔 Nayi Booking!\n\n` +
    `ID: ${bookingId}\n` +
    `Service: ${data.service}\n` +
    `Naam: ${data.customerName}\n` +
    `Location: ${data.location}\n`;

  if (data.locationMapsLink) {
    msg += `Map: ${data.locationMapsLink}\n`;
  }

  msg += `Time: ${data.preferredDatetime}\n` +
    `Customer Phone: ${customerPhone}`;

  await sendText(adminNumber, msg);
}

module.exports = {
  handleIncomingMessage,
};
