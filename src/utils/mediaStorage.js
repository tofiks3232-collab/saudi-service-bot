const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'ac-photos');

function ensureDir() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Saves a downloaded photo to disk and returns a relative URL path
// (e.g. "/uploads/ac-photos/173234_abc.jpg") that the admin panel or
// notifyAdmin message can use to view the photo later.
function saveImageBuffer(buffer, mimeType) {
  ensureDir();
  const ext = mimeType && mimeType.includes('png') ? 'png' : 'jpg';
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/ac-photos/${filename}`;
}

module.exports = { saveImageBuffer };
