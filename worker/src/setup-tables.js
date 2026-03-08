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
      )`
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
