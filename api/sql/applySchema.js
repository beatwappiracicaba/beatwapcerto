const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf-8');

async function applySchema() {
  try {
    await db.query(initSql);
    console.log('Schema aplicado com sucesso!');
  } catch (error) {
    console.error('Erro ao aplicar o schema:', error);
  }
}

applySchema();
