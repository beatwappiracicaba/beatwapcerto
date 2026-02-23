// Teste simples de API no console do navegador
console.log('🧪 Iniciando testes de CORS...');

// Teste 1: GET /api/profiles
fetch('https://beatwap-api-worker.beatwappiracicaba.workers.dev/api/profiles')
  .then(response => {
    console.log('✅ GET /api/profiles - Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('📊 Dados recebidos:', data);
  })
  .catch(error => {
    console.error('❌ GET /api/profiles erro:', error);
  });

// Teste 2: POST /api/auth/login
setTimeout(() => {
  fetch('https://beatwap-api-worker.beatwappiracicaba.workers.dev/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@beatwapp.com',
      password: 'admin123'
    })
  })
  .then(response => {
    console.log('✅ POST /api/auth/login - Status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('🔑 Resposta login:', data);
  })
  .catch(error => {
    console.error('❌ POST /api/auth/login erro:', error);
  });
}, 1000);

// Teste 3: Outros endpoints
setTimeout(() => {
  const endpoints = ['/api/compositions', '/api/producers', '/api/studios', '/api/clients'];
  
  endpoints.forEach(endpoint => {
    fetch(`https://beatwap-api-worker.beatwappiracicaba.workers.dev${endpoint}`)
      .then(response => response.json())
      .then(data => {
        console.log(`✅ GET ${endpoint} - Sucesso:`, Array.isArray(data.data) ? `Array com ${data.data.length} itens` : 'Não é array');
      })
      .catch(error => {
        console.error(`❌ GET ${endpoint} erro:`, error.message);
      });
  });
}, 2000);