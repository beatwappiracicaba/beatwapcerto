import { pool } from './db.js';

async function checkArtist() {
  console.log('Verificando artista...');
  try {
    const result = await pool.query("SELECT id, nome, cargo FROM public.profiles WHERE id = '05c49df8-ec5b-4b90-86f6-2b107d79bf78'");
    console.log('Artista encontrado:', result.rows);
    
    // Verificar músicas desse artista
    const musicResult = await pool.query("SELECT * FROM public.musics WHERE artista_id = '05c49df8-ec5b-4b90-86f6-2b107d79bf78'");
    console.log('Músicas encontradas:', musicResult.rows.length);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkArtist();