const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const DB_PATH = path.join(__dirname, '..', '..', 'bookings.json');

function readBookings() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    logger.error('Error reading bookings.json:', err);
    return [];
  }
}

function writeBookings(bookings) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(bookings, null, 2));
  } catch (err) {
    logger.error('Error writing bookings.json:', err);
  }
}

function generateBookingId() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `UP-${Date.now().toString().slice(-6)}${random}`;
}

function createBooking({ customerPhone, customerName, service, location, preferredDatetime }) {
  const bookings = readBookings();
  const bookingId = generateBookingId();

  bookings.push({
    booking_id: bookingId,
    customer_phone: customerPhone,
    customer_name: customerName,
    service,
    location,
    preferred_datetime: preferredDatetime,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  writeBookings(bookings);
  return bookingId;
}

function getBooking(bookingId) {
  const bookings = readBookings();
  return bookings.find((b) => b.booking_id === bookingId);
}

function listRecentBookings(limit = 20) {
  const bookings = readBookings();
  return bookings.slice(-limit).reverse();
}

module.exports = {
  createBooking,
  getBooking,
  listRecentBookings,
};
