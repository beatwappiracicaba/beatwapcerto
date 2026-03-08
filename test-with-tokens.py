#!/usr/bin/env python3
"""
Teste detalhado com tokens válidos para verificar endpoints protegidos
"""

import requests
import json
from datetime import datetime

# URLs
PAGES_URL = "https://www.beatwap.com.br"
WORKERS_URL = "https://beatwap-api-worker.beatwappiracicaba.workers.dev"

# Tokens válidos gerados nos testes anteriores
TOKENS = {
    "admin": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjkyZmZiZDlkLTlkOWEtNDYwOC04MTBlLTFlZDg2MTJhYjI0ZCIsImVtYWlsIjoiYWRtaW5AYmVhdHdhcC5jb20iLCJyb2xlIjoiUHJvZHV0b3IiLCJpYXQiOjE3NzIwNDAyMDcsImV4cCI6MTc3MjY0NTAwN30.DovotVYn5g95j6kh6rc2WI1GEix_oYfqHszhFsifR_0",
    "artist": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjdhYjFkYzlkLTI0ZjAtNDk3OS1hMTRhLTkwMDM3N2U2ZWJiMSIsImVtYWlsIjoiYXJ0aXN0QGJlYXR3YXAuY29tIiwicm9sZSI6IkFydGlzdGEiLCJpYXQiOjE3NzIwNDAyMTAsImV4cCI6MTc3MjY0NTAxMH0.OqJsmxnr6uffiH4n7QgbQIVaK5z-g2D8QeKr4BBeQ9w",
    "seller": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNlNzYxN2E0LTM1YTktNGM1Zi1hZjdhLTczNjQxZGNiOWUxNyIsImVtYWlsIjoic2VsbGVyQGJlYXR3YXAuY29tIiwicm9sZSI6IlZlbmRlZG9yIiwiaWF0IjoxNzcyMDQwMjEyLCJleHAiOjE3NzI2NDUwMTJ9.0E7U1YDnpTFLPbWH9Qv1u0Bs9sXmrsEFWhJ1fJV-PX8"
}

def print_test(test_name, success, details=""):
    status = "✅" if success else "❌"
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {status} {test_name}")
    if details:
        print(f"    Detalhes: {details}")
    print()

def test_cors():
    """Testar CORS"""
    print("🔍 Testando CORS...")
    
    headers = {
        "Origin": PAGES_URL,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization"
    }
    
    response = requests.options(f"{WORKERS_URL}/api/profile", headers=headers)
    cors_headers = {
        "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
        "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
        "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers")
    }
    
    success = response.status_code == 204 and cors_headers["Access-Control-Allow-Origin"] == PAGES_URL
    print_test("CORS Preflight", success, f"Status: {response.status_code}, Headers: {cors_headers}")
    return success

def test_profile_with_token(token, user_type):
    """Testar endpoint de profile com token"""
    print(f"🔍 Testando Profile com token {user_type}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Origin": PAGES_URL
    }
    
    response = requests.get(f"{WORKERS_URL}/api/profile", headers=headers)
    
    success = response.status_code == 200
    if success:
        data = response.json()
        print_test(f"Profile - {user_type}", True, f"Status: {response.status_code}, Cargo: {data.get('cargo')}")
    else:
        print_test(f"Profile - {user_type}", False, f"Status: {response.status_code}, Response: {response.text}")
    
    return success

def test_admin_endpoints(token, user_type):
    """Testar endpoints de admin"""
    print(f"🔍 Testando Admin Endpoints com token {user_type}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Origin": PAGES_URL
    }
    
    endpoints = [
        "/api/admin/stats",
        "/api/admin/musics",
        "/api/admin/compositions",
        "/api/admin/sellers"
    ]
    
    results = []
    for endpoint in endpoints:
        response = requests.get(f"{WORKERS_URL}{endpoint}", headers=headers)
        success = response.status_code == 200
        results.append(success)
        print_test(f"Admin {endpoint} - {user_type}", success, f"Status: {response.status_code}")
    
    return all(results)

def test_new_endpoints(token, user_type):
    """Testar novos endpoints"""
    print(f"🔍 Testando Novos Endpoints com token {user_type}...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Origin": PAGES_URL
    }
    
    endpoints = [
        "/api/notifications",
        "/api/chats",
        "/api/admins",
        "/api/queue"
    ]
    
    results = []
    for endpoint in endpoints:
        response = requests.get(f"{WORKERS_URL}{endpoint}", headers=headers)
        success = response.status_code == 200
        results.append(success)
        details = f"Status: {response.status_code}"
        if not success:
            try:
                details += f", Body: {response.text}"
            except Exception:
                pass
        print_test(f"New {endpoint} - {user_type}", success, details)
    
    return all(results)

def main():
    print("🚀 Iniciando Testes Detalhados com Tokens")
    print(f"📅 {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"🔗 Frontend: {PAGES_URL}")
    print(f"🔗 Backend: {WORKERS_URL}")
    print("=" * 60)
    print()
    
    # Testar CORS
    cors_ok = test_cors()
    
    # Testar cada tipo de usuário
    results = {}
    for user_type, token in TOKENS.items():
        print(f"\n{'='*60}")
        print(f"🧪 Testando usuário: {user_type.upper()}")
        print(f"{'='*60}")
        
        profile_ok = test_profile_with_token(token, user_type)
        admin_ok = test_admin_endpoints(token, user_type)
        new_ok = test_new_endpoints(token, user_type)
        
        results[user_type] = {
            "profile": profile_ok,
            "admin": admin_ok,
            "new": new_ok
        }
    
    # Resumo final
    print(f"\n{'='*60}")
    print("📊 RESUMO DOS TESTES")
    print(f"{'='*60}")
    
    total_tests = 0
    passed_tests = 0
    
    for user_type, user_results in results.items():
        print(f"\n👤 {user_type.upper()}:")
        for test_type, result in user_results.items():
            status = "✅" if result else "❌"
            print(f"   {status} {test_type}")
            total_tests += 1
            passed_tests += 1 if result else 0
    
    print(f"\n📈 Total: {passed_tests}/{total_tests} testes passados")
    
    if passed_tests == total_tests:
        print("🎉 Todos os testes passaram!")
    else:
        print("⚠️  Alguns testes falharam. Verifique os detalhes acima.")

if __name__ == "__main__":
    main()
