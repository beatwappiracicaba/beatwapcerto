import { pool } from './db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
  console.log('📊 Iniciando configuração do banco de dados...');
  
  try {
    const sqlPath = join(__dirname, '..', 'sql', 'create-missing-tables.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Arquivo SQL carregado, executando...');
    await pool.query(sql);
    
    console.log('✅ Banco de dados configurado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error.message);
  } finally {
    await pool.end();
  }
}

setupDatabase();