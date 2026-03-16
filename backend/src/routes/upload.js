const express = require('express');
const fs = require('fs');
const path = require('path');
const { auth } = require('../middleware/auth');
const multer = require('multer');

const router = express.Router();

const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

router.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

function safePart(value) {
  return String(value || '')
    .replace(/[/\\]/g, '_')
    .replace(/\.\.+/g, '_')
    .replace(/[^\w.\-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 180);
}

function buildPublicUrl(req, relPath) {
  const protoHeader = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const proto = protoHeader || req.protocol || 'https';
  const hostHeader = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  const host = hostHeader || 'api.beatwap.com.br';
  const normalizedRel = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const encoded = normalizedRel.split('/').map(s => encodeURIComponent(s)).join('/');
  return `${proto}://${host}/api/uploads/${encoded}`;
}

function pickExtFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.includes('image/jpeg')) return '.jpg';
  if (m.includes('image/png')) return '.png';
  if (m.includes('image/webp')) return '.webp';
  if (m.includes('image/gif')) return '.gif';
  if (m.includes('audio/mpeg')) return '.mp3';
  if (m.includes('audio/wav')) return '.wav';
  if (m.includes('audio/mp4')) return '.m4a';
  if (m.includes('video/mp4')) return '.mp4';
  if (m.includes('video/quicktime')) return '.mov';
  return '';
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = safePart(req.body?.bucket || '');
    const dir = bucket ? path.join(uploadsDir, bucket) : uploadsDir;
    try {
      ensureDir(dir);
      cb(null, dir);
    } catch (e) {
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const original = String(file?.originalname || 'arquivo');
    const extOriginal = path.extname(original).toLowerCase();
    const nameReqRaw = String(req.body?.fileName || '').trim();
    const nameReqSafe = safePart(nameReqRaw);
    const extReq = path.extname(nameReqSafe).toLowerCase();
    const ext = extReq || extOriginal || pickExtFromMime(file?.mimetype);
    const base = (nameReqSafe ? nameReqSafe.replace(new RegExp(`${extReq.replace('.', '\\.')}$`), '') : `${Date.now()}`) || `${Date.now()}`;
    const fileName = `${base}_${randomSuffix()}${ext || ''}`;
    cb(null, fileName);
  }
});

const uploadSingle = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }).single('file');
const uploadMultiple = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }).array('files');

router.post('/upload', auth, async (req, res) => {
  res.status(400).json({ ok: false, error: 'Use /upload/single' });
});

router.post('/upload/single', auth, async (req, res) => {
  uploadSingle(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Falha no upload' });
    try {
      if (!req.file || !req.file.path) return res.status(400).json({ error: 'Arquivo inválido' });
      const rel = path.relative(uploadsDir, req.file.path).split(path.sep).join('/');
      const url = buildPublicUrl(req, rel);
      return res.json({ ok: true, url });
    } catch {
      return res.status(500).json({ error: 'Erro interno' });
    }
  });
});

router.post('/upload/multiple', auth, async (req, res) => {
  uploadMultiple(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Falha no upload' });
    try {
      const urls = (Array.isArray(req.files) ? req.files : [])
        .filter((f) => f && f.path)
        .map((f) => {
          const rel = path.relative(uploadsDir, f.path).split(path.sep).join('/');
          return buildPublicUrl(req, rel);
        });
      return res.json({ ok: true, urls, count: urls.length });
    } catch {
      return res.status(500).json({ error: 'Erro interno' });
    }
  });
});

router.post('/upload/base64', auth, async (req, res) => {
  try {
    const bucket = safePart(req.body?.bucket || '');
    const fileNameRaw = String(req.body?.fileName || `${Date.now()}`).trim();
    const fileNameSafe = safePart(fileNameRaw) || `${Date.now()}`;
    const dataUrl = String(req.body?.dataUrl || '').trim();
    if (!dataUrl.startsWith('data:')) return res.status(400).json({ error: 'Formato inválido' });
    const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
    if (!m) return res.status(400).json({ error: 'Formato inválido' });
    const mime = m[1];
    const base64 = m[2];
    const ext = path.extname(fileNameSafe) || pickExtFromMime(mime) || '';
    const base = fileNameSafe.replace(new RegExp(`${ext.replace('.', '\\.')}$`), '') || `${Date.now()}`;
    const finalName = `${base}_${randomSuffix()}${ext}`;
    const dir = bucket ? path.join(uploadsDir, bucket) : uploadsDir;
    ensureDir(dir);
    const absPath = path.join(dir, finalName);
    const buf = Buffer.from(base64, 'base64');
    await fs.promises.writeFile(absPath, buf);
    const rel = path.relative(uploadsDir, absPath).split(path.sep).join('/');
    res.json({ ok: true, url: buildPublicUrl(req, rel) });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
