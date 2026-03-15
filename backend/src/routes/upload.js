const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authRequired } = require('../middleware/auth');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = String(req?.user?.sub || 'anon');
    const dest = path.join(process.cwd(), 'uploads', userId);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^\w.\-]+/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});

const upload = multer({ storage });
const router = express.Router();

router.post('/', authRequired, upload.single('file'), (req, res) => {
  try {
    const userId = String(req?.user?.sub || 'anon');
    const url = `/uploads/${userId}/${req.file.filename}`;
    return res.json({ ok: true, url });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Erro upload' });
  }
});

router.post('/single', authRequired, upload.single('file'), (req, res) => {
  try {
    const userId = String(req?.user?.sub || 'anon');
    const url = `/uploads/${userId}/${req.file.filename}`;
    return res.json({ url });
  } catch (e) {
    return res.status(500).json({ error: 'Erro upload' });
  }
});

router.post('/multiple', authRequired, upload.array('files', 10), (req, res) => {
  try {
    const userId = String(req?.user?.sub || 'anon');
    const urls = (req.files || []).map(f => `/uploads/${userId}/${f.filename}`);
    return res.json({ urls });
  } catch (e) {
    return res.status(500).json({ error: 'Erro upload' });
  }
});

module.exports = router;
