const express = require('express');
const router = express.Router();
const { listRecentBookings, updateBookingStatus } = require('../database/db');

function basicAuthMiddleware(req, res, next) {
  const user = process.env.ADMIN_USERNAME;
  const pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    return res.status(500).send('Admin credentials not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD.');
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Khidmora Admin"');
    return res.status(401).send('Authentication required.');
  }

  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString('utf8');
  const sepIndex = decoded.indexOf(':');
  const inputUser = decoded.slice(0, sepIndex);
  const inputPass = decoded.slice(sepIndex + 1);

  if (inputUser === user && inputPass === pass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Khidmora Admin"');
  return res.status(401).send('Invalid credentials.');
}

router.use(basicAuthMiddleware);

router.get('/api/bookings', (req, res) => {
  res.json(listRecentBookings(200));
});

router.post('/api/bookings/:bookingId/status', express.json(), (req, res) => {
  const { bookingId } = req.params;
  const { status } = req.body;
  const allowed = ['pending', 'assigned', 'completed', 'cancelled'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updated = updateBookingStatus(bookingId, status);
  if (!updated) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  res.json(updated);
});

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Khidmora Admin Dashboard</title>
<style>
  :root {
    --bg: #0f1117;
    --card: #171a21;
    --border: #2a2e38;
    --text: #e5e7eb;
    --muted: #9aa0ab;
    --accent: #22c55e;
    --accent2: #3b82f6;
    --warn: #f59e0b;
    --danger: #ef4444;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
  }
  header {
    padding: 24px 20px 16px;
    border-bottom: 1px solid var(--border);
  }
  header h1 {
    margin: 0;
    font-size: 22px;
  }
  header p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 13px;
  }
  .stats {
    display: flex;
    gap: 12px;
    padding: 16px 20px;
    flex-wrap: wrap;
  }
  .stat-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 18px;
    min-width: 120px;
    flex: 1;
  }
  .stat-card .label {
    font-size: 12px;
    color: var(--muted);
  }
  .stat-card .value {
    font-size: 24px;
    font-weight: 700;
    margin-top: 4px;
  }
  .toolbar {
    padding: 0 20px 12px;
  }
  .toolbar input {
    width: 100%;
    max-width: 320px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    font-size: 14px;
  }
  .table-wrap {
    padding: 0 20px 40px;
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    font-size: 13px;
  }
  th, td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  th {
    color: var(--muted);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.03em;
  }
  tr:last-child td { border-bottom: none; }
  a { color: var(--accent2); text-decoration: none; }
  select {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
  }
  .badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
  }
  .badge.pending { background: rgba(245,158,11,0.15); color: var(--warn); }
  .badge.assigned { background: rgba(59,130,246,0.15); color: var(--accent2); }
  .badge.completed { background: rgba(34,197,94,0.15); color: var(--accent); }
  .badge.cancelled { background: rgba(239,68,68,0.15); color: var(--danger); }
  .empty {
    padding: 40px;
    text-align: center;
    color: var(--muted);
  }
</style>
</head>
<body>
  <header>
    <h1>🏠 Khidmora — Admin Dashboard</h1>
    <p>Smart Home Services · Live bookings overview</p>
  </header>

  <div class="stats" id="stats"></div>

  <div class="toolbar">
    <input id="search" type="text" placeholder="Search by name, phone, service or booking ID..." />
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Booking ID</th>
          <th>Customer</th>
          <th>Phone</th>
          <th>Service</th>
          <th>Location</th>
          <th>Time</th>
          <th>Created</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <div id="empty" class="empty" style="display:none;">No bookings yet.</div>
  </div>

<script>
  let allBookings = [];

  async function loadBookings() {
    const res = await fetch('/admin/api/bookings');
    allBookings = await res.json();
    renderStats(allBookings);
    renderTable(allBookings);
  }

  function renderStats(bookings) {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const completed = bookings.filter(b => b.status === 'completed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;

    document.getElementById('stats').innerHTML = \`
      <div class="stat-card"><div class="label">Total Bookings</div><div class="value">\${total}</div></div>
      <div class="stat-card"><div class="label">Pending</div><div class="value">\${pending}</div></div>
      <div class="stat-card"><div class="label">Completed</div><div class="value">\${completed}</div></div>
      <div class="stat-card"><div class="label">Cancelled</div><div class="value">\${cancelled}</div></div>
    \`;
  }

  function renderTable(bookings) {
    const rowsEl = document.getElementById('rows');
    const emptyEl = document.getElementById('empty');

    if (bookings.length === 0) {
      rowsEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    rowsEl.innerHTML = bookings.map(b => {
      const locationHtml = b.location && b.location.includes('http')
        ? \`<a href="\${extractLink(b.location)}" target="_blank">📍 View Map</a>\`
        : (b.location || '-');

      return \`
        <tr>
          <td>\${b.booking_id}</td>
          <td>\${b.customer_name || '-'}</td>
          <td>\${b.customer_phone || '-'}</td>
          <td>\${b.service || '-'}</td>
          <td>\${locationHtml}</td>
          <td>\${b.preferred_datetime || '-'}</td>
          <td>\${formatDate(b.created_at)}</td>
          <td>
            <select onchange="updateStatus('\${b.booking_id}', this.value)">
              \${['pending','assigned','completed','cancelled'].map(s =>
                \`<option value="\${s}" \${b.status === s ? 'selected' : ''}>\${s}</option>\`
              ).join('')}
            </select>
          </td>
        </tr>
      \`;
    }).join('');
  }

  function extractLink(text) {
    const match = text.match(/https?:\\/\\/\\S+/);
    return match ? match[0] : '#';
  }

  function formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString();
  }

  async function updateStatus(bookingId, status) {
    await fetch(\`/admin/api/bookings/\${bookingId}/status\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadBookings();
  }

  document.getElementById('search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allBookings.filter(b =>
      (b.customer_name || '').toLowerCase().includes(q) ||
      (b.customer_phone || '').toLowerCase().includes(q) ||
      (b.service || '').toLowerCase().includes(q) ||
      (b.booking_id || '').toLowerCase().includes(q)
    );
    renderTable(filtered);
  });

  loadBookings();
  setInterval(loadBookings, 15000);
</script>
</body>
</html>`;

router.get('/', (req, res) => {
  res.send(DASHBOARD_HTML);
});

module.exports = router;
