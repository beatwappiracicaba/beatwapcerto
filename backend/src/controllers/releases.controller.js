import { listReleases } from '../models/releases.model.js';
import { pool } from '../db.js';

export async function getReleases(req, res, next) {
  try {
    const rows = await listReleases(pool);
    const hasExpectedShape = Array.isArray(rows) && rows.some((r) => r && typeof r === 'object' && (
      Object.prototype.hasOwnProperty.call(r, 'show_on_home') ||
      Object.prototype.hasOwnProperty.call(r, 'audio_url') ||
      Object.prototype.hasOwnProperty.call(r, 'preview_url') ||
      Object.prototype.hasOwnProperty.call(r, 'album_id') ||
      Object.prototype.hasOwnProperty.call(r, 'titulo')
    ));
    if (hasExpectedShape) {
      res.set('Cache-Control', 'no-store');
      return res.json(rows);
    }

    const memory = globalThis.__beatwapMemory || (globalThis.__beatwapMemory = {
      queue: [],
      chats: [],
      notifications: [],
      artistMetrics: new Map(),
      producerProjects: [],
      musics: [],
      posts: [],
    });

    const normalized = (Array.isArray(memory.musics) ? memory.musics : [])
      .filter((m) => m && typeof m === 'object')
      .filter((m) => String(m.status || '') === 'aprovado')
      .map((m) => {
        const id = String(m.id || '');
        const artista_id = m.artista_id ?? m.artist_id ?? null;
        const created_at = m.created_at || null;
        const titulo = m.titulo ?? m.title ?? m.nome ?? '';
        const cover_url = m.cover_url ?? null;
        const audio_url = m.audio_url ?? null;
        const preview_url = m.preview_url ?? audio_url;
        const album_id = m.album_id ?? null;
        const album_title = m.album_title ?? null;
        const nome_artista = m.nome_artista ?? m.artist_name ?? null;
        const release_date = m.release_date ?? null;
        const estilo = m.estilo ?? null;
        const presave_link = m.presave_link ?? null;
        const is_beatwap_produced = !!m.is_beatwap_produced;
        const show_on_home = !!m.show_on_home;

        return {
          id,
          artista_id,
          titulo,
          cover_url,
          audio_url,
          preview_url,
          album_id,
          album_title,
          nome_artista,
          release_date,
          estilo,
          presave_link,
          is_beatwap_produced,
          show_on_home,
          created_at,
        };
      })
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .slice(0, 200);

    res.set('Cache-Control', 'no-store');
    res.json(normalized);
  } catch (err) {
    try {
      const memory = globalThis.__beatwapMemory;
      const normalized = (memory && Array.isArray(memory.musics) ? memory.musics : [])
        .filter((m) => m && typeof m === 'object')
        .filter((m) => String(m.status || '') === 'aprovado')
        .map((m) => ({
          id: String(m.id || ''),
          artista_id: m.artista_id ?? m.artist_id ?? null,
          titulo: m.titulo ?? m.title ?? m.nome ?? '',
          cover_url: m.cover_url ?? null,
          audio_url: m.audio_url ?? null,
          preview_url: m.preview_url ?? m.audio_url ?? null,
          album_id: m.album_id ?? null,
          album_title: m.album_title ?? null,
          nome_artista: m.nome_artista ?? m.artist_name ?? null,
          release_date: m.release_date ?? null,
          estilo: m.estilo ?? null,
          presave_link: m.presave_link ?? null,
          is_beatwap_produced: !!m.is_beatwap_produced,
          show_on_home: !!m.show_on_home,
          created_at: m.created_at || null,
        }))
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
        .slice(0, 200);
      res.set('Cache-Control', 'no-store');
      return res.json(normalized);
    } catch {
      next(err);
    }
  }
}
