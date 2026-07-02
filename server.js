require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./src/utils/logger');
const webhookRoutes = require('./src/routes/webhook');
const { listRecentBookings } = require('./src/database/db');

const app = express();
app.use(bodyParser.json());

// Health check - Railway aur tum khud check karne ke liye use kar sakte ho
app.get('/', (req, res) => {
  res.send('Urban Pronto WhatsApp Bot is running ✅');
});

// Simple admin view of recent bookings (no auth - MVP only, add auth before production use)
app.get('/bookings', (req, res) => {
  res.json(listRecentBookings());
});

app.use('/', webhookRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
