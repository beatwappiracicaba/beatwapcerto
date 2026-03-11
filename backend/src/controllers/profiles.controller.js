import { getProfileById, listProfiles, updateProfileAvatar } from '../models/profiles.model.js';
import { pool } from '../db.js';

export async function getProfiles(req, res, next) {
  try {
    const rawRole = req.query && req.query.role ? String(req.query.role).trim().toLowerCase() : '';
    const roleMap = {
      artist: 'Artista',
      artista: 'Artista',
      producer: 'Produtor',
      produtor: 'Produtor',
      seller: 'Vendedor',
      vendedor: 'Vendedor',
      composer: 'Compositor',
      compositor: 'Compositor',
    };
    const cargo = rawRole ? (roleMap[rawRole] || null) : null;
    const rows = await listProfiles(pool, { cargo });
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function getMyProfile(req, res, next) {
  try {
    const id = req.user && req.user.id ? String(req.user.id) : '';
    if (!id) return res.status(401).json({ error: 'Autenticação necessária' });
    const profile = await getProfileById(pool, id);
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function uploadMyAvatar(req, res, next) {
  try {
    const id = req.user && req.user.id ? String(req.user.id) : '';
    if (!id) return res.status(401).json({ error: 'Autenticação necessária' });

    const dataUrl = req.body && (req.body.dataUrl ?? req.body.avatar_url) ? String(req.body.dataUrl ?? req.body.avatar_url) : '';
    if (!dataUrl) return res.status(400).json({ error: 'dataUrl é obrigatório' });
    if (!dataUrl.startsWith('data:image/')) return res.status(400).json({ error: 'Formato de imagem inválido' });
    if (dataUrl.length > 3_000_000) return res.status(413).json({ error: 'Imagem muito grande' });

    const updated = await updateProfileAvatar(pool, { id, avatarUrl: dataUrl });
    if (!updated) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.json({ avatar_url: updated.avatar_url });
  } catch (err) {
    next(err);
  }
}
