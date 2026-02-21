import bcrypt from 'bcryptjs';
import { pool } from './db.js';

async function createUser() {
  console.log('Criando usuário alangodoygtr@gmail.com...');
  
  try {
    // Verificar se o usuário já existe
    const existingUser = await pool.query(
      'SELECT * FROM public.profiles WHERE email = $1',
      ['alangodoygtr@gmail.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('Usuário já existe!');
      return;
    }

    // Criar hash da senha
    const hashedPassword = await bcrypt.hash('@Aggtr4907', 10);

    // Inserir novo usuário
    const result = await pool.query(
      `INSERT INTO public.profiles (nome, email, password_hash, cargo, avatar_url, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id, nome, email, cargo`,
      [
        'Alan Godoy',
        'alangodoygtr@gmail.com',
        hashedPassword,
        'Produtor',
        'https://via.placeholder.com/150'
      ]
    );

    console.log('✅ Usuário criado com sucesso!');
    console.log('ID:', result.rows[0].id);
    console.log('Nome:', result.rows[0].nome);
    console.log('Email:', result.rows[0].email);
    console.log('Cargo:', result.rows[0].cargo);

  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
  } finally {
    await pool.end();
  }
}

createUser();