const express = require('express');
const { auth } = require('../middleware/auth');
let multer = null;
try { multer = require('multer'); } catch { multer = null; }

const router = express.Router();

function mockUrl(name) {
  const n = name ? encodeURIComponent(name) : `${Date.now()}`;
  return `/api/uploads/${n}`;
}

// In-memory blob store (dataUrl or buffer)
const blobStore = new Map();
const uploads = {
  putDataUrl: (fileName, dataUrl) => {
    blobStore.set(fileName, { kind: 'dataurl', dataUrl, created_at: new Date().toISOString() });
  },
  putBuffer: (fileName, buffer, mime) => {
    blobStore.set(fileName, { kind: 'buffer', buffer, mime, created_at: new Date().toISOString() });
  },
  get: (fileName) => blobStore.get(fileName),
};

const storage = multer ? multer.memoryStorage() : null;
const uploadSingle = multer ? multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }).single('file') : null;
const uploadMultiple = multer ? multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }).array('files') : null;

router.post('/upload', auth, async (req, res) => {
  const fileName = (req.body && req.body.fileName) || null;
  res.json({ ok: true, url: mockUrl(fileName) });
});

router.post('/upload/single', auth, async (req, res) => {
  if (!uploadSingle) return res.status(501).json({ error: 'Multipart desativado (instale multer)' });
  uploadSingle(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Falha no upload' });
    try {
      const original = req.file?.originalname || 'arquivo';
      const mime = req.file?.mimetype || 'application/octet-stream';
      const ext = (original.includes('.') ? original.split('.').pop() : '').toLowerCase();
      const nameReq = String(req.body?.fileName || '').trim();
      const bucket = String(req.body?.bucket || '').trim();
      const baseName = nameReq || `${Date.now()}_${Math.random().toString(36).slice(2)}${ext ? '.' + ext : ''}`;
      const fileName = bucket ? `${bucket}/${baseName}` : baseName;
      uploads.putBuffer(fileName, req.file.buffer, mime);
      return res.json({ ok: true, url: mockUrl(fileName) });
    } catch {
      return res.status(500).json({ error: 'Erro interno' });
    }
  });
});

router.post('/upload/multiple', auth, async (req, res) => {
  if (!uploadMultiple) return res.status(501).json({ error: 'Multipart desativado (instale multer)' });
  uploadMultiple(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Falha no upload' });
    try {
      const bucket = String(req.body?.bucket || '').trim();
      const urls = (Array.isArray(req.files) ? req.files : []).map((f) => {
        const original = f.originalname || 'arquivo';
        const mime = f.mimetype || 'application/octet-stream';
        const ext = (original.includes('.') ? original.split('.').pop() : '').toLowerCase();
        const baseName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext ? '.' + ext : ''}`;
        const fileName = bucket ? `${bucket}/${baseName}` : baseName;
        uploads.putBuffer(fileName, f.buffer, mime);
        return mockUrl(fileName);
      });
      return res.json({ ok: true, urls, count: urls.length });
    } catch {
      return res.status(500).json({ error: 'Erro interno' });
    }
  });
});

// Base64 upload to support dev environment without multipart parser
router.post('/upload/base64', auth, async (req, res) => {
  try {
    const fileName = String(req.body?.fileName || `${Date.now()}`).trim();
    const dataUrl = String(req.body?.dataUrl || '').trim();
    if (!dataUrl.startsWith('data:')) return res.status(400).json({ error: 'Formato inválido' });
    uploads.putDataUrl(fileName, dataUrl);
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
    const entry = uploads.get(fileName);
    if (!entry) return res.status(404).send('Not found');
    let buf = null;
    let mime = 'application/octet-stream';
    if (entry.kind === 'buffer') {
      buf = entry.buffer;
      mime = entry.mime || mime;
    } else if (entry.kind === 'dataurl') {
      const m = /^data:([^;]+);base64,(.*)$/.exec(entry.dataUrl);
      if (!m) return res.status(400).send('Invalid data');
      mime = m[1];
      const base64 = m[2];
      buf = Buffer.from(base64, 'base64');
    } else {
      return res.status(400).send('Invalid data');
    }
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
