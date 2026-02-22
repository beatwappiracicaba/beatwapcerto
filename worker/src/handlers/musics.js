import { createArrayResponse } from '../response.js';

export async function getAllMusics(pool) {
  try {
    const query = `
      SELECT 
        m.id,
        m.titulo,
        m.nome_artista,
        m.cover_url,
        m.audio_url,
        m.preview_url,
        m.isrc,
        m.authorization_url,
        m.plataformas,
        m.estilo,
        m.upc,
        m.presave_link,
        m.release_date,
        m.status,
        m.motivo_recusa,
        m.feat_beatwap_artist_ids,
        m.is_beatwap_composer_partner,
        m.created_at,
        m.updated_at,
        p.nome as artista_nome,
        p.avatar_url as artista_avatar
      FROM musics m
      LEFT JOIN profiles p ON m.artista_id = p.id
      WHERE m.status = 'aprovado'
      ORDER BY m.created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    return createArrayResponse(result.rows);
  } catch (error) {
    console.error('Erro ao buscar músicas:', error);
    return createArrayResponse([]);
  }
}

export async function getMusicById(pool, id) {
  try {
    const query = `
      SELECT 
        m.id,
        m.titulo,
        m.nome_artista,
        m.cover_url,
        m.audio_url,
        m.preview_url,
        m.isrc,
        m.authorization_url,
        m.plataformas,
        m.estilo,
        m.upc,
        m.presave_link,
        m.release_date,
        m.status,
        m.motivo_recusa,
        m.feat_beatwap_artist_ids,
        m.is_beatwap_composer_partner,
        m.created_at,
        m.updated_at,
        p.nome as artista_nome,
        p.avatar_url as artista_avatar
      FROM musics m
      LEFT JOIN profiles p ON m.artista_id = p.id
      WHERE m.id = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return createArrayResponse([]);
    }
    
    return createArrayResponse([result.rows[0]]);
  } catch (error) {
    console.error('Erro ao buscar música por ID:', error);
    return createArrayResponse([]);
  }
}

export async function getMusicsByArtist(pool, artistId) {
  try {
    const query = `
      SELECT 
        m.id,
        m.titulo,
        m.nome_artista,
        m.cover_url,
        m.audio_url,
        m.preview_url,
        m.isrc,
        m.authorization_url,
        m.plataformas,
        m.estilo,
        m.upc,
        m.presave_link,
        m.release_date,
        m.status,
        m.motivo_recusa,
        m.feat_beatwap_artist_ids,
        m.is_beatwap_composer_partner,
        m.created_at,
        m.updated_at
      FROM musics m
      WHERE m.artista_id = $1
      ORDER BY m.created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [artistId]);
    return createArrayResponse(result.rows);
  } catch (error) {
    console.error('Erro ao buscar músicas do artista:', error);
    return createArrayResponse([]);
  }
}

export async function getReleases(pool) {
  try {
    const query = `
      SELECT 
        m.id,
        m.titulo as title,
        m.nome_artista as artist_name,
        m.cover_url,
        m.audio_url,
        m.release_date,
        m.estilo as genre,
        m.status,
        m.created_at,
        p.nome as artista_nome,
        p.avatar_url as artista_avatar
      FROM musics m
      LEFT JOIN profiles p ON m.artista_id = p.id
      WHERE m.release_date IS NOT NULL 
        AND m.status = 'aprovado'
      ORDER BY m.release_date DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    return createArrayResponse(result.rows);
  } catch (error) {
    console.error('Erro ao buscar releases:', error);
    return createArrayResponse([]);
  }
}