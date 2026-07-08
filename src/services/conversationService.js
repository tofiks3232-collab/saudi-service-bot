const { sendText, sendButtons, sendLocationRequest, sendList } = require('./whatsappService');
const { createBooking } = require('../database/db');
const { assignServiceProvider } = require('./serviceProviders');
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

function buildTimeSlots() {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const rows = [];
  const today = new Date();

  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[d.getDay()];
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;

    rows.push({
      id: `slot_${i}_morning`,
      title: `${label} Morning`,
      description: `${dateStr} • 9:00 AM - 12:00 PM`,
    });
    rows.push({
      id: `slot_${i}_evening`,
      title: `${label} Evening`,
      description: `${dateStr} • 4:00 PM - 7:00 PM`,
    });
  }

  return rows;
}

async function startFlow(phone) {
  resetSession(phone);
  const session = getSession(phone);
  session.step = 'choose_service';

  await sendText(
    phone,
    `*Urban Pronto* 🏠\n_Trusted home services, on demand_\n\n` +
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
      } else if (text) {
        session.data.location = text;
      } else {
        await sendText(phone, 'Please upar diye gaye "Send Location" button se apni location share karein, ya address type karein.');
        return;
      }

      session.step = 'ask_datetime';
      const rows = buildTimeSlots();
      await sendList(
        phone,
        'Location mil gayi! ✅\n\nAb neeche se apna preferred time slot choose karein:',
        'Slot Choose Karein',
        [{ title: 'Available Slots', rows }]
      );
      break;
    }

    case 'ask_datetime': {
      if (listReplyId && listReplyId.startsWith('slot_')) {
        const desc = message.interactive?.list_reply?.description || '';
        session.data.preferredDatetime = `${listReplyTitle} (${desc})`.trim();
      } else if (text) {
        session.data.preferredDatetime = text;
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
        const bookingId = createBooking({
          customerPhone: phone,
          customerName: session.data.customerName,
          service: session.data.service,
          location: session.data.location,
          preferredDatetime: session.data.preferredDatetime,
        });

        await sendText(
          phone,
          `*Booking Confirm ho gayi!* 🎉\n\n` +
            `Booking ID: *${bookingId}*\n\n` +
            `Hamari team jald aapse contact karegi. Shukriya *Urban Pronto* choose karne ke liye! 🙏`
        );

        await notifyAdmin(bookingId, session.data, phone);

        const provider = assignServiceProvider();
        const serviceName = session.data.service;

        setTimeout(async () => {
          await sendText(
            phone,
            `👷 *Technician Assigned*\n\n` +
              `Aapki ${serviceName} service ke liye:\n\n` +
              `*Naam:* ${provider.name}\n` +
              `*Phone:* ${provider.phone}\n` +
              `*Rating:* ⭐ ${provider.rating}/5\n\n` +
              `Wo tay time par aapke location par pahunchenge.`
          );

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

  let msg = `🔔 *Nayi Booking!*\n\n` +
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

async function notifyAdminRating(customerPhone, stars) {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) return;
  await sendText(adminNumber, `⭐ *Naya Rating Mila!*\n\nCustomer: ${customerPhone}\nRating: ${stars}/5`);
}

module.exports = {
  handleIncomingMessage,
};
