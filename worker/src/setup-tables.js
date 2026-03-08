import { queryWithRetry } from './database-utils.js';
import { createResponse } from './response.js';

export async function setupTables(pool, request) {
  try {
    const queries = [
      // Projects table
      `CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        author_id UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        status TEXT DEFAULT 'draft'
      )`,
      // Queue table
      `CREATE TABLE IF NOT EXISTS queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        data JSONB DEFAULT '{}',
        created_by UUID REFERENCES profiles(id),
        processed_by UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        user_role TEXT
      )`,
      // Chats table
      `CREATE TABLE IF NOT EXISTS chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        participant_ids UUID[] NOT NULL,
        type TEXT DEFAULT 'support',
        status TEXT DEFAULT 'active',
        metadata JSONB DEFAULT '{}',
        assigned_to UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES profiles(id),
        receiver_id UUID REFERENCES profiles(id),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        type TEXT DEFAULT 'text',
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        titulo TEXT NOT NULL,
        mensagem TEXT NOT NULL,
        tipo TEXT DEFAULT 'info',
        lida BOOLEAN DEFAULT false,
        usuario_id UUID REFERENCES profiles(id),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      // Music Metrics table
      `CREATE TABLE IF NOT EXISTS music_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        artist_id UUID REFERENCES profiles(id),
        external_plays BIGINT DEFAULT 0,
        monthly_listeners BIGINT DEFAULT 0,
        estimated_revenue DECIMAL(10, 2) DEFAULT 0,
        period_start DATE,
        period_end DATE,
        source TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      // Ensure profiles table has all required columns
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS genero_musical TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spotify_url TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deezer_url TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tiktok_url TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS site_url TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tema TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cep TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logradouro TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS complemento TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bairro TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cidade TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS estado TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nome_completo_razao_social TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS celular TEXT`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT`
    ];

    const results = [];
    for (const query of queries) {
      try {
        await queryWithRetry(pool, query);
        results.push({ success: true, query: query.substring(0, 50) + '...' });
      } catch (e) {
        results.push({ success: false, error: e.message, query: query.substring(0, 50) + '...' });
      }
    }

    return createResponse(true, { results }, null, 200, request);
  } catch (error) {
    return createResponse(false, null, 'Erro ao configurar tabelas: ' + error.message, 500, request);
  }
}
