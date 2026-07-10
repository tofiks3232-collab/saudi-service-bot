const { sendText, sendButtons, sendLocationRequest, sendList, sendImageButton } = require('./whatsappService');
const { createBooking } = require('../database/db');
const { getAllProviders, getProviderById } = require('./serviceProviders');
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

// Sends each technician as its own image+button "card" so the customer can
// simply tap "Select ✅" under the one they want. WhatsApp doesn't support
// photos inside list messages, so separate cards is the cleanest option.
async function sendTechnicianCards(phone) {
  const providers = getAllProviders();

  await sendText(phone, '👷 *Available Technicians*\n\nNeeche diye gaye technicians mein se apna pasandida choose karein:');

  for (const provider of providers) {
    const bodyText =
      `*${provider.name}*\n` +
      `⭐ Rating: ${provider.rating}/5`;

    await sendImageButton(
      phone,
      provider.photo,
      bodyText,
      `select_${provider.id}`,
      'Select ✅'
    );
  }
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
      session.step = 'ask_name';
      await sendText(
        phone,
        `Great! Aapne *${SERVICES[chosen]}* select kiya hai. ✅\n\nAapka pura naam kya hai?`
      );
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
        );
        return;
      }

      session.step = 'ask_date';
      const dateRows = buildDateOptions();
      await sendList(
        phone,
        'Location mil gayi! ✅\n\nAb apni preferred date choose karein 📅:',
        'Date Choose Karein',
        [{ title: 'Available Dates', rows: dateRows }]
      );
      break;
    }

    case 'ask_date': {
      if (!listReplyId || !listReplyId.startsWith('date_')) {
        await sendText(phone, 'Please upar list se ek date choose karein.');
        return;
      }

      const desc = message.interactive?.list_reply?.description || '';
      session.data.preferredDate = `${listReplyTitle}, ${desc}`.trim();

      session.step = 'ask_datetime';
      const timeRows = buildTimeSlotsForDate();
      await sendList(
        phone,
        `Date select ho gayi! ✅ (*${session.data.preferredDate}*)\n\nAb apna preferred time slot choose karein 🕒:`,
        'Time Choose Karein',
        [{ title: 'Available Times', rows: timeRows }]
      );
      break;
    }

    case 'ask_datetime': {
      if (listReplyId && listReplyId.startsWith('time_')) {
        const desc = message.interactive?.list_reply?.description || '';
        session.data.preferredDatetime = `${session.data.preferredDate}, ${listReplyTitle} (${desc})`.trim();
      } else {
        await sendText(phone, 'Please upar list se ek time slot choose karein.');
        return;
      }

      session.step = 'confirm';

      let locationLine = `📍 *Location:* ${session.data.location}`;
      if (session.data.locationMapsLink) {
        locationLine += `\n🗺️ ${session.data.locationMapsLink}`;
      }

      const summary = `*Booking Summary* 📋\n\n` +
        `🔧 *Service:* ${session.data.service}\n` +
        `👤 *Naam:* ${session.data.customerName}\n` +
        `${locationLine}\n` +
        `🕒 *Time:* ${session.data.preferredDatetime}\n\n` +
        `Confirm karein?`;

      await sendButtons(phone, summary, [
        { id: 'confirm_yes', title: 'Confirm ✅' },
        { id: 'confirm_no', title: 'Cancel ❌' },
      ]);
      break;
    }

    case 'confirm': {
      if (buttonId === 'confirm_yes') {
        session.step = 'choose_technician';
        await sendTechnicianCards(phone);
      } else if (buttonId === 'confirm_no') {
        await sendText(phone, 'Booking cancel kar di gayi. Naya booking start karne ke liye "Hi" bhejein.');
        resetSession(phone);
      } else {
        await sendText(phone, 'Please Confirm ya Cancel button dabayein.');
      }
      break;
    }

    case 'choose_technician': {
      if (!buttonId || !buttonId.startsWith('select_')) {
        await sendText(phone, 'Please upar diye gaye technicians mein se ek "Select ✅" button dabakar choose karein.');
        return;
      }

      const techId = buttonId.replace('select_', '');
      const provider = getProviderById(techId);

      if (!provider) {
        await sendText(phone, 'Ye technician available nahi hai. Please dobara select karein.');
        return;
      }

      const bookingId = createBooking({
        customerPhone: phone,
        customerName: session.data.customerName,
        service: session.data.service,
        location: session.data.location,
        preferredDatetime: session.data.preferredDatetime,
        technicianName: provider.name,
        technicianPhone: provider.phone,
      });

      await sendText(
        phone,
        `*Booking Confirm ho gayi!* 🎉\n\n` +
          `Booking ID: *${bookingId}*\n\n` +
          `👷 *Technician:* ${provider.name}\n` +
          `📞 *Phone:* ${provider.phone}\n` +
          `⭐ *Rating:* ${provider.rating}/5\n\n` +
          `Wo tay time par aapke location par pahunchenge.\n\n` +
          `Hamari team jald aapse contact karegi. Shukriya *Khidmora* choose karne ke liye! 🙏`
      );

      await notifyAdmin(bookingId, session.data, phone, provider);

      const serviceName = session.data.service;

      setTimeout(async () => {
        await sendList(
          phone,
          'Service complete hone ke baad, hamare experience ko rate karein:',
          'Rating Dein',
          [{
            title: 'Rate Our Service',
            rows: [
              { id: 'rate_1', title: '⭐ 1 - Poor' },
              { id: 'rate_2', title: '⭐⭐ 2 - Fair' },
              { id: 'rate_3', title: '⭐⭐⭐ 3 - Good' },
              { id: 'rate_4', title: '⭐⭐⭐⭐ 4 - Very Good' },
              { id: 'rate_5', title: '⭐⭐⭐⭐⭐ 5 - Excellent' },
            ],
          }]
        );
      }, 5 * 60 * 1000);

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

  let msg = `🔔 *Nayi Booking!*\n\n` +
    `ID: ${bookingId}\n` +
    `Service: ${data.service}\n` +
    `Naam: ${data.customerName}\n` +
    `Location: ${data.location}\n`;

  if (data.locationMapsLink) {
    msg += `Map: ${data.locationMapsLink}\n`;
  }

  msg += `Time: ${data.preferredDatetime}\n` +
    `Technician: ${provider.name} (${provider.phone})\n` +
    `Customer Phone: ${customerPhone}`;

  await sendText(adminNumber, msg);
}

async function notifyAdminRating(customerPhone, stars) {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) return;
  await sendText(adminNumber, `⭐ *Naya Rating Mila!*\n\nCustomer: ${customerPhone}\nRating: ${stars}/5`);
}

module.exports = {
  handleIncomingMessage,
};
