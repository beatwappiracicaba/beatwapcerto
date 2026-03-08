import { createArrayResponse } from '../response.js';

export async function getAllSponsors(pool, request = null) {
  try {
    const query = `
      SELECT 
        id,
        name,
        type,
        contact,
        created_at
      FROM sponsors 
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    return createArrayResponse(result.rows, request);
  } catch (error) {
    console.error('Erro ao buscar sponsors:', error);
    return createArrayResponse([], request);
  }
}

export async function getSponsorById(pool, id, request = null) {
  try {
    const query = `
      SELECT 
        id,
        name,
        type,
        contact,
        created_at
      FROM sponsors 
      WHERE id = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return createArrayResponse([], request);
    }
    
    return createArrayResponse([result.rows[0]], request);
  } catch (error) {
    console.error('Erro ao buscar sponsor por ID:', error);
    return createArrayResponse([], request);
  }
}