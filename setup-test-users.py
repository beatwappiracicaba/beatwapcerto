#!/usr/bin/env python3
"""
Script para verificar e criar usuários de teste no banco de dados
"""

import psycopg2
import bcrypt
from datetime import datetime

# Configuração do banco (usando as mesmas credenciais do worker)
DB_CONFIG = {
    "host": "postgresql-208539-0.cloudclusters.net",
    "port": 19931,
    "database": "BeatWap",
    "user": "Alangodoy",
    "password": "@Aggtr4907"
}

def create_test_users():
    """Cria usuários de teste no banco"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Verifica se a tabela existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'profiles'
            );
        """)
        
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            print("❌ Tabela 'profiles' não existe. Criando...")
            cursor.execute("""
                CREATE TABLE public.profiles (
                    id SERIAL PRIMARY KEY,
                    nome VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    cargo VARCHAR(100),
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            print("✅ Tabela 'profiles' criada com sucesso!")
        
        # Usuários de teste
        test_users = [
            {
                "nome": "Admin Teste",
                "email": "admin@beatwap.com",
                "cargo": "Produtor",
                "password": "admin123"
            },
            {
                "nome": "Artista Teste",
                "email": "artist@beatwap.com",
                "cargo": "Artista",
                "password": "artist123"
            },
            {
                "nome": "Vendedor Teste",
                "email": "seller@beatwap.com",
                "cargo": "Vendedor",
                "password": "seller123"
            },
            {
                "nome": "Compositor Teste",
                "email": "composer@beatwap.com",
                "cargo": "Compositor",
                "password": "composer123"
            }
        ]
        
        for user in test_users:
            # Verifica se o usuário já existe
            cursor.execute("SELECT id FROM profiles WHERE email = %s", (user["email"],))
            if cursor.fetchone():
                print(f"⚠️  Usuário {user['email']} já existe. Atualizando...")
                
                # Atualiza o usuário existente
                password_hash = bcrypt.hashpw(user["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cursor.execute("""
                    UPDATE profiles 
                    SET nome = %s, cargo = %s, password_hash = %s, updated_at = %s
                    WHERE email = %s
                """, (user["nome"], user["cargo"], password_hash, datetime.now(), user["email"]))
            else:
                # Cria novo usuário
                password_hash = bcrypt.hashpw(user["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cursor.execute("""
                    INSERT INTO profiles (nome, email, cargo, password_hash)
                    VALUES (%s, %s, %s, %s)
                """, (user["nome"], user["email"], user["cargo"], password_hash))
                print(f"✅ Usuário {user['email']} criado com sucesso!")
        
        conn.commit()
        
        # Lista todos os usuários
        cursor.execute("SELECT id, nome, email, cargo FROM profiles ORDER BY id")
        users = cursor.fetchall()
        
        print(f"\n📋 Usuários no banco de dados:")
        for user in users:
            print(f"   ID: {user[0]} | Nome: {user[1]} | Email: {user[2]} | Cargo: {user[3]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao criar usuários: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def verify_database_structure():
    """Verifica a estrutura do banco de dados"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Verifica estrutura da tabela
        cursor.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'profiles' 
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        
        print("📊 Estrutura da tabela 'profiles':")
        for col in columns:
            print(f"   {col[0]}: {col[1]} (nullable: {col[2]})")
        
        # Conta total de usuários
        cursor.execute("SELECT COUNT(*) FROM profiles")
        count = cursor.fetchone()[0]
        print(f"\n📈 Total de usuários: {count}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao verificar estrutura: {e}")
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def main():
    print("🔧 Verificando e criando usuários de teste...")
    print("="*50)
    
    # Verifica estrutura do banco
    verify_database_structure()
    
    print("\n" + "="*50)
    
    # Cria/atualiza usuários de teste
    success = create_test_users()
    
    if success:
        print(f"\n✅ Processo concluído com sucesso!")
        print(f"\n📝 Dados para teste:")
        print(f"   • Admin: admin@beatwap.com / admin123")
        print(f"   • Artista: artist@beatwap.com / artist123") 
        print(f"   • Vendedor: seller@beatwap.com / seller123")
        print(f"   • Compositor: composer@beatwap.com / composer123")
    else:
        print(f"\n❌ Processo falhou!")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)