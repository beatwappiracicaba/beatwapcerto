#!/usr/bin/env python3
"""
Teste detalhado de integração Pages + Workers
Verifica estrutura de dados e endpoints
"""

import requests
import json

# URLs de produção
PAGES_URL = "https://www.beatwap.com.br"
WORKERS_URL = "https://beatwap-api-worker.beatwappiracicaba.workers.dev"

def test_endpoint_structure():
    """Testa estrutura dos endpoints"""
    print("🔍 Verificando estrutura dos endpoints...")
    
    # Testar health check
    try:
        response = requests.get(f"{WORKERS_URL}/health", timeout=10)
        print(f"   Health Check: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Health: {response.json()}")
    except Exception as e:
        print(f"   ❌ Health erro: {e}")
    
    # Testar endpoints de auth
    print("\n🔐 Testando estrutura de auth...")
    
    # Testar login com diferentes formatos
    test_credentials = [
        {"email": "admin@beatwap.com", "password": "admin123"},
        {"email": "admin@beatwap.com", "senha": "admin123"},
    ]
    
    for i, creds in enumerate(test_credentials):
        print(f"\n   Teste {i+1}: {json.dumps(creds)}")
        try:
            response = requests.post(
                f"{WORKERS_URL}/api/auth/login",
                json=creds,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            print(f"   Status: {response.status_code}")
            print(f"   Headers: {dict(response.headers)}")
            
            if response.status_code in [200, 400, 401]:
                try:
                    data = response.json()
                    print(f"   Response: {json.dumps(data, indent=2)}")
                except:
                    print(f"   Raw response: {response.text}")
            else:
                print(f"   Unexpected response: {response.text[:200]}")
                
        except Exception as e:
            print(f"   ❌ Erro: {e}")

def test_database_connection():
    """Testa conexão com banco de dados"""
    print("\n🗄️ Testando conexão com banco...")
    
    # Verificar se há usuários no banco
    try:
        # Tentar um registro simples para ver se o banco responde
        response = requests.post(
            f"{WORKERS_URL}/api/auth/register",
            json={
                "nome": "Test User",
                "email": "test@temp.com",
                "senha": "test123",
                "cargo": "Artista"
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"   Register status: {response.status_code}")
        if response.status_code in [200, 201]:
            print(f"   ✅ Registro funcionou: {response.json()}")
        else:
            print(f"   Register response: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Register erro: {e}")

def test_cors_detailed():
    """Testa CORS em detalhes"""
    print("\n🌐 Testando CORS detalhado...")
    
    # Testar preflight request
    try:
        response = requests.options(
            f"{WORKERS_URL}/api/profile",
            headers={
                'Origin': PAGES_URL,
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Authorization,Content-Type'
            },
            timeout=10
        )
        
        print(f"   Preflight status: {response.status_code}")
        print(f"   Preflight headers: {dict(response.headers)}")
        
        # Verificar headers CORS
        cors_headers = ['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers']
        for header in cors_headers:
            if header in response.headers:
                print(f"   ✅ {header}: {response.headers[header]}")
            else:
                print(f"   ❌ {header}: não encontrado")
                
    except Exception as e:
        print(f"   ❌ CORS erro: {e}")

def test_frontend_backend_integration():
    """Testa integração completa frontend-backend"""
    print("\n🔗 Testando integração frontend-backend...")
    
    # Simular fluxo completo de login
    print("   1. Testando fluxo de login...")
    
    # Primeiro, vamos verificar se o frontend está acessível
    try:
        response = requests.get(PAGES_URL, timeout=10)
        print(f"   Frontend status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Frontend está no ar")
        else:
            print(f"   ❌ Frontend problema: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Frontend erro: {e}")
    
    # Testar se o frontend consegue se comunicar com o backend
    print("\n   2. Testando comunicação Pages -> Workers...")
    
    # Simular uma requisição do frontend para o backend
    try:
        response = requests.post(
            f"{WORKERS_URL}/api/auth/login",
            json={"email": "test@test.com", "password": "test123"},
            headers={
                "Content-Type": "application/json",
                "Origin": PAGES_URL,
                "Referer": f"{PAGES_URL}/login"
            },
            timeout=10
        )
        
        print(f"   Cross-origin request status: {response.status_code}")
        print(f"   Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("   ✅ Comunicação cross-origin funcionando")
        else:
            print(f"   ⚠️  Cross-origin resposta: {response.text[:100]}")
            
    except Exception as e:
        print(f"   ❌ Cross-origin erro: {e}")

def main():
    """Executa todos os testes detalhados"""
    print("🔬 INICIANDO TESTES DETALHADOS PAGES + WORKERS")
    print("=" * 60)
    print(f"Pages URL: {PAGES_URL}")
    print(f"Workers URL: {WORKERS_URL}")
    print("=" * 60)
    
    test_endpoint_structure()
    test_database_connection()
    test_cors_detailed()
    test_frontend_backend_integration()
    
    print("\n" + "=" * 60)
    print("✅ Testes detalhados concluídos!")
    print("Revise os logs acima para identificar problemas específicos.")

if __name__ == "__main__":
    main()