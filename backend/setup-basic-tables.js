import { pool } from './db.js';
import { readFileSync } from 'fs';

async function setupBasicTables() {
  console.log('📊 Criando tabelas básicas...');
  
  try {
    const sql = readFileSync('../sql/create-basic-tables.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Tabelas criadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

setupBasicTables();