const { Pool } = require('pg');

const env = {
  DATABASE_URL: 'postgres://Alangodoy:%40Aggtr4907@postgresql-208539-0.cloudclusters.net:19931/BeatWap'
};

async function testQueries() {
  console.log('🧪 Testando queries do worker...');
  
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  
  try {
    // Testar query de releases (musics)
    console.log('\n🎵 Testando query de releases/musics:');
    const releasesResult = await pool.query(`
      SELECT m.id, m.titulo, m.nome_artista, m.cover_url, m.audio_url, 
             m.preview_url, m.plataformas, m.estilo, m.duracao, m.release_date
      FROM public.musics m
      ORDER BY m.release_date DESC
    `);
    console.log(`✅ Releases encontrados: ${releasesResult.rows.length}`);
    
    // Testar query de sponsors
    console.log('\n🏢 Testando query de sponsors:');
    const sponsorsResult = await pool.query(`
      SELECT s.id, s.name, s.type, s.contact, s.logo_url
      FROM public.sponsors s
      ORDER BY s.name ASC
    `);
    console.log(`✅ Sponsors encontrados: ${sponsorsResult.rows.length}`);
    
    // Testar query de compositions
    console.log('\n🎼 Testando query de compositions:');
    const compositionsResult = await pool.query(`
      SELECT c.id, c.title, c.duration, c.genre, c.descricao
      FROM public.compositions c
      ORDER BY c.created_at DESC
    `);
    console.log(`✅ Compositions encontradas: ${compositionsResult.rows.length}`);
    
    // Testar query de profiles
    console.log('\n👥 Testando query de profiles:');
    const profilesResult = await pool.query(`
      SELECT p.id, p.nome, p.cargo, p.avatar_url
      FROM public.profiles p
      WHERE p.cargo = $1
      ORDER BY p.nome ASC
    `, ['Artista']);
    console.log(`✅ Profiles encontrados: ${profilesResult.rows.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao executar queries:', error.message);
  } finally {
    await pool.end();
  }
}

testQueries();