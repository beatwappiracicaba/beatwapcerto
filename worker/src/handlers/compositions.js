import { createArrayResponse } from '../response.js';

export async function getAllCompositions(pool, request = null) {
  try {
    const query = `
      SELECT 
        c.id,
        c.title,
        c.audio_url,
        c.cover_url,
        c.genre,
        c.description,
        c.price,
        c.status,
        c.admin_feedback,
        c.created_at,
        p.nome as composer_name,
        p.avatar_url as composer_avatar
      FROM compositions c
      LEFT JOIN profiles p ON c.composer_id = p.id
      WHERE c.status = 'approved'
      ORDER BY c.created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    return createArrayResponse(result.rows, request);
  } catch (error) {
    console.error('Erro ao buscar composições:', error);
    return createArrayResponse([], request);
  }
}

export async function getCompositionById(pool, id, request = null) {
  try {
    const query = `
      SELECT 
        c.id,
        c.title,
        c.audio_url,
        c.cover_url,
        c.genre,
        c.description,
        c.price,
        c.status,
        c.admin_feedback,
        c.created_at,
        p.nome as composer_name,
        p.avatar_url as composer_avatar
      FROM compositions c
      LEFT JOIN profiles p ON c.composer_id = p.id
      WHERE c.id = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return createArrayResponse([], request);
    }
    
    return createArrayResponse([result.rows[0]], request);
  } catch (error) {
    console.error('Erro ao buscar composição por ID:', error);
    return createArrayResponse([], request);
  }
}

export async function getCompositionsByComposer(pool, composerId, request = null) {
  try {
    const query = `
      SELECT 
        c.id,
        c.title,
        c.audio_url,
        c.cover_url,
        c.genre,
        c.description,
        c.price,
        c.status,
        c.admin_feedback,
        c.created_at
      FROM compositions c
      WHERE c.composer_id = $1
      ORDER BY c.created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [composerId]);
    return createArrayResponse(result.rows, request);
  } catch (error) {
    console.error('Erro ao buscar composições do compositor:', error);
    return createArrayResponse([], request);
  }
}