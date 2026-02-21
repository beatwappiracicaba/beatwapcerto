import { pool } from './db.js';

async function findRealArtist() {
  console.log('Buscando artista real...');
  try {
    const result = await pool.query("SELECT id, nome, cargo FROM public.profiles WHERE cargo = 'Artista' LIMIT 1");
    console.log('Artista encontrado:', result.rows);
    
    if (result.rows.length > 0) {
      const artistId = result.rows[0].id;
      console.log('Usando ID do artista:', artistId);
      
      // Inserir uma música para esse artista
      await pool.query(`
        INSERT INTO public.musics (titulo, artista_id, nome_artista, estilo, created_at) 
        VALUES ('Música Teste', $1, $2, 'Rock', NOW())
      `, [artistId, result.rows[0].nome]);
      
      console.log('Música de teste inserida com sucesso!');
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

findRealArtist();