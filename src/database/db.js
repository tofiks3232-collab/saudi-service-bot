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
function createBooking({
  customerPhone,
  customerName,
  service,
  location,
  preferredDatetime,
  technicianName,
  technicianPhone,
  acPhotoPath,
}) {
  const bookings = readBookings();
  const bookingId = generateBookingId();
  bookings.push({
    booking_id: bookingId,
    customer_phone: customerPhone,
    customer_name: customerName,
    service,
    location,
    preferred_datetime: preferredDatetime,
    technician_name: technicianName || null,
    technician_phone: technicianPhone || null,
    ac_photo_path: acPhotoPath || null,
    status: 'pending',
    created_at: new Date().toISOString(),
  });
  writeBookings(bookings);
  return bookingId;
}
function getBooking(bookingId) {
  return readBookings().find((b) => b.booking_id === bookingId);
}
function listRecentBookings(limit = 20) {
  return readBookings().slice(-limit).reverse();
}
function getLatestBookingByPhone(phone) {
  const matches = readBookings().filter((b) => b.customer_phone === phone);
  return matches.length ? matches[matches.length - 1] : null;
}
function updateBookingStatus(bookingId, status) {
  const bookings = readBookings();
  const booking = bookings.find((b) => b.booking_id === bookingId);
  if (booking) {
    booking.status = status;
    writeBookings(bookings);
  }
  return booking;
}
module.exports = {
  createBooking,
  getBooking,
  listRecentBookings,
  getLatestBookingByPhone,
  updateBookingStatus,
};
