import { createArrayResponse } from '../response.js';

export async function getAllArtists(pool, request = null) {
  try {
    const query = `
      SELECT 
        id,
        nome,
        cargo,
        avatar_url,
        nome_completo_razao_social,
        cpf_cnpj,
        celular,
        cep,
        logradouro,
        complemento,
        bairro,
        cidade,
        estado,
        plano,
        tema,
        genero_musical,
        email,
        created_at,
        updated_at
      FROM profiles 
      WHERE cargo = 'Artista'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    return createArrayResponse(result.rows, request);
  } catch (error) {
    console.error('Erro ao buscar artistas:', error);
    return createArrayResponse([], request);
  }
}

export async function getArtistById(pool, id, request = null) {
  try {
    const query = `
      SELECT 
        id,
        nome,
        cargo,
        avatar_url,
        nome_completo_razao_social,
        cpf_cnpj,
        celular,
        cep,
        logradouro,
        complemento,
        bairro,
        cidade,
        estado,
        plano,
        tema,
        genero_musical,
        email,
        created_at,
        updated_at
      FROM profiles 
      WHERE id = $1 AND cargo = 'Artista'
      LIMIT 1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return createArrayResponse([], request);
    }
    
    return createArrayResponse([result.rows[0]], request);
  } catch (error) {
    console.error('Erro ao buscar artista por ID:', error);
    return createArrayResponse([], request);
  }
}