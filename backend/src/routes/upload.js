const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

function mockUrl(name) {
  const n = name ? encodeURIComponent(name) : `${Date.now()}`;
  return `/api/uploads/${n}`;
}

// In-memory blob store (dataUrl)
const blobStore = new Map();

router.post('/upload', auth, async (req, res) => {
  const fileName = (req.body && req.body.fileName) || null;
  res.json({ ok: true, url: mockUrl(fileName) });
});

router.post('/upload/single', auth, async (req, res) => {
  res.json({ ok: true, url: mockUrl(null) });
});

router.post('/upload/multiple', auth, async (req, res) => {
  res.json({ ok: true, urls: [mockUrl('a'), mockUrl('b')] });
});

// Base64 upload to support dev environment without multipart parser
router.post('/upload/base64', auth, async (req, res) => {
  try {
    const fileName = String(req.body?.fileName || `${Date.now()}`).trim();
    const dataUrl = String(req.body?.dataUrl || '').trim();
    if (!dataUrl.startsWith('data:')) return res.status(400).json({ error: 'Formato inválido' });
    blobStore.set(fileName, { dataUrl, created_at: new Date().toISOString() });
    res.json({ ok: true, url: mockUrl(fileName) });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Serve uploaded content from in-memory store
// Support file names containing slashes by using a wildcard param
router.get('/uploads/:fileName(*)', async (req, res) => {
  try {
    const raw = req.params.fileName || '';
    const fileName = decodeURIComponent(raw);
    const entry = blobStore.get(fileName);
    if (!entry) return res.status(404).send('Not found');
    const m = /^data:([^;]+);base64,(.*)$/.exec(entry.dataUrl);
    if (!m) return res.status(400).send('Invalid data');
    const mime = m[1];
    const base64 = m[2];
    const buf = Buffer.from(base64, 'base64');
    res.setHeader('Content-Type', mime || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');
    const range = req.headers.range;
    if (range) {
      const size = buf.length;
      const parts = range.replace(/bytes=/, '').split('-');
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : size - 1;
      if (Number.isNaN(start) || start < 0) start = 0;
      if (Number.isNaN(end) || end >= size) end = size - 1;
      if (start > end) {
        res.status(416).setHeader('Content-Range', `bytes */${size}`);
        return res.end();
      }
      const chunk = buf.slice(start, end + 1);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', String(chunk.length));
      return res.end(chunk);
    }
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  } catch {
    res.status(500).send('Erro interno');
  }
});

module.exports = router;
