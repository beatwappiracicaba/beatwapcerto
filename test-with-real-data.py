#!/usr/bin/env python3
"""
Teste de integração real entre Cloudflare Pages e Workers
Usa dados reais do banco de dados para validar funcionalidade
"""

import requests
import json

# URLs de produção
PAGES_URL = "https://www.beatwap.com.br"
WORKERS_URL = "https://beatwap-api-worker.beatwappiracicaba.workers.dev"

def test_cors():
    """Testa CORS entre Pages e Workers"""
    print("🌐 Testando CORS...")
    try:
        response = requests.options(
            f"{WORKERS_URL}/api/profile",
            headers={
                'Origin': PAGES_URL,
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Authorization'
            },
            timeout=10
        )
        
        print(f"   Status CORS: {response.status_code}")
        if 'Access-Control-Allow-Origin' in response.headers:
            print(f"   CORS Origin: {response.headers['Access-Control-Allow-Origin']}")
            return True
        else:
            print("   ❌ CORS não configurado")
            return False
            
    except Exception as e:
        print(f"   ❌ Erro CORS: {e}")
        return False

def test_login_with_real_user():
    """Testa login com usuário real do banco"""
    print("\n🔐 Testando login com usuário real...")
    
    # Dados de teste baseados no que vimos no código
    test_users = [
        {"email": "admin@beatwap.com", "password": "admin123", "expected_role": "Produtor"},
        {"email": "artist@beatwap.com", "password": "artist123", "expected_role": "Artista"},
        {"email": "seller@beatwap.com", "password": "seller123", "expected_role": "Vendedor"},
        {"email": "composer@beatwap.com", "password": "composer123", "expected_role": "Compositor"}
    ]
    
    for user in test_users:
        print(f"\n   Testando: {user['email']} (esperado: {user['expected_role']})")
        try:
            response = requests.post(
                f"{WORKERS_URL}/api/auth/login",
                json={
                    "email": user["email"],
                    "password": user["password"]
                },
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Login bem-sucedido")
                print(f"   Usuário: {data.get('user', {})}")
                
                # Testar token
                if 'token' in data:
                    return test_profile_with_token(data['token'], user['expected_role'])
                else:
                    print("   ❌ Token não encontrado")
                    return False
            else:
                print(f"   ❌ Login falhou: {response.text}")
                
        except Exception as e:
            print(f"   ❌ Erro: {e}")
    
    return False

def test_profile_with_token(token, expected_role):
    """Testa profile com token JWT"""
    print(f"\n👤 Testando profile com token... (esperado: {expected_role})")
    try:
        response = requests.get(
            f"{WORKERS_URL}/api/profile",
            headers={
                "Authorization": f"Bearer {token}",
                "Origin": PAGES_URL
            },
            timeout=10
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Profile carregado")
            print(f"   Dados: {data}")
            
            # Verificar cargo
            actual_role = data.get('cargo', 'Desconhecido')
            print(f"   Cargo encontrado: {actual_role}")
            
            # Testar endpoints baseado no cargo
            return test_endpoints_by_role(token, actual_role)
        else:
            print(f"   ❌ Profile falhou: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erro: {e}")
        return False

def test_endpoints_by_role(token, role):
    """Testa endpoints baseado no cargo do usuário"""
    print(f"\n🎯 Testando endpoints para cargo: {role}")
    
    endpoints = []
    
    if role == 'Produtor':
        endpoints = [
            f"{WORKERS_URL}/api/admin/stats",
            f"{WORKERS_URL}/api/admin/musics",
            f"{WORKERS_URL}/api/admin/compositions",
            f"{WORKERS_URL}/api/admin/sellers"
        ]
    elif role in ['Artista', 'Compositor']:
        endpoints = [
            f"{WORKERS_URL}/api/notifications",
            f"{WORKERS_URL}/api/chats",
            f"{WORKERS_URL}/api/queue"
        ]
    elif role == 'Vendedor':
        endpoints = [
            f"{WORKERS_URL}/api/notifications",
            f"{WORKERS_URL}/api/chats"
        ]
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Origin": PAGES_URL
    }
    
    success_count = 0
    
    for endpoint in endpoints:
        endpoint_name = endpoint.split('/')[-1]
        print(f"\n   Testando {endpoint_name}...")
        
        try:
            response = requests.get(endpoint, headers=headers, timeout=10)
            
            if response.status_code == 200:
                print(f"   ✅ {endpoint_name} - OK")
                success_count += 1
            else:
                print(f"   ❌ {endpoint_name} - Status: {response.status_code}")
                print(f"      Resposta: {response.text[:100]}...")
                
        except Exception as e:
            print(f"   ❌ {endpoint_name} - Erro: {e}")
    
    print(f"\n   Resultado: {success_count}/{len(endpoints)} endpoints funcionando")
    return success_count > 0

def test_public_endpoints():
    """Testa endpoints públicos"""
    print("\n🌍 Testando endpoints públicos...")
    
    endpoints = [
        f"{WORKERS_URL}/api/health",
        f"{WORKERS_URL}/api/auth/register"
    ]
    
    for endpoint in endpoints:
        print(f"\n   Testando: {endpoint}")
        try:
            response = requests.get(endpoint, timeout=10)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ Endpoint funcionando")
            else:
                print(f"   ❌ Endpoint falhou")
                
        except Exception as e:
            print(f"   ❌ Erro: {e}")

def main():
    """Executa todos os testes"""
    print("🧪 INICIANDO TESTES DE INTEGRAÇÃO PAGES + WORKERS")
    print("=" * 60)
    print(f"Pages URL: {PAGES_URL}")
    print(f"Workers URL: {WORKERS_URL}")
    print("=" * 60)
    
    # Testar CORS
    cors_ok = test_cors()
    
    # Testar login com usuário real
    login_ok = test_login_with_real_user()
    
    # Testar endpoints públicos
    test_public_endpoints()
    
    print("\n" + "=" * 60)
    print("📊 RESUMO DOS TESTES:")
    print(f"CORS: {'✅' if cors_ok else '❌'}")
    print(f"Login: {'✅' if login_ok else '❌'}")
    print("=" * 60)
    
    if cors_ok and login_ok:
        print("🎉 Testes concluídos com sucesso!")
    else:
        print("⚠️  Alguns testes falharam. Verifique os logs acima.")

if __name__ == "__main__":
    main()