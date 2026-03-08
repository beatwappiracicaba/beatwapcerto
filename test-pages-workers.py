#!/usr/bin/env python3
import requests
import json
import sys

# Configurações
API_BASE_URL = 'https://beatwap-api-worker.beatwappiracicaba.workers.dev'
FRONTEND_URL = 'https://www.beatwap.com.br'

print('🧪 Iniciando testes de integração entre Pages e Workers...\n')

def test_login():
    print('1. Testando login...')
    try:
        response = requests.post(
            f'{API_BASE_URL}/api/auth/login',
            json={
                'email': 'test@example.com',
                'password': 'test123'
            },
            timeout=10
        )
        
        print(f'   Status: {response.status_code}')
        
        if response.status_code == 200:
            data = response.json()
            print('   ✅ Login funcionou')
            return {'success': True, 'token': data.get('token'), 'user': data.get('user')}
        else:
            print('   ❌ Login falhou')
            print(f'   Resposta: {response.text}')
            return {'success': False}
            
    except requests.exceptions.RequestException as e:
        print(f'   ❌ Erro no login: {e}')
        return {'success': False}

def test_profile(token):
    print('\n2. Testando profile...')
    try:
        response = requests.get(
            f'{API_BASE_URL}/api/profile',
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        print(f'   Status: {response.status_code}')
        
        if response.status_code == 200:
            data = response.json()
            print('   ✅ Profile funcionou')
            print(f'   Cargo: {data.get("cargo", "Não encontrado")}')
            return {'success': True, 'profile': data}
        else:
            print('   ❌ Profile falhou')
            print(f'   Resposta: {response.text}')
            return {'success': False}
            
    except requests.exceptions.RequestException as e:
        print(f'   ❌ Erro no profile: {e}')
        return {'success': False}

def test_admin_endpoints(token):
    print('\n3. Testando endpoints admin...')
    endpoints = [
        '/api/admin/stats',
        '/api/admin/musics',
        '/api/admin/compositions',
        '/api/admin/sellers'
    ]
    
    success_count = 0
    
    for endpoint in endpoints:
        try:
            response = requests.get(
                f'{API_BASE_URL}{endpoint}',
                headers={'Authorization': f'Bearer {token}'},
                timeout=10
            )
            
            print(f'   {endpoint}: {response.status_code}')
            
            if response.status_code == 200:
                success_count += 1
            else:
                print(f'     Resposta: {response.text[:100]}...')
                
        except requests.exceptions.RequestException as e:
            print(f'   {endpoint}: Erro - {e}')
    
    success = success_count == len(endpoints)
    print(f'   {"✅" if success else "❌"} Admin endpoints: {success_count}/{len(endpoints)}')
    return {'success': success}

def test_notifications(token):
    print('\n4. Testando notificações...')
    try:
        response = requests.get(
            f'{API_BASE_URL}/api/notifications',
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        print(f'   Status: {response.status_code}')
        
        if response.status_code == 200:
            print('   ✅ Notificações funcionaram')
            return {'success': True}
        else:
            print('   ❌ Notificações falharam')
            print(f'   Resposta: {response.text}')
            return {'success': False}
            
    except requests.exceptions.RequestException as e:
        print(f'   ❌ Erro nas notificações: {e}')
        return {'success': False}

def test_chats(token):
    print('\n5. Testando chats...')
    try:
        response = requests.get(
            f'{API_BASE_URL}/api/chats',
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        print(f'   Status: {response.status_code}')
        
        if response.status_code == 200:
            print('   ✅ Chats funcionaram')
            return {'success': True}
        else:
            print('   ❌ Chats falharam')
            print(f'   Resposta: {response.text}')
            return {'success': False}
            
    except requests.exceptions.RequestException as e:
        print(f'   ❌ Erro nos chats: {e}')
        return {'success': False}

def test_queue(token):
    print('\n6. Testando queue...')
    try:
        response = requests.get(
            f'{API_BASE_URL}/api/queue',
            headers={'Authorization': f'Bearer {token}'},
            timeout=10
        )
        
        print(f'   Status: {response.status_code}')
        
        if response.status_code == 200:
            print('   ✅ Queue funcionou')
            return {'success': True}
        else:
            print('   ❌ Queue falhou')
            print(f'   Resposta: {response.text}')
            return {'success': False}
            
    except requests.exceptions.RequestException as e:
        print(f'   ❌ Erro na queue: {e}')
        return {'success': False}

def test_cors():
    print('\n7. Testando CORS...')
    try:
        # Testar se o backend aceita requisições do frontend
        response = requests.options(
            f'{API_BASE_URL}/api/profile',
            headers={
                'Origin': FRONTEND_URL,
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Authorization'
            },
            timeout=10
        )
        
        print(f'   CORS Status: {response.status_code}')
        
        has_correct_headers = 'Access-Control-Allow-Origin' in response.headers
        print(f'   CORS Headers: {"Presentes" if has_correct_headers else "Ausentes"}')
        
        if has_correct_headers:
            print(f'   Access-Control-Allow-Origin: {response.headers.get("Access-Control-Allow-Origin")}')
        
        success = response.status_code in [200, 204] and has_correct_headers
        print(f'   {"✅" if success else "❌"} CORS: {"Configurado corretamente" if success else "Problemas detectados"}')
        return {'success': success}
        
    except requests.exceptions.RequestException as e:
        print(f'   ❌ Erro no CORS: {e}')
        return {'success': False}

def main():
    test_results = {
        'login': False,
        'profile': False,
        'admin': False,
        'notifications': False,
        'chats': False,
        'queue': False,
        'cors': False
    }

    try:
        # Testar login básico
        login_result = test_login()
        test_results['login'] = login_result['success']
        
        if login_result['success'] and login_result.get('token'):
            token = login_result['token']
            
            # Testar profile com token
            profile_result = test_profile(token)
            test_results['profile'] = profile_result['success']
            
            # Testar endpoints admin
            admin_result = test_admin_endpoints(token)
            test_results['admin'] = admin_result['success']
            
            # Testar notificações
            notifications_result = test_notifications(token)
            test_results['notifications'] = notifications_result['success']
            
            # Testar chats
            chats_result = test_chats(token)
            test_results['chats'] = chats_result['success']
            
            # Testar queue
            queue_result = test_queue(token)
            test_results['queue'] = queue_result['success']
            
            # Testar CORS
            cors_result = test_cors()
            test_results['cors'] = cors_result['success']
        
        # Mostrar resumo
        print('\n📊 RESUMO DOS TESTES:')
        print('==================')
        for test, success in test_results.items():
            status = '✅ SUCESSO' if success else '❌ FALHOU'
            print(f'{status}: {test.upper()}')
        
        total_success = sum(test_results.values())
        total_tests = len(test_results)
        print(f'\n🎯 Total: {total_success}/{total_tests} testes passaram')
        
        if total_success == total_tests:
            print('🎉 Todos os testes passaram! Sistema está funcionando corretamente.')
        else:
            print('⚠️  Alguns testes falharam. Verifique os logs acima.')
            
    except Exception as e:
        print(f'💥 Erro durante os testes: {e}')

if __name__ == '__main__':
    main()