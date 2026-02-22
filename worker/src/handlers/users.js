import { createArrayResponse } from '../response.js';

export async function getAllUsers(pool) {
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
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    return createArrayResponse(result.rows);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return createArrayResponse([]);
  }
}

export async function getUserById(pool, id) {
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
      WHERE id = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return createArrayResponse([]);
    }
    
    return createArrayResponse([result.rows[0]]);
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error);
    return createArrayResponse([]);
  }
}