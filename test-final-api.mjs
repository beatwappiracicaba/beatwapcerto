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
  
  // Teste de login
  try {
    console.log('🔐 Testando: /api/auth/login');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'alangodoygtr@gmail.com',
        password: '@Aggtr4907'
      })
    });
    console.log(`📊 Status (login): ${loginResponse.status}`);
    const loginText = await loginResponse.text();
    console.log(`📦 Resposta (login): ${loginText}`);
    console.log('---\n');
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    console.log('---\n');
  }
  
  // Teste de login (admin@beatwapp.com)
  try {
    console.log('🔐 Testando: /api/auth/login (admin)');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'alangodoygtr@gmail.com',
        password: '@Aggtr4907'
      })
    });
    console.log(`📊 Status (login admin): ${loginResponse.status}`);
    const loginText = await loginResponse.text();
    console.log(`📦 Resposta (login admin): ${loginText}`);
    console.log('---\n');
  } catch (error) {
    console.error('❌ Erro no login (admin):', error.message);
    console.log('---\n');
  }
  
  console.log('✅ Testes concluídos!');
}

testAPI();
