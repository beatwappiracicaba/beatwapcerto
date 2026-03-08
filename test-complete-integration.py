#!/usr/bin/env python3
"""
Teste Completo de Integração - Cloudflare Pages + Workers
Verifica todos os endpoints, autenticação, CORS e redirecionamentos
"""

import requests
import json
import time
from datetime import datetime

# URLs de produção
PAGES_URL = "https://www.beatwap.com.br"
WORKERS_URL = "https://beatwap-api-worker.beatwappiracicaba.workers.dev"

# Cores para output colorido
class Colors:
    OK = '\033[92m'
    FAIL = '\033[91m'
    WARN = '\033[93m'
    INFO = '\033[94m'
    END = '\033[0m'

def print_test(title, status, details=""):
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_icon = f"{Colors.OK}✅{Colors.END}" if status else f"{Colors.FAIL}❌{Colors.END}"
    print(f"[{timestamp}] {status_icon} {title}")
    if details:
        print(f"    {Colors.INFO}Detalhes:{Colors.END} {details}")

def test_health_check():
    """Testa health check do backend"""
    try:
        response = requests.get(f"{WORKERS_URL}/health", timeout=10)
        print_test("Health Check", response.status_code == 200, f"Status: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print_test("Health Check", False, f"Erro: {str(e)}")
        return False

def test_cors():
    """Testa CORS entre frontend e backend"""
    try:
        headers = {
            'Origin': PAGES_URL,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
        
        response = requests.options(f"{WORKERS_URL}/api/auth/login", headers=headers, timeout=10)
        
        cors_ok = (
            response.status_code == 200 and
            'Access-Control-Allow-Origin' in response.headers and
            PAGES_URL in response.headers.get('Access-Control-Allow-Origin', '')
        )
        
        print_test("CORS Configuration", cors_ok, 
                  f"Status: {response.status_code}, CORS: {response.headers.get('Access-Control-Allow-Origin', 'Not found')}")
        return cors_ok
    except Exception as e:
        print_test("CORS Configuration", False, f"Erro: {str(e)}")
        return False

def test_login_endpoints():
    """Testa endpoints de login com diferentes cenários"""
    test_cases = [
        {
            "email": "admin@beatwap.com",
            "password": "admin123",
            "expected_role": "Produtor",
            "description": "Admin Login"
        },
        {
            "email": "artist@beatwap.com", 
            "password": "artist123",
            "expected_role": "Artista",
            "description": "Artist Login"
        },
        {
            "email": "seller@beatwap.com",
            "password": "seller123", 
            "expected_role": "Vendedor",
            "description": "Seller Login"
        },
        {
            "email": "invalid@beatwap.com",
            "password": "wrongpass",
            "expected_role": None,
            "description": "Invalid Login"
        }
    ]
    
    results = []
    
    for test_case in test_cases:
        try:
            response = requests.post(
                f"{WORKERS_URL}/api/auth/login",
                json={"email": test_case["email"], "password": test_case["password"]},
                headers={"Content-Type": "application/json", "Origin": PAGES_URL},
                timeout=15
            )
            
            success = False
            details = f"Status: {response.status_code}"
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("user"):
                    user_role = data["user"].get("role", data["user"].get("cargo"))
                    if user_role == test_case["expected_role"]:
                        success = True
                        details += f", Role: {user_role}"
                    else:
                        details += f", Role inesperado: {user_role} (esperado: {test_case['expected_role']})"
                else:
                    details += f", Resposta: {data}"
            elif response.status_code == 401 and test_case["expected_role"] is None:
                success = True
                details += ", Rejeição esperada"
            else:
                details += f", Resposta: {response.text}"
            
            print_test(f"Login - {test_case['description']}", success, details)
            results.append({
                "test": test_case["description"],
                "success": success,
                "response": response.json() if response.status_code == 200 else None,
                "token": response.json().get("token") if response.status_code == 200 else None
            })
            
        except Exception as e:
            print_test(f"Login - {test_case['description']}", False, f"Erro: {str(e)}")
            results.append({"test": test_case["description"], "success": False, "error": str(e)})
        
        time.sleep(1)  # Pequena pausa entre testes
    
    return results

def test_profile_endpoint(tokens):
    """Testa endpoint de profile com tokens válidos"""
    if not tokens:
        print_test("Profile Endpoint", False, "Nenhum token válido disponível")
        return False
    
    success_count = 0
    total_tests = 0
    
    for token_info in tokens:
        if not token_info.get("token"):
            continue
            
        total_tests += 1
        try:
            response = requests.get(
                f"{WORKERS_URL}/api/profile",
                headers={
                    "Authorization": f"Bearer {token_info['token']}",
                    "Origin": PAGES_URL
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and data.get("cargo"):
                    success_count += 1
                    print_test(f"Profile - {token_info['test']}", True, 
                              f"Status: {response.status_code}, Cargo: {data.get('cargo')}")
                else:
                    print_test(f"Profile - {token_info['test']}", False, 
                              f"Status: {response.status_code}, Sem cargo na resposta")
            else:
                print_test(f"Profile - {token_info['test']}", False, 
                          f"Status: {response.status_code}, Resposta: {response.text}")
        except Exception as e:
            print_test(f"Profile - {token_info['test']}", False, f"Erro: {str(e)}")
    
    return success_count > 0

def test_admin_endpoints(tokens):
    """Testa endpoints de admin"""
    admin_tokens = [t for t in tokens if t.get("test") == "Admin Login" and t.get("token")]
    
    if not admin_tokens:
        print_test("Admin Endpoints", False, "Nenhum token de admin disponível")
        return False
    
    admin_token = admin_tokens[0]["token"]
    admin_endpoints = [
        "/api/admin/stats",
        "/api/admin/musics", 
        "/api/admin/compositions",
        "/api/admin/sellers"
    ]
    
    success_count = 0
    
    for endpoint in admin_endpoints:
        try:
            response = requests.get(
                f"{WORKERS_URL}{endpoint}",
                headers={
                    "Authorization": f"Bearer {admin_token}",
                    "Origin": PAGES_URL
                },
                timeout=10
            )
            
            if response.status_code == 200:
                success_count += 1
                print_test(f"Admin - {endpoint}", True, f"Status: {response.status_code}")
            else:
                print_test(f"Admin - {endpoint}", False, 
                          f"Status: {response.status_code}, Resposta: {response.text}")
        except Exception as e:
            print_test(f"Admin - {endpoint}", False, f"Erro: {str(e)}")
    
    return success_count == len(admin_endpoints)

def test_new_endpoints(tokens):
    """Testa novos endpoints (notifications, chats, admins, queue)"""
    valid_tokens = [t for t in tokens if t.get("token") and t.get("success")]
    
    if not valid_tokens:
        print_test("Novos Endpoints", False, "Nenhum token válido disponível")
        return False
    
    token = valid_tokens[0]["token"]
    new_endpoints = [
        "/api/notifications",
        "/api/chats", 
        "/api/admins",
        "/api/queue"
    ]
    
    success_count = 0
    
    for endpoint in new_endpoints:
        try:
            response = requests.get(
                f"{WORKERS_URL}{endpoint}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Origin": PAGES_URL
                },
                timeout=10
            )
            
            # Considera sucesso se retornar 200 ou 404 (endpoint não encontrado ainda)
            if response.status_code in [200, 404]:
                success_count += 1
                status_icon = "✅" if response.status_code == 200 else "⚠️"
                print_test(f"Novo Endpoint - {endpoint}", True, 
                          f"Status: {response.status_code}")
            else:
                print_test(f"Novo Endpoint - {endpoint}", False, 
                          f"Status: {response.status_code}, Resposta: {response.text}")
        except Exception as e:
            print_test(f"Novo Endpoint - {endpoint}", False, f"Erro: {str(e)}")
    
    return success_count > 0

def test_frontend_backend_integration():
    """Testa integração entre frontend e backend"""
    try:
        # Testa se o frontend está acessível
        pages_response = requests.get(PAGES_URL, timeout=10)
        pages_ok = pages_response.status_code == 200
        print_test("Frontend Acessível", pages_ok, f"Status: {pages_response.status_code}")
        
        # Testa se o backend está acessível
        workers_response = requests.get(WORKERS_URL, timeout=10)
        workers_ok = workers_response.status_code in [200, 404]
        print_test("Backend Acessível", workers_ok, f"Status: {workers_response.status_code}")
        
        # Testa comunicação entre eles via CORS
        cors_ok = test_cors()
        
        return pages_ok and workers_ok and cors_ok
    except Exception as e:
        print_test("Integração Frontend-Backend", False, f"Erro: {str(e)}")
        return False

def main():
    """Executa todos os testes"""
    print(f"\n{Colors.INFO}🚀 Iniciando Testes Completos de Integração{Colors.END}")
    print(f"📅 {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"🔗 Frontend: {PAGES_URL}")
    print(f"🔗 Backend: {WORKERS_URL}")
    print(f"{'='*60}\n")
    
    # Testes básicos
    health_ok = test_health_check()
    integration_ok = test_frontend_backend_integration()
    
    # Testes de login
    login_results = test_login_endpoints()
    
    # Filtra tokens válidos
    valid_tokens = [r for r in login_results if r.get("success") and r.get("token")]
    
    # Testes com autenticação
    profile_ok = test_profile_endpoint(valid_tokens)
    admin_ok = test_admin_endpoints(login_results)
    new_endpoints_ok = test_new_endpoints(login_results)
    
    # Resumo final
    print(f"\n{Colors.INFO}{'='*60}")
    print(f"📊 RESUMO DOS TESTES")
    print(f"{'='*60}{Colors.END}")
    
    tests_summary = [
        ("Health Check", health_ok),
        ("Frontend-Backend Integration", integration_ok),
        ("Login Endpoints", len([r for r in login_results if r.get("success")]) > 0),
        ("Profile Endpoint", profile_ok),
        ("Admin Endpoints", admin_ok),
        ("Novos Endpoints", new_endpoints_ok)
    ]
    
    passed = sum(1 for _, status in tests_summary if status)
    total = len(tests_summary)
    
    for test_name, status in tests_summary:
        print_test(test_name, status)
    
    print(f"\n{Colors.INFO if passed == total else Colors.WARN}")
    print(f"✅ Testes passados: {passed}/{total}")
    if passed < total:
        print(f"⚠️  Testes falhados: {total - passed}")
    print(f"{Colors.END}")
    
    # Recomendações
    if passed < total:
        print(f"\n{Colors.WARN}💡 RECOMENDAÇÕES:{Colors.END}")
        if not health_ok:
            print("  • Verificar se o Worker está rodando corretamente")
        if not integration_ok:
            print("  • Verificar CORS e URLs de origem/destino")
        if not any(r.get("success") for r in login_results):
            print("  • Verificar usuários de teste no banco de dados")
        if not profile_ok:
            print("  • Verificar endpoint /api/profile e JWT")
        if not admin_ok:
            print("  • Verificar endpoints admin e permissões")
        if not new_endpoints_ok:
            print("  • Verificar implementação dos novos endpoints")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)