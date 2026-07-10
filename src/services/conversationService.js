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
          description: 'Repair, gas refill,
