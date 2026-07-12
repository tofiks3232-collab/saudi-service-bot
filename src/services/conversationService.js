const { sendText, sendButtons, sendLocationRequest, sendList, downloadMedia } = require('./whatsappService');
const { createBooking } = require('../database/db');
const { saveImageBuffer } = require('../utils/mediaStorage');
const { t, getDayNames, getMonthNames, getTodayLabel, getTomorrowLabel } = require('../utils/translations');
const logger = require('../utils/logger');

const sessions = new Map();
const pendingRatingTimers = new Map();
const phoneLanguages = new Map();

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

function buildDateOptions(lang) {
  const dayNames = getDayNames(lang);
  const monthNames = getMonthNames(lang);
  const rows = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const label = i === 0 ? getTodayLabel(lang) : i === 1 ? getTomorrowLabel(lang) : dayNames[d.getDay()];
    const dateStr = `${d.getDate()} ${monthNames[d.getMonth()]}`;

    rows.push({
      id: `date_${i}`,
      title: `${label}`,
      description: dateStr,
    });
  }

  return rows;
}

function buildTimeSlotsForDate(lang) {
  return [
    { id: 'time_morning', title: t(lang, 'timeMorningTitle'), description: t(lang, 'timeMorningDesc') },
    { id: 'time_afternoon', title: t(lang, 'timeAfternoonTitle'), description: t(lang, 'timeAfternoonDesc') },
    { id: 'time_evening', title: t(lang, 'timeEveningTitle'), description: t(lang, 'timeEveningDesc') },
    { id: 'time_night', title: t(lang, 'timeNightTitle'), description: t(lang, 'timeNightDesc') },
  ];
}
// Looks up the customer's most recent active booking and lets them cancel
// or reschedule it. Triggered by typing "cancel", "reschedule", etc. from
// anywhere in the conversation.
async function showBookingActions(phone) {
  const booking = getLatestBookingByPhone(phone);

  if (!booking || booking.status === 'cancelled' || booking.status === 'completed') {
    await sendText(
      phone,
      'Aapki koi active booking nahi mili. 🤔\n\nNayi booking karne ke liye "Hi" bhejein.'
    );
    return;
  }

  const session = getSession(phone);
  session.step = 'booking_actions';
  session.data.activeBookingId = booking.booking_id;

  const summary = `*Aapki Booking* 📋\n\n` +
    `ID: ${booking.booking_id}\n` +
    `Service: ${booking.service}\n` +
    `Time: ${booking.preferred_datetime}\n` +
    `Status: ${booking.status}\n\n` +
    `Kya karna chahenge?`;

  await sendButtons(phone, summary, [
    { id: 'booking_cancel', title: '❌ Cancel Karein' },
    { id: 'booking_reschedule', title: '🔄 Reschedule Karein' },
  ]);
}

async function startFlow(phone) {
  resetSession(phone);
  const session = getSession(phone);
  session.step = 'choose_language';

  await sendButtons(
    phone,
    '🌐 Please choose your language / कृपया अपनी भाषा चुनें / يرجى اختيار لغتك',
    [
      { id: 'lang_en', title: 'English' },
      { id: 'lang_hi', title: 'हिन्दी' },
      { id: 'lang_ar', title: 'العربية' },
    ]
  );
}

