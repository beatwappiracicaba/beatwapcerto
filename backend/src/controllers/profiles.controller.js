import { getProfileById, getPublicProfileById, listProfiles, updateProfileAccessControl, updateProfileAvatar, updateProfileById } from '../models/profiles.model.js';
import { pool } from '../db.js';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';

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
    let isProducer = false;
    try {
      const auth = req.headers && req.headers.authorization ? String(req.headers.authorization) : '';
      if (auth.startsWith('Bearer ')) {
        const token = auth.slice('Bearer '.length).trim();
        const decoded = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
        const decodedCargo = decoded && typeof decoded === 'object' && 'cargo' in decoded ? String(decoded.cargo || '') : '';
        isProducer = decodedCargo === 'Produtor';
      }
    } catch {
      isProducer = false;
    }

    const rows = await listProfiles(pool, {
      cargo,
      includeEmail: isProducer,
      includeAccessControl: isProducer,
      includeVerified: true,
    });
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

export async function getProfile(req, res, next) {
  try {
    const id = req.params && req.params.id ? String(req.params.id) : '';
    if (!id) return res.status(400).json({ error: 'id é obrigatório' });
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return res.status(400).json({ error: 'id inválido' });
    const profile = await getPublicProfileById(pool, id);
    if (!profile) return res.status(404).json({ error: 'Perfil não encontrado' });

    try {
      const xf = req.headers && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']) : '';
      const ip = (xf.split(',')[0] || '').trim() || String(req.ip || '');
      const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null;
      const ua = req.headers && req.headers['user-agent'] ? String(req.headers['user-agent']) : '';
      const ref = req.headers && req.headers['referer'] ? String(req.headers['referer']) : '';
      await pool.query(
        `INSERT INTO public.analytics_events
          (id, type, artist_id, ip_hash, metadata)
         VALUES
          (gen_random_uuid(), 'profile_view', $1, $2, $3::jsonb)`,
        [id, ipHash, JSON.stringify({ ua, ref, source: 'server' })]
      );
    } catch {
      void 0;
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    const id = req.user && req.user.id ? String(req.user.id) : '';
    if (!id) return res.status(401).json({ error: 'Autenticação necessária' });
    const updated = await updateProfileById(pool, { id, patch: req.body, includeEmail: true });
    if (!updated) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const targetId = req.params && req.params.id ? String(req.params.id) : '';
    const userId = req.user && req.user.id ? String(req.user.id) : '';
    const userCargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
    if (!userId) return res.status(401).json({ error: 'Autenticação necessária' });
    if (!targetId) return res.status(400).json({ error: 'id é obrigatório' });

    const canEditOther = userCargo === 'Produtor';
    if (!canEditOther && targetId !== userId) {
      return res.status(403).json({ error: 'Sem permissão' });
    }

    const includeEmail = targetId === userId;
    const updated = await updateProfileById(pool, { id: targetId, patch: req.body, includeEmail });
    if (!updated) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.json(updated);
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

export async function updateProfilePermissions(req, res, next) {
  try {
    const targetId = req.params && req.params.id ? String(req.params.id) : '';
    const userId = req.user && req.user.id ? String(req.user.id) : '';
    const userCargo = req.user && req.user.cargo ? String(req.user.cargo) : '';
    if (!userId) return res.status(401).json({ error: 'Autenticação necessária' });
    if (userCargo !== 'Produtor') return res.status(403).json({ error: 'Sem permissão' });
    if (!targetId) return res.status(400).json({ error: 'id é obrigatório' });
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetId)) return res.status(400).json({ error: 'id inválido' });

    const access_control = req.body && req.body.access_control && typeof req.body.access_control === 'object'
      ? req.body.access_control
      : null;
    if (!access_control) return res.status(400).json({ error: 'access_control é obrigatório' });

    const updated = await updateProfileAccessControl(pool, { id: targetId, accessControl: access_control });
    if (!updated) return res.status(404).json({ error: 'Perfil não encontrado' });
    res.json(updated);
  } catch (err) {
    if (err && err.code === 'NO_COLUMN') {
      return res.status(409).json({ error: 'access_control não está disponível neste banco' });
    }
    next(err);
  }
}
