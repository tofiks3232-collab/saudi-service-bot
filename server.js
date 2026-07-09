require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('./src/utils/logger');
const webhookRoutes = require('./src/routes/webhook');
const adminRoutes = require('./src/routes/adminRoutes');
const { listRecentBookings } = require('./src/database/db');

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Khidmora WhatsApp Bot is running ✅');
});

app.get('/bookings', (req, res) => {
  res.json(listRecentBookings());
});

app.use('/admin', adminRoutes);
app.use('/', webhookRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