async function startServiceFlow(phone, lang) {
  const session = getSession(phone);
  session.step = 'choose_service';

  await sendText(phone, t(lang, 'welcomeIntro'));

  await sendList(
    phone,
    t(lang, 'listPrompt'),
    t(lang, 'listButton'),
    [{
      title: t(lang, 'listButton'),
      rows: [
        { id: 'svc_cleaning', title: t(lang, 'svcCleaningTitle'), description: t(lang, 'svcCleaningDesc') },
        { id: 'svc_ac', title: t(lang, 'svcAcTitle'), description: t(lang, 'svcAcDesc') },
        { id: 'svc_plumber', title: t(lang, 'svcPlumberTitle'), description: t(lang, 'svcPlumberDesc') },
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
    const ratingLang = phoneLanguages.get(phone) || 'en';
    await sendText(phone, t(ratingLang, 'ratingThanks', { stars }));
    await notifyAdminRating(phone, stars);
    return;
  }
  }

  if (text && /^(hi|hello|start|hi bot|salam)$/i.test(text)) {
    await startFlow(phone);
    return;
  }

  if (text && /^(cancel|reschedule|my booking|mera booking|booking status)$/i.test(text)) {
    await showBookingActions(phone);
    return;
  }

  switch (session.step) {
    case 'new':
      await startFlow(phone);
      break;

    case 'choose_language': {
      const langMap = { lang_en: 'en', lang_hi: 'hi', lang_ar: 'ar' };
      const lang = langMap[buttonId];
      if (!lang) {
        await sendText(phone, 'Please choose a language / भाषा चुनें / اختر لغة.');
        return;
      }
      session.data.language = lang;
      phoneLanguages.set(phone, lang);
      await startServiceFlow(phone, lang);
      break;
    }

    case 'choose_service': {
      const lang = session.data.language || 'en';
      const map = { svc_cleaning: 'cleaning', svc_ac: 'ac', svc_plumber: 'plumber' };
      const chosenId = buttonId || listReplyId;
      const chosen = map[chosenId];
      if (!chosen) {
        await sendText(phone, t(lang, 'chooseButtonPrompt'));
        return;
      }
      session.data.service = SERVICES[chosen];

      if (chosen === 'ac') {
        session.step = 'ac_photo_choice';
        await sendButtons(
          phone,
          t(lang, 'acPhotoChoicePrompt', { service: SERVICES[chosen] }),
          [
            { id: 'ac_photo_send', title: t(lang, 'acPhotoSendBtn') },
            { id: 'ac_photo_skip', title: t(lang, 'acPhotoSkipBtn') },
          ]
        );
        break;
      }

      session.step = 'ask_name';
      await sendText(phone, t(lang, 'serviceSelected', { service: SERVICES[chosen] }));
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
      const lang = session.data.language || 'en';
      if (buttonId === 'ac_photo_send') {
        session.step = 'ac_photo_upload';
        await sendText(phone, t(lang, 'acPhotoSendPrompt'));
      } else if (buttonId === 'ac_photo_skip') {
        session.data.acPhotoPath = null;
        session.step = 'ask_name';
        await sendText(phone, t(lang, 'acPhotoSkipConfirm'));
      } else {
        await sendText(phone, t(lang, 'chooseButtonPrompt'));
      }
      break;
    }

    case 'ac_photo_upload': {
      const lang = session.data.language || 'en';
      const image = message.image;
      if (!image || !image.id) {
        await sendText(phone, t(lang, 'acPhotoInvalid'));
        return;
      }

      const media = await downloadMedia(image.id);
      if (media) {
        session.data.acPhotoPath = saveImageBuffer(media.buffer, media.mimeType);
      } else {
        logger.warn(`Failed to download AC photo for ${phone}`);
      }

      session.step = 'ask_name';
      await sendText(phone, t(lang, 'acPhotoReceivedConfirm'));
      break;
    }
    case 'ask_name': {
      const lang = session.data.language || 'en';
      const isValidName = text && text.length >= 3 && !/^(ok|okay|hi|hello|yes|no|ji|haan|thik hai|theek hai)$/i.test(text.trim());

      if (!isValidName) {
        await sendText(phone, t(lang, 'nameInvalid'));
        return;
      }
      session.data.customerName = text;
      session.step = 'ask_location';
      await sendLocationRequest(phone, t(lang, 'locationRequestPrompt', { name: text }));
      break;
    }

    case 'ask_location': {
      const lang = session.data.language || 'en';
      if (location && location.latitude && location.longitude) {
        const mapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
        session.data.location = location.address || location.name || `Pin location: ${mapsLink}`;
        session.data.locationMapsLink = mapsLink;
      } else {
        await sendText(phone, t(lang, 'locationInvalid'));
        return;
      }

      session.step = 'ask_urgency';
      await sendButtons(
        phone,
        t(lang, 'urgencyPrompt'),
        [
          { id: 'urgent_yes', title: t(lang, 'urgencyUrgentBtn', { surcharge: URGENT_SURCHARGE }) },
          { id: 'urgent_no', title: t(lang, 'urgencyNormalBtn') },
        ]
      );
      break;
    }

  case 'ask_urgency': {
      const lang = session.data.language || 'en';
      if (buttonId === 'urgent_yes') {
        session.data.isUrgent = true;
        session.data.preferredDatetime = 'URGENT — ASAP';
        session.step = 'confirm';

        let locationLine = `${t(lang, 'labelLocation')} ${session.data.location}`;
        if (session.data.locationMapsLink) {
          locationLine += `\n🗺️ ${session.data.locationMapsLink}`;
        }

        const summary = `${t(lang, 'bookingSummaryTitle')}\n\n` +
          `${t(lang, 'labelService')} ${session.data.service}\n` +
          `${t(lang, 'labelName')} ${session.data.customerName}\n` +
          `${locationLine}\n` +
          `${t(lang, 'labelUrgent')} ${t(lang, 'urgentYesLabel', { surcharge: URGENT_SURCHARGE })}\n` +
          `${t(lang, 'labelTime')} ${session.data.preferredDatetime}\n\n` +
          `${t(lang, 'confirmQuestion')}`;

        await sendButtons(phone, summary, [
          { id: 'confirm_yes', title: t(lang, 'confirmYesBtn') },
          { id: 'confirm_no', title: t(lang, 'confirmNoBtn') },
        ]);
      } else if (buttonId === 'urgent_no') {
        session.data.isUrgent = false;
        session.step = 'ask_date';
        const dateRows = buildDateOptions(lang);
        await sendList(
          phone,
          t(lang, 'dateListPrompt'),
          t(lang, 'dateListButton'),
          [{ title: t(lang, 'dateListButton'), rows: dateRows }]
        );
      } else {
        await sendText(phone, t(lang, 'chooseButtonPrompt'));
      }
      break;
    }

    case 'ask_date': {
      const lang = session.data.language || 'en';
      if (!listReplyId || !listReplyId.startsWith('date_')) {
        await sendText(phone, t(lang, 'chooseButtonPrompt'));
        return;
      }

      const desc = message.interactive?.list_reply?.description || '';
      session.data.preferredDate = `${listReplyTitle}, ${desc}`.trim();

      session.step = 'ask_datetime';
      const timeRows = buildTimeSlotsForDate(lang);
      await sendList(
        phone,
        t(lang, 'timeListPrompt', { date: session.data.preferredDate }),
        t(lang, 'timeListButton'),
        [{ title: t(lang, 'timeListButton'), rows: timeRows }]
      );
      break;
    }

    case 'ask_datetime': {
      const lang = session.data.language || 'en';
      if (listReplyId && listReplyId.startsWith('time_')) {
        const desc = message.interactive?.list_reply?.description || '';
        session.data.preferredDatetime = `${session.data.preferredDate}, ${listReplyTitle} (${desc})`.trim();
      } else {
        await sendText(phone, t(lang, 'chooseButtonPrompt'));
        return;
      }

      session.step = 'confirm';

      let locationLine = `${t(lang, 'labelLocation')} ${session.data.location}`;
      if (session.data.locationMapsLink) {
        locationLine += `\n🗺️ ${session.data.locationMapsLink}`;
      }

      const summary = `${t(lang, 'bookingSummaryTitle')}\n\n` +
        `${t(lang, 'labelService')} ${session.data.service}\n` +
        `${t(lang, 'labelName')} ${session.data.customerName}\n` +
        `${locationLine}\n` +
        `${t(lang, 'labelTime')} ${session.data.preferredDatetime}\n\n` +
        `${t(lang, 'confirmQuestion')}`;

      await sendButtons(phone, summary, [
        { id: 'confirm_yes', title: t(lang, 'confirmYesBtn') },
        { id: 'confirm_no', title: t(lang, 'confirmNoBtn') },
      ]);
      break;
    }
    case 'confirm': {
      const lang = session.data.language || 'en';
      if (buttonId === 'confirm_yes') {
        const bookingId = createBooking({
          customerPhone: phone,
          customerName: session.data.customerName,
          service: session.data.service,
          location: session.data.location,
          preferredDatetime: session.data.preferredDatetime,
          acPhotoPath: session.data.acPhotoPath || null,
          isUrgent: session.data.isUrgent || false,
        });

        await sendText(phone, t(lang, 'bookingConfirmed', { bookingId }));

        await notifyAdmin(bookingId, session.data, phone);

        if (pendingRatingTimers.has(phone)) {
          clearTimeout(pendingRatingTimers.get(phone));
        }

        const ratingTimer = setTimeout(async () => {
          pendingRatingTimers.delete(phone);
          await sendList(
            phone,
            t(lang, 'ratingPrompt'),
            t(lang, 'ratingListButton'),
            [{
              title: t(lang, 'ratingListButton'),
              rows: [
                { id: 'rate_1', title: t(lang, 'rating1') },
                { id: 'rate_2', title: t(lang, 'rating2') },
                { id: 'rate_3', title: t(lang, 'rating3') },
                { id: 'rate_4', title: t(lang, 'rating4') },
                { id: 'rate_5', title: t(lang, 'rating5') },
              ],
            }]
          );
        }, 5 * 60 * 1000);

        pendingRatingTimers.set(phone, ratingTimer);

        resetSession(phone);
      } else if (buttonId === 'confirm_no') {
        await sendText(phone, t(lang, 'bookingCancelled'));
        resetSession(phone);
      } else {
        await sendText(phone, t(lang, 'confirmButtonPrompt'));
      }
      break;
    }
    case 'booking_actions': {
      const activeBookingId = session.data.activeBookingId;

      if (buttonId === 'booking_cancel') {
        updateBookingStatus(activeBookingId, 'cancelled');
        await sendText(
          phone,
          `Aapki booking *${activeBookingId}* cancel kar di gayi hai. ❌\n\nNayi booking karne ke liye "Hi" bhejein.`
        );
        await notifyAdminCancellation(activeBookingId, phone);
        resetSession(phone);
      } else if (buttonId === 'booking_reschedule') {
        session.step = 'reschedule_pick_date';
        const dateRows = buildDateOptions();
        await sendList(
          phone,
          'Nayi date choose karein 📅:',
          'Date Choose Karein',
          [{ title: 'Available Dates', rows: dateRows }]
        );
      } else {
        await sendText(phone, 'Please upar diye gaye button mein se ek choose karein.');
      }
      break;
    }

    case 'reschedule_pick_date': {
      if (!listReplyId || !listReplyId.startsWith('date_')) {
        await sendText(phone, 'Please upar list se ek date choose karein.');
        return;
      }

      const desc = message.interactive?.list_reply?.description || '';
      session.data.rescheduleDate = `${listReplyTitle}, ${desc}`.trim();

      session.step = 'reschedule_pick_time';
      const timeRows = buildTimeSlotsForDate();
      await sendList(
        phone,
        `Date select ho gayi! ✅ (*${session.data.rescheduleDate}*)\n\nAb naya time slot choose karein 🕒:`,
        'Time Choose Karein',
        [{ title: 'Available Times', rows: timeRows }]
      );
      break;
    }

    case 'reschedule_pick_time': {
      if (!listReplyId || !listReplyId.startsWith('time_')) {
        await sendText(phone, 'Please upar list se ek time slot choose karein.');
        return;
      }

      const desc = message.interactive?.list_reply?.description || '';
      const newDatetime = `${session.data.rescheduleDate}, ${listReplyTitle} (${desc})`.trim();
      const activeBookingId = session.data.activeBookingId;

      updateBookingDatetime(activeBookingId, newDatetime);

      await sendText(
        phone,
        `Aapki booking *${activeBookingId}* reschedule ho gayi! ✅\n\nNaya time: *${newDatetime}*`
      );
      await notifyAdminReschedule(activeBookingId, phone, newDatetime);

      resetSession(phone);
      break;
    }

    default:
      await startFlow(phone);
  }
}

async function notifyAdmin(bookingId, data, customerPhone, provider) {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) {
    logger.warn('ADMIN_WHATSAPP_NUMBER not set, skipping admin notification');
    return;
  }

  let msg = data.isUrgent
    ? `🚨🚨 *URGENT BOOKING!* 🚨🚨\n\n`
    : `🔔 *Nayi Booking!*\n\n`;

  msg += `ID: ${bookingId}\n` +
    `Service: ${data.service}\n` +
    `Naam: ${data.customerName}\n` +
    `Location: ${data.location}\n`;

  if (data.locationMapsLink) {
    msg += `Map: ${data.locationMapsLink}\n`;
  }

  msg += `Time: ${data.preferredDatetime}\n` +
    `Technician: ${provider.name} (${provider.phone})\n` +
    `Customer Phone: ${customerPhone}`;

  if (data.isUrgent) {
    msg += `\nUrgent Surcharge: +${URGENT_SURCHARGE} SAR`;
  }

  if (data.acPhotoPath) {
    const baseUrl = process.env.PUBLIC_BASE_URL || '';
    msg += `\nAC Photo: ${baseUrl}${data.acPhotoPath}`;
  }

  await sendText(adminNumber, msg);
}

async function notifyAdminRating(customerPhone, stars) {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) return;
  await sendText(adminNumber, `⭐ *Naya Rating Mila!*\n\nCustomer: ${customerPhone}\nRating: ${stars}/5`);
}

async function notifyAdminCancellation(bookingId, customerPhone) {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) return;
  await sendText(
    adminNumber,
    `❌ *Booking Cancel Hui!*\n\nID: ${bookingId}\nCustomer Phone: ${customerPhone}`
  );
}

async function notifyAdminReschedule(bookingId, customerPhone, newDatetime) {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) return;
  await sendText(
    adminNumber,
    `🔄 *Booking Reschedule Hui!*\n\nID: ${bookingId}\nCustomer Phone: ${customerPhone}\nNaya Time: ${newDatetime}`
  );
}

module.exports = {
  handleIncomingMessage,
};
