import { pool } from './db.js';
import { readFileSync } from 'fs';

async function createPostsTable() {
  console.log('Criando tabela de posts...');
  
  try {
    const sql = readFileSync('../sql/create-posts-table.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Tabela de posts criada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabela de posts:', error.message);
  } finally {
    await pool.end();
  }
}

createPostsTable();