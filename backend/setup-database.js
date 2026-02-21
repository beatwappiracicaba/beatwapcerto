import { pool } from './db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupDatabase() {
  try {
    console.log('📊 Iniciando configuração do banco de dados...');
    
    // Ler o arquivo SQL
    const sqlPath = join(__dirname, '..', 'sql', 'setup-basic-tables.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Arquivo SQL carregado, executando...');
    
    // Executar o SQL
    await pool.query(sqlContent);
    
    console.log('✅ Banco de dados configurado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error.message);
  } finally {
    await pool.end();
  }
}

setupDatabase();