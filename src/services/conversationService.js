const { sendText, sendButtons, sendLocationRequest, sendList, downloadMedia } = require('./whatsappService');
const { createBooking, getLatestBookingByPhone, updateBookingStatus, updateBookingDatetime } = require('../database/db');
const { assignServiceProvider } = require('./serviceProviders');
const { saveImageBuffer } = require('../utils/mediaStorage');
const { t } = require('../i18n/translations');
const logger = require('../utils/logger');

const sessions = new Map();
const pendingRatingTimers = new Map();
// Remembers which language a "rate your experience" reminder was sent in,
// so the "thank you" reply matches it even if the customer started a fresh
// (re-reset) conversation in between and session.data.lang moved on.
const ratingLangs = new Map();

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
  const rows = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const label = i === 0 ? t(lang, 'today_label') : i === 1 ? t(lang, 'tomorrow_label') : t(lang, `day_${d.getDay()}`);
    const dateStr = `${d.getDate()} ${t(lang, `month_${d.getMonth()}`)}`;

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
    { id: 'time_morning', title: t(lang, 'time_morning'), description: t(lang, 'time_morning_desc') },
    { id: 'time_afternoon', title: t(lang, 'time_afternoon'), description: t(lang, 'time_afternoon_desc') },
    { id: 'time_evening', title: t(lang, 'time_evening'), description: t(lang, 'time_evening_desc') },
    { id: 'time_night', title: t(lang, 'time_night'), description: t(lang, 'time_night_desc') },
  ];
}

// Every fresh conversation starts here — language is asked EVERY time and is
// never saved, per product decision (no DB persistence for language).
async function askLanguage(phone) {
  resetSession(phone);
  const session = getSession(phone);
  session.step = 'choose_language';

  await sendList(
    phone,
    '🌐 *Khidmora*\n\nPlease choose your language / कृपया अपनी भाषा चुनें / يرجى اختيار لغتك',
    'Choose Language',
    [{
      title: 'Languages',
      rows: [
        { id: 'lang_ar', title: '🇸🇦 العربية', description: 'Arabic' },
        { id: 'lang_hi', title: '🇮🇳 हिन्दी', description: 'Hindi' },
        { id: 'lang_en', title: '🇬🇧 English', description: 'English' },
      ],
    }]
  );
}

async function startFlow(phone) {
  const session = getSession(phone);
  const lang = session.data.lang;
  session.step = 'choose_service';

  await sendText(phone, t(lang, 'welcome'));

  await sendList(
    phone,
    t(lang, 'choose_service_prompt'),
    t(lang, 'services_button'),
    [{
      title: t(lang, 'services_section'),
      rows: [
        {
          id: 'svc_cleaning',
          title: t(lang, 'svc_cleaning_title'),
          description: t(lang, 'svc_cleaning_desc'),
        },
        {
          id: 'svc_ac',
          title: t(lang, 'svc_ac_title'),
          description: t(lang, 'svc_ac_desc'),
        },
        {
          id: 'svc_plumber',
          title: t(lang, 'svc_plumber_title'),
          description: t(lang, 'svc_plumber_desc'),
        },
      ],
    }]
  );
}

// Looks up the customer's most recent active booking and lets them cancel
// or reschedule it. Triggered by typing "cancel", "reschedule", etc. from
// anywhere in the conversation (once a language has been picked).
async function showBookingActions(phone) {
  const session = getSession(phone);
  const lang = session.data.lang || 'en';
  const booking = getLatestBookingByPhone(phone);

  if (!booking || booking.status === 'cancelled' || booking.status === 'completed') {
    await sendText(phone, t(lang, 'no_active_booking'));
    return;
  }

  session.step = 'booking_actions';
  session.data.activeBookingId = booking.booking_id;

  const statusLabel = t(lang, `status_${booking.status}`);

  const summary = `${t(lang, 'booking_actions_title')}\n\n` +
    `${t(lang, 'booking_actions_id', { bookingId: booking.booking_id })}\n` +
    `${t(lang, 'booking_actions_service', { service: booking.service })}\n` +
    `${t(lang, 'booking_actions_time', { time: booking.preferred_datetime })}\n` +
    `${t(lang, 'booking_actions_status', { status: statusLabel })}\n\n` +
    `${t(lang, 'booking_actions_prompt')}`;

  await sendButtons(phone, summary, [
    { id: 'booking_cancel', title: t(lang, 'booking_cancel_btn') },
    { id: 'booking_reschedule', title: t(lang, 'booking_reschedule_btn') },
  ]);
}

async function handleIncomingMessage(phone, message) {
  const session = getSession(phone);
  const text = message.text?.body?.trim();
  const buttonId = message.interactive?.button_reply?.id;
  const listReplyId = message.interactive?.list_reply?.id;
  const listReplyTitle = message.interactive?.list_reply?.title;
  const location = message.location;
  const lang = session.data.lang || 'en';

  if (listReplyId && listReplyId.startsWith('rate_')) {
    const stars = listReplyId.split('_')[1];
    const ratingLang = ratingLangs.get(phone) || lang;
    await sendText(phone, t(ratingLang, 'rating_thanks', { stars }));
    await notifyAdminRating(phone, stars);
    ratingLangs.delete(phone);
    return;
  }

  // Any brand-new conversation ALWAYS starts with language selection,
  // regardless of what the customer's first message says.
  if (session.step === 'new') {
    await askLanguage(phone);
    return;
  }

  // Typing "Hi" again mid-flow restarts everything, including asking the
  // language again — language is intentionally never remembered.
  if (text && /^(hi|hello|start|hi bot|salam)$/i.test(text)) {
    await askLanguage(phone);
    return;
  }

  if (session.data.lang && text && /^(cancel|reschedule|my booking|mera booking|booking status)$/i.test(text)) {
    await showBookingActions(phone);
    return;
  }

  switch (session.step) {
    case 'choose_language': {
      const map = { lang_ar: 'ar', lang_hi: 'hi', lang_en: 'en' };
      const chosenId = buttonId || listReplyId;
      const chosenLang = map[chosenId];

      if (!chosenLang) {
        await sendText(phone, 'Please select a language / कृपया भाषा चुनें / يرجى اختيار اللغة');
        return;
      }

      session.data.lang = chosenLang;
      await startFlow(phone);
      break;
    }

    case 'choose_service': {
      const map = { svc_cleaning: 'cleaning', svc_ac: 'ac', svc_plumber: 'plumber' };
      const chosenId = buttonId || listReplyId;
      const chosen = map[chosenId];
      if (!chosen) {
        await sendText(phone, t(lang, 'choose_service_invalid'));
        return;
      }
      session.data.serviceKey = chosen;
      session.data.service = SERVICES[chosen];
      const serviceName = t(lang, `svc_${chosen}_name`);

      if (chosen === 'ac') {
        session.step = 'ac_photo_choice';
        await sendButtons(
          phone,
          t(lang, 'ac_photo_prompt', { service: serviceName }),
          [
            { id: 'ac_photo_send', title: t(lang, 'ac_photo_send_btn') },
            { id: 'ac_photo_skip', title: t(lang, 'ac_photo_skip_btn') },
          ]
        );
        break;
      }

      session.step = 'ask_name';
      await sendText(phone, t(lang, 'ask_name_prompt', { service: serviceName }));
      break;
    }

    case 'ac_photo_choice': {
      if (buttonId === 'ac_photo_send') {
        session.step = 'ac_photo_upload';
        await sendText(phone, t(lang, 'ac_photo_send_prompt'));
      } else if (buttonId === 'ac_photo_skip') {
        session.data.acPhotoPath = null;
        session.step = 'ask_name';
        await sendText(phone, t(lang, 'ac_photo_skip_confirm'));
      } else {
        await sendText(phone, t(lang, 'ac_photo_choice_invalid'));
      }
      break;
    }

    case 'ac_photo_upload': {
      const image = message.image;
      if (!image || !image.id) {
        await sendText(phone, t(lang, 'ac_photo_upload_invalid'));
        return;
      }

      const media = await downloadMedia(image.id);
      if (media) {
        session.data.acPhotoPath = saveImageBuffer(media.buffer, media.mimeType);
      } else {
        logger.warn(`Failed to download AC photo for ${phone}`);
      }

      session.step = 'ask_name';
      await sendText(phone, t(lang, 'ac_photo_upload_success'));
      break;
    }

    case 'ask_name': {
      const isValidName = text && text.length >= 3 && !/^(ok|okay|hi|hello|yes|no|ji|haan|thik hai|theek hai)$/i.test(text.trim());

      if (!isValidName) {
        await sendText(phone, t(lang, 'ask_name_invalid'));
        return;
      }
      session.data.customerName = text;
      session.step = 'ask_location';
      await sendLocationRequest(phone, t(lang, 'ask_location_prompt', { name: text }));
      break;
    }

    case 'ask_location': {
      // Only a real GPS location counts here - typing any text (even "ok")
      // must NOT be accepted as if location was shared.
      if (location && location.latitude && location.longitude) {
        const mapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
        session.data.location = location.address || location.name || `Pin location: ${mapsLink}`;
        session.data.locationMapsLink = mapsLink;
      } else {
        await sendText(phone, t(lang, 'ask_location_invalid'));
        return;
      }

      session.step = 'ask_urgency';
      await sendButtons(
        phone,
        t(lang, 'ask_urgency_prompt'),
        [
          { id: 'urgent_yes', title: t(lang, 'urgent_btn', { surcharge: URGENT_SURCHARGE }) },
          { id: 'urgent_no', title: t(lang, 'normal_btn') },
        ]
      );
      break;
    }

    case 'ask_urgency': {
      if (buttonId === 'urgent_yes') {
        session.data.isUrgent = true;
        session.data.preferredDatetime = 'URGENT — ASAP (turant)';
        session.step = 'confirm';

        let locationLine = t(lang, 'summary_location', { location: session.data.location });
        if (session.data.locationMapsLink) {
          locationLine += `\n🗺️ ${session.data.locationMapsLink}`;
        }

        const summary = `${t(lang, 'booking_summary_title')}\n\n` +
          `${t(lang, 'summary_service', { service: t(lang, `svc_${session.data.serviceKey}_name`) })}\n` +
          `${t(lang, 'summary_name', { name: session.data.customerName })}\n` +
          `${locationLine}\n` +
          `${t(lang, 'summary_urgent', { surcharge: URGENT_SURCHARGE })}\n` +
          `${t(lang, 'summary_time', { time: session.data.preferredDatetime })}\n\n` +
          `${t(lang, 'summary_confirm_prompt')}`;

        await sendButtons(phone, summary, [
          { id: 'confirm_yes', title: t(lang, 'confirm_btn') },
          { id: 'confirm_no', title: t(lang, 'cancel_btn') },
        ]);
      } else if (buttonId === 'urgent_no') {
        session.data.isUrgent = false;
        session.step = 'ask_date';
        const dateRows = buildDateOptions(lang);
        await sendList(
          phone,
          t(lang, 'ask_date_prompt'),
          t(lang, 'date_list_button'),
          [{ title: t(lang, 'date_list_section'), rows: dateRows }]
        );
      } else {
        await sendText(phone, t(lang, 'ask_urgency_invalid'));
      }
      break;
    }

    case 'ask_date': {
      if (!listReplyId || !listReplyId.startsWith('date_')) {
        await sendText(phone, t(lang, 'ask_date_invalid'));
        return;
      }

      const desc = message.interactive?.list_reply?.description || '';
      session.data.preferredDate = `${listReplyTitle}, ${desc}`.trim();

      session.step = 'ask_datetime';
      const timeRows = buildTimeSlotsForDate(lang);
      await sendList(
        phone,
        t(lang, 'ask_time_prompt', { date: session.data.preferredDate }),
        t(lang, 'time_list_button'),
        [{ title: t(lang, 'time_list_section'), rows: timeRows }]
      );
      break;
    }

    case 'ask_datetime': {
      if (listReplyId && listReplyId.startsWith('time_')) {
        const desc = message.interactive?.list_reply?.description || '';
        session.data.preferredDatetime = `${session.data.preferredDate}, ${listReplyTitle} (${desc})`.trim();
      } else {
        await sendText(phone, t(lang, 'ask_time_invalid'));
        return;
      }

      session.step = 'confirm';

      let locationLine = t(lang, 'summary_location', { location: session.data.location });
      if (session.data.locationMapsLink) {
        locationLine += `\n🗺️ ${session.data.locationMapsLink}`;
      }

      const summary = `${t(lang, 'booking_summary_title')}\n\n` +
        `${t(lang, 'summary_service', { service: t(lang, `svc_${session.data.serviceKey}_name`) })}\n` +
        `${t(lang, 'summary_name', { name: session.data.customerName })}\n` +
        `${locationLine}\n` +
        `${t(lang, 'summary_time', { time: session.data.preferredDatetime })}\n\n` +
        `${t(lang, 'summary_confirm_prompt')}`;

      await sendButtons(phone, summary, [
        { id: 'confirm_yes', title: t(lang, 'confirm_btn') },
        { id: 'confirm_no', title: t(lang, 'cancel_btn') },
      ]);
      break;
    }

    case 'confirm': {
      if (buttonId === 'confirm_yes') {
        const provider = assignServiceProvider();
        const bookingLang = lang;

        const bookingId = createBooking({
          customerPhone: phone,
          customerName: session.data.customerName,
          service: session.data.service,
          location: session.data.location,
          preferredDatetime: session.data.preferredDatetime,
          technicianName: provider.name,
          technicianPhone: provider.phone,
          acPhotoPath: session.data.acPhotoPath || null,
          isUrgent: session.data.isUrgent || false,
        });

        await sendText(
          phone,
          t(lang, 'booking_confirmed', {
            bookingId,
            techName: provider.name,
            techPhone: provider.phone,
            rating: provider.rating,
          })
        );

        await notifyAdmin(bookingId, session.data, phone, provider);

        // Cancel any leftover rating-reminder from a previous test/booking on
        // this same phone number, so old timers can't fire mid-way through a
        // brand-new conversation.
        if (pendingRatingTimers.has(phone)) {
          clearTimeout(pendingRatingTimers.get(phone));
        }

        const ratingTimer = setTimeout(async () => {
          pendingRatingTimers.delete(phone);
          ratingLangs.set(phone, bookingLang);
          await sendList(
            phone,
            t(bookingLang, 'rating_prompt'),
            t(bookingLang, 'rating_list_button'),
            [{
              title: t(bookingLang, 'rating_list_section'),
              rows: [
                { id: 'rate_1', title: t(bookingLang, 'rate_1') },
                { id: 'rate_2', title: t(bookingLang, 'rate_2') },
                { id: 'rate_3', title: t(bookingLang, 'rate_3') },
                { id: 'rate_4', title: t(bookingLang, 'rate_4') },
                { id: 'rate_5', title: t(bookingLang, 'rate_5') },
              ],
            }]
          );
        }, 5 * 60 * 1000);

        pendingRatingTimers.set(phone, ratingTimer);

        resetSession(phone);
      } else if (buttonId === 'confirm_no') {
        await sendText(phone, t(lang, 'booking_cancelled'));
        resetSession(phone);
      } else {
        await sendText(phone, t(lang, 'confirm_invalid'));
      }
      break;
    }

    case 'booking_actions': {
      const activeBookingId = session.data.activeBookingId;

      if (buttonId === 'booking_cancel') {
        updateBookingStatus(activeBookingId, 'cancelled');
        await sendText(phone, t(lang, 'booking_cancelled_confirm', { bookingId: activeBookingId }));
        await notifyAdminCancellation(activeBookingId, phone);
        resetSession(phone);
      } else if (buttonId === 'booking_reschedule') {
        session.step = 'reschedule_pick_date';
        const dateRows = buildDateOptions(lang);
        await sendList(
          phone,
          t(lang, 'reschedule_pick_date_prompt'),
          t(lang, 'date_list_button'),
          [{ title: t(lang, 'date_list_section'), rows: dateRows }]
        );
      } else {
        await sendText(phone, t(lang, 'booking_actions_invalid'));
      }
      break;
    }

    case 'reschedule_pick_date': {
      if (!listReplyId || !listReplyId.startsWith('date_')) {
        await sendText(phone, t(lang, 'ask_date_invalid'));
        return;
      }

      const desc = message.interactive?.list_reply?.description || '';
      session.data.rescheduleDate = `${listReplyTitle}, ${desc}`.trim();

      session.step = 'reschedule_pick_time';
      const timeRows = buildTimeSlotsForDate(lang);
      await sendList(
        phone,
        t(lang, 'reschedule_pick_time_prompt', { date: session.data.rescheduleDate }),
        t(lang, 'time_list_button'),
        [{ title: t(lang, 'time_list_section'), rows: timeRows }]
      );
      break;
    }

    case 'reschedule_pick_time': {
      if (!listReplyId || !listReplyId.startsWith('time_')) {
        await sendText(phone, t(lang, 'ask_time_invalid'));
        return;
      }

      const desc = message.interactive?.list_reply?.description || '';
      const newDatetime = `${session.data.rescheduleDate}, ${listReplyTitle} (${desc})`.trim();
      const activeBookingId = session.data.activeBookingId;

      updateBookingDatetime(activeBookingId, newDatetime);

      await sendText(phone, t(lang, 'reschedule_confirmed', { bookingId: activeBookingId, time: newDatetime }));
      await notifyAdminReschedule(activeBookingId, phone, newDatetime);

      resetSession(phone);
      break;
    }

    default:
      await askLanguage(phone);
  }
}

// --- Admin notifications -----------------------------------------------
// These deliberately stay in Hinglish/English regardless of the customer's
// chosen language — they go to the business owner (ADMIN_WHATSAPP_NUMBER),
// not the customer, so they are NOT run through t().

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
