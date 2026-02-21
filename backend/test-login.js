import { pool } from './db.js';
import bcrypt from 'bcryptjs';

async function testLogin() {
  try {
    console.log('🧪 Testando login com dados de teste...');
    
    // Verificar se o usuário existe
    const userResult = await pool.query('SELECT * FROM public.profiles WHERE email = $1', ['artista1@teste.com']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('👤 Usuário encontrado:', user.nome);
    console.log('📧 Email:', user.email);
    console.log('🔑 Hash da senha:', user.password_hash);
    
    // Testar senha
    const passwordMatch = await bcrypt.compare('password', user.password_hash);
    console.log('🔐 Senha válida:', passwordMatch);
    
  } catch (error) {
    console.error('❌ Erro ao testar login:', error.message);
  } finally {
    await pool.end();
  }
}

testLogin();