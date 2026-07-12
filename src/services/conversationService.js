const { sendText, sendButtons, sendLocationRequest, sendList, downloadMedia } = require('./whatsappService');
const { createBooking } = require('../database/db');
const { saveImageBuffer } = require('../utils/mediaStorage');
const logger = require('../utils/logger');

const sessions = new Map();
const pendingRatingTimers = new Map();

const SERVICES = {
  cleaning: 'Home Cleaning',
  ac: 'AC Service',
  plumber: 'Plumber',
};

const URGENT_SURCHARGE = 50; // SAR — extra charge for urgent/ASAP bookings

function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, { step: 'new', data: {} });
  }
  return sessions.get(phone);
}

function resetSession(phone) {
  sessions.set(phone, { step: 'new', data: {} });
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildDateOptions() {
  const rows = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[d.getDay()];
    const dateStr = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;

    rows.push({
      id: `date_${i}`,
      title: `${label}`,
      description: dateStr,
    });
  }

  return rows;
}

function buildTimeSlotsForDate() {
  return [
    { id: 'time_morning', title: '🌅 Morning', description: '9:00 AM - 12:00 PM' },
    { id: 'time_afternoon', title: '☀️ Afternoon', description: '12:00 PM - 4:00 PM' },
    { id: 'time_evening', title: '🌇 Evening', description: '4:00 PM - 7:00 PM' },
    { id: 'time_night', title: '🌙 Night', description: '7:00 PM - 9:00 PM' },
  ];
}

async function startFlow(phone) {
  resetSession(phone);
  const session = getSession(phone);
  session.step = 'choose_service';

  await sendText(
    phone,
    `*Khidmora* 🏠\n_Smart Home Services_\n\n` +
      `Assalamu Alaikum! Hum aapki khidmat mein hazir hain.\n\n` +
      `Neeche di gayi list se apni service select karein 👇`
  );

  await sendList(
    phone,
    'Kaunsi service book karna chahte hain?',
    'Services Dekhein',
    [{
      title: 'Hamari Services',
      rows: [
        {
          id: 'svc_cleaning',
          title: '🧹 Home Cleaning',
          description: 'Deep cleaning, sofa, kitchen & bathroom',
        },
        {
          id: 'svc_ac',
          title: '❄️ AC Service',
          description: 'Repair, gas refill, installation',
        },
        {
          id: 'svc_plumber',
          title: '🔧 Plumber',
          description: 'Leak fix, pipe & tap installation',
        },
      ],
    }]
  );
}

async function handleIncomingMessage(phone, message) {
  const session = getSession(phone);
  const text = message.text?.body?.trim();
  const buttonId = message.interactive?.button_reply?.id;
  const listReplyId = message.interactive?.list_reply?.id;
  const listReplyTitle = message.interactive?.list_reply?.title;
  const location = message.location;

  if (listReplyId && listReplyId.startsWith('rate_')) {
    const stars = listReplyId.split('_')[1];
    await sendText(
      phone,
      `Shukriya aapki *${stars}/5* rating ke liye! ⭐\n\nHum apni service aur behtar banate rahenge. 🙏`
    );
    await notifyAdminRating(phone, stars);
    return;
  }

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
      const chosenId = buttonId || listReplyId;
      const chosen = map[chosenId];
      if (!chosen) {
        await sendText(phone, 'Please upar list se ek service choose karein.');
        return;
      }
      session.data.service = SERVICES[chosen];

      if (chosen === 'ac') {
        session.step = 'ac_photo_choice';
        await sendButtons(
          phone,
          `Great! Aapne *${SERVICES[chosen]}* select kiya hai. ✅\n\nAC ki photo kaise share karna chahenge?`,
          [
            { id: 'ac_photo_send', title: '📷 Photo Bhejein' },
            { id: 'ac_photo_skip', title: '🧑‍🔧 Technician Lega' },
          ]
        );
        break;
      }

      session.step = 'ask_name';
      await sendText(
        phone,
        `Great! Aapne *${SERVICES[chosen]}* select kiya hai. ✅\n\nAapka pura naam kya hai?`
      );
      break;
    }

    case 'ac_photo_choice': {
      if (buttonId === 'ac_photo_send') {
        session.step = 'ac_photo_upload';
        await sendText(
          phone,
          'Please AC ki photo bhejein — camera se click karke ya gallery se select karke 📷 (neeche 📎 attachment icon dabayein).'
        );
      } else if (buttonId === 'ac_photo_skip') {
        session.data.acPhotoPath = null;
        session.step = 'ask_name';
        await sendText(
          phone,
          'Theek hai, technician khud AC dekh kar photo lenge. 👍\n\nAapka pura naam kya hai?'
        );
      } else {
        await sendText(phone, 'Please upar diye gaye button mein se ek choose karein.');
      }
      break;
    }

    case 'ac_photo_upload': {
      const image = message.image;
      if (!image || !image.id) {
        await sendText(phone, 'Please AC ki photo bhejein (camera ya gallery se) 📷.');
        return;
      }

      const media = await downloadMedia(image.id);
      if (media) {
        session.data.acPhotoPath = saveImageBuffer(media.buffer, media.mimeType);
      } else {
        logger.warn(`Failed to download AC photo for ${phone}`);
      }

      session.step = 'ask_name';
      await sendText(phone, 'Photo mil gayi! ✅\n\nAapka pura naam kya hai?');
      break;
    }

    case 'ask_name': {
      const isValidName = text && text.length >= 3 && !/^(ok|okay|hi|hello|yes|no|ji|haan|thik hai|theek hai)$/i.test(text.trim());

      if (!isValidName) {
        await sendText(phone, 'Please apna *pura naam* type karein (jaise: Ahmed Khan).');
        return;
      }
      session.data.customerName = text;
      session.step = 'ask_location';
      await sendLocationRequest(
        phone,
        `Shukriya, ${text}! 🙏\n\nAb neeche button dabakar apni live location share karein, taaki hamari team sahi jagah pahunch sake.`
      );
      break;
    }

    case 'ask_location': {
      if (location && location.latitude && location.longitude) {
        const mapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
        session.data.location = location.address || location.name || `Pin location: ${mapsLink}`;
        session.data.locationMapsLink = mapsLink;
      } else {
        await sendText(
          phone,
          'Please upar diye gaye *"Send Location"* button ko dabakar apni live location share karein.\n\nYe zaroori hai taaki hamari team sahi jagah pahunch sake.'
