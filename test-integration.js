// Script de teste de integração entre Frontend (Pages) e Backend (Workers)
const API_BASE_URL = 'https://beatwap-api-worker.beatwappiracicaba.workers.dev';
const FRONTEND_URL = 'https://www.beatwap.com.br';

// Testar todos os endpoints principais
async function testAllEndpoints() {
  console.log('🧪 Iniciando testes de integração...\n');
  
  const testResults = {
    login: false,
    profile: false,
    admin: false,
    notifications: false,
    chats: false,
    queue: false,
    cors: false
  };

  try {
    // Testar login básico
    console.log('1. Testando login...');
    const loginTest = await testLogin();
    testResults.login = loginTest.success;
    
    if (loginTest.success && loginTest.token) {
      // Testar profile com token
      console.log('\n2. Testando profile...');
      const profileTest = await testProfile(loginTest.token);
      testResults.profile = profileTest.success;
      
      // Testar endpoints admin
      console.log('\n3. Testando endpoints admin...');
      const adminTest = await testAdminEndpoints(loginTest.token);
      testResults.admin = adminTest.success;
      
      // Testar notificações
      console.log('\n4. Testando notificações...');
      const notificationsTest = await testNotifications(loginTest.token);
      testResults.notifications = notificationsTest.success;
      
      // Testar chats
      console.log('\n5. Testando chats...');
      const chatsTest = await testChats(loginTest.token);
      testResults.chats = chatsTest.success;
      
      // Testar queue
      console.log('\n6. Testando queue...');
      const queueTest = await testQueue(loginTest.token);
      testResults.queue = queueTest.success;
      
      // Testar CORS
      console.log('\n7. Testando CORS...');
      const corsTest = await testCORS();
      testResults.cors = corsTest.success;
    }
    
    // Mostrar resumo
    console.log('\n📊 RESUMO DOS TESTES:');
    console.log('==================');
    Object.entries(testResults).forEach(([test, success]) => {
      console.log(`${success ? '✅' : '❌'} ${test.toUpperCase()}: ${success ? 'SUCESSO' : 'FALHOU'}`);
    });
    
    const totalSuccess = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    console.log(`\n🎯 Total: ${totalSuccess}/${totalTests} testes passaram`);
    
    if (totalSuccess === totalTests) {
      console.log('🎉 Todos os testes passaram! Sistema está funcionando corretamente.');
    } else {
      console.log('⚠️  Alguns testes falharam. Verifique os logs acima.');
    }
    
  } catch (error) {
    console.error('💥 Erro durante os testes:', error.message);
  }
}

async function testLogin() {
  try {
    // Testar com credenciais de teste (ajuste conforme necessário)
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      })
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Login funcionou');
      return { success: true, token: data.token, user: data.user };
    } else {
      console.log('   ❌ Login falhou');
      return { success: false };
    }
  } catch (error) {
    console.log(`   ❌ Erro no login: ${error.message}`);
    return { success: false };
  }
}

async function testProfile(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Profile funcionou');
      console.log(`   Cargo: ${data.cargo || 'Não encontrado'}`);
      return { success: true, profile: data };
    } else {
      console.log('   ❌ Profile falhou');
      return { success: false };
    }
  } catch (error) {
    console.log(`   ❌ Erro no profile: ${error.message}`);
    return { success: false };
  }
}

async function testAdminEndpoints(token) {
  const endpoints = [
    '/api/admin/stats',
    '/api/admin/musics',
    '/api/admin/compositions',
    '/api/admin/sellers'
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`   ${endpoint}: ${response.status}`);
      
      if (response.ok) {
        successCount++;
      }
    } catch (error) {
      console.log(`   ${endpoint}: Erro - ${error.message}`);
    }
  }
  
  const success = successCount === endpoints.length;
  console.log(`   ${success ? '✅' : '❌'} Admin endpoints: ${successCount}/${endpoints.length}`);
  return { success };
}

async function testNotifications(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      console.log('   ✅ Notificações funcionaram');
      return { success: true };
    } else {
      console.log('   ❌ Notificações falharam');
      return { success: false };
    }
  } catch (error) {
    console.log(`   ❌ Erro nas notificações: ${error.message}`);
    return { success: false };
  }
}

async function testChats(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      console.log('   ✅ Chats funcionaram');
      return { success: true };
    } else {
      console.log('   ❌ Chats falharam');
      return { success: false };
    }
  } catch (error) {
    console.log(`   ❌ Erro nos chats: ${error.message}`);
    return { success: false };
  }
}

async function testQueue(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/queue`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      console.log('   ✅ Queue funcionou');
      return { success: true };
    } else {
      console.log('   ❌ Queue falhou');
      return { success: false };
    }
  } catch (error) {
    console.log(`   ❌ Erro na queue: ${error.message}`);
    return { success: false };
  }
}

async function testCORS() {
  try {
    // Testar se o backend aceita requisições do frontend
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization'
      }
    });
    
    console.log(`   CORS Status: ${response.status}`);
    
    const hasCorrectHeaders = response.headers.has('Access-Control-Allow-Origin');
    console.log(`   CORS Headers: ${hasCorrectHeaders ? 'Presentes' : 'Ausentes'}`);
    
    const success = response.ok && hasCorrectHeaders;
    console.log(`   ${success ? '✅' : '❌'} CORS: ${success ? 'Configurado corretamente' : 'Problemas detectados'}`);
    
    return { success };
  } catch (error) {
    console.log(`   ❌ Erro no CORS: ${error.message}`);
    return { success: false };
  }
}

// Executar os testes
testAllEndpoints();