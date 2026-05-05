const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;  // ← manquant dans ton fichier
const MAX_FILE_COUNT = 5;    

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Use only the extension from the original name — never trust the full
    // originalname as a path component (path traversal risk).
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// fileFilter runs BEFORE the file reaches disk, so invalid MIME types are
// rejected immediately without wasting I/O.
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    // Hard cap per file. Multer enforces this during streaming — the connection
    // is aborted as soon as the threshold is crossed, before the full payload
    // is buffered or written.
    fileSize: MAX_FILE_SIZE_BYTES,

    // Cap on total number of files per request. Without this, an attacker
    // could send hundreds of files even if each one is within the size limit.
    files: MAX_FILE_COUNT,

    // Cap on total non-file form fields to limit memory used for field parsing.
    fields: 10,
  }
});

module.exports = upload;