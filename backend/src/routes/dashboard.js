const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { Music, Composition, Profile } = require('../models');

const router = express.Router();

router.get('/', authRequired, (req, res) => {
  const cargo = String(req.user.cargo);
  return res.json({ ok: true, redirect: cargo });
});

router.get('/musics', authRequired, requireRole(['Artista', 'Compositor']), async (req, res) => {
  const rows = await Music.findAll({ where: { profile_id: req.user.sub }, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

router.get('/compositions', authRequired, requireRole(['Artista', 'Compositor']), async (req, res) => {
  const rows = await Composition.findAll({ where: { profile_id: req.user.sub }, order: [['created_at', 'DESC']] });
  return res.json(rows);
});

router.get('/profile', authRequired, async (req, res) => {
  const profile = await Profile.findByPk(String(req.user.sub));
  return res.json(profile);
});

router.put('/profile', authRequired, async (req, res) => {
  const profile = await Profile.findByPk(String(req.user.sub));
  if (!profile) return res.status(404).json({ ok: false, error: 'Não encontrado' });
  const fields = [
    'nome','bio','genero_musical','youtube_url','spotify_url','deezer_url','tiktok_url','instagram_url','site_url','avatar_url'
  ];
  fields.forEach(f => {
    if (Object.prototype.hasOwnProperty.call(req.body, f)) {
      profile[f] = req.body[f];
    }
  });
  await profile.save();
  return res.json(profile);
});

router.post('/profile/avatar', authRequired, async (req, res) => {
  try {
    const { dataUrl } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ ok: false, error: 'Imagem inválida' });
    }
    const base64 = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');
    const userId = String(req?.user?.sub || 'anon');
    const destDir = path.join(process.cwd(), 'uploads', userId);
    fs.mkdirSync(destDir, { recursive: true });
    const fileName = `avatar_${Date.now()}.png`;
    const filePath = path.join(destDir, fileName);
    fs.writeFileSync(filePath, buffer);
    const url = `/uploads/${userId}/${fileName}`;
    const profile = await Profile.findByPk(userId);
    if (profile) {
      profile.avatar_url = url;
      await profile.save();
    }
    return res.json({ avatar_url: url });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Falha avatar' });
  }
});

module.exports = router;
