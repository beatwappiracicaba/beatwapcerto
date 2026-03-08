import { createArrayResponse } from '../response.js';

export async function getAllComposers(pool, request = null) {
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
      WHERE cargo = 'Compositor'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    return createArrayResponse(result.rows, request);
  } catch (error) {
    console.error('Erro ao buscar compositores:', error);
    return createArrayResponse([], request);
  }
}

export async function getComposerById(pool, id, request = null) {
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
      WHERE id = $1 AND cargo = 'Compositor'
      LIMIT 1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return createArrayResponse([], request);
    }
    
    return createArrayResponse([result.rows[0]], request);
  } catch (error) {
    console.error('Erro ao buscar compositor por ID:', error);
    return createArrayResponse([], request);
  }
}