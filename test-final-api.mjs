import fetch from 'node-fetch';

const API_BASE = 'https://beatwap-api-worker.beatwappiracicaba.workers.dev';

async function testAPI() {
  console.log('🧪 Testando API BeatWap...\n');
  
  const endpoints = [
    '/api/profiles',
    '/api/artists', 
    '/api/producers',
    '/api/composers',
    '/api/compositions',
    '/api/releases',
    '/api/sponsors',
    '/api/users',
    '/health'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testando: ${endpoint}`);
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`📊 Status: ${response.status}`);
      
      const data = await response.json();
      console.log(`📦 Tipo de resposta: ${typeof data}`);
      console.log(`✅ Success: ${data.success}`);
      console.log(`📊 Array length: ${Array.isArray(data.data) ? data.data.length : 'N/A'}`);
      console.log(`🎯 Data type: ${Array.isArray(data.data) ? 'Array' : typeof data.data}`);
      
      // Verificar CORS headers
      const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
      console.log(`🔒 CORS Origin: ${corsOrigin}`);
      
      console.log('---\n');
      
    } catch (error) {
      console.error(`❌ Erro em ${endpoint}:`, error.message);
      console.log('---\n');
    }
  }
  
  console.log('✅ Testes concluídos!');
}

testAPI();