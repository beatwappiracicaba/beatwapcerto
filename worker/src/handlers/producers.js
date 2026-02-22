import { createArrayResponse } from '../response.js';

export async function getAllProducers(pool) {
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
      WHERE cargo = 'Produtor'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    return createArrayResponse(result.rows);
  } catch (error) {
    console.error('Erro ao buscar produtores:', error);
    return createArrayResponse([]);
  }
}

export async function getProducerById(pool, id) {
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
      WHERE id = $1 AND cargo = 'Produtor'
      LIMIT 1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return createArrayResponse([]);
    }
    
    return createArrayResponse([result.rows[0]]);
  } catch (error) {
    console.error('Erro ao buscar produtor por ID:', error);
    return createArrayResponse([]);
  }
}