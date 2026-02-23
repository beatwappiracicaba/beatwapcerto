import { corsHeaders, handleCors } from './cors.js';
import { createPool } from './database.js';
import { createArrayResponse } from './response.js';
import { queryWithRetry, testConnection } from './database-utils.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Configurações de segurança
const JWT_SECRET = 'sua-chave-secreta-super-segura-minimo-32-caracteres';
const TOKEN_EXPIRY = '7d';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight requests IMEDIATAMENTE
    if (method === 'OPTIONS') {
      return handleCors();
    }

    let pool;
    try {
      console.log(`🔄 Processing ${method} ${url.pathname}`);

      // Criar pool de conexão com o banco
      pool = createPool(env);
      if (!pool) {
        console.error('❌ Database connection failed');
        return new Response(JSON.stringify({
          success: false,
          error: 'Database connection failed'
        }), {
          status: 503,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

      // Rotas da API
      const pathname = url.pathname;

      // ===== ROTAS DE AUTENTICAÇÃO =====

      // Login
      if (pathname === '/api/auth/login' && method === 'POST') {
        return await handleLogin(request, pool);
      }

      // Registro
      if (pathname === '/api/auth/register' && method === 'POST') {
        return await handleRegister(request, pool);
      }

      // Verificar token
      if (pathname === '/api/auth/verify' && method === 'GET') {
        return await handleVerifyToken(request);
      }

      // ===== ROTAS PÚBLICAS (SEM AUTENTICAÇÃO) =====

      // Health check
      if (pathname === '/health' || pathname === '/api/health') {
        return new Response(JSON.stringify({
          success: true,
          message: 'Worker is alive with real database',
          timestamp: new Date().toISOString(),
          version: 'v4.0.0-real-db'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

      // Listar perfis/profissionais
      if (pathname === '/api/profiles' || pathname === '/api/producers' || pathname === '/api/artists' || pathname === '/api/composers') {
        return await getProfilesByRole(pathname, pool);
      }

      // Listar composições
      if (pathname === '/api/compositions') {
        return await getCompositions(pool);
      }

      // Listar releases/músicas
      if (pathname === '/api/releases' || pathname === '/api/musics') {
        return await getMusics(pool);
      }

      // Listar patrocinadores
      if (pathname === '/api/sponsors') {
        return await getSponsors(pool);
      }

      // Listar usuários por role
      if (pathname === '/api/profiles') {
        const role = url.searchParams.get('role');
        if (role) {
          return await getUsersByRole(role, pool);
        }
        return await getAllUsers(pool);
      }

      // ===== ROTAS COM AUTENTICAÇÃO =====

      // Criar novo usuário (requer auth)
      if (pathname === '/api/profiles' && method === 'POST') {
        return await authenticateAndExecute(request, pool, createUser);
      }

      // Criar nova composição (requer auth)
      if (pathname === '/api/compositions' && method === 'POST') {
        return await authenticateAndExecute(request, pool, createComposition);
      }

      // Criar novo patrocinador (requer auth)
      if (pathname === '/api/sponsors' && method === 'POST') {
        return await authenticateAndExecute(request, pool, createSponsor);
      }

      // 404 para rotas não encontradas
      return new Response(JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        available_endpoints: [
          '/api/auth/login',
          '/api/auth/register',
          '/api/auth/verify',
          '/api/profiles',
          '/api/producers',
          '/api/artists',
          '/api/composers',
          '/api/compositions',
          '/api/releases',
          '/api/musics',
          '/api/sponsors',
          '/api/users',
          '/health'
        ]
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });

    } catch (error) {
      console.error('❌ Worker error:', error.message);

      // Sempre retornar JSON com CORS, mesmo em erro
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    // REMOVIDO: Não fechar o pool no Cloudflare Worker
  }
};

// ===== FUNÇÕES DE AUTENTICAÇÃO =====

async function handleLogin(request, pool) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email e senha são obrigatórios'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Buscar usuário no banco
    const result = await queryWithRetry(pool, 'SELECT id, nome, email, senha, role FROM profiles WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Usuário não encontrado'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    const user = result.rows[0];
    
    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.senha);
    if (!isPasswordValid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Senha inválida'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    // Retornar usuário sem a senha
    const { senha, ...userWithoutPassword } = user;
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
        expiresIn: TOKEN_EXPIRY
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro ao fazer login'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

async function handleRegister(request, pool) {
  try {
    const { nome, email, password, role = 'user' } = await request.json();
    
    if (!nome || !email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Nome, email e senha são obrigatórios'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Verificar se email já existe
    const existingUser = await queryWithRetry(pool, 'SELECT id FROM profiles WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email já cadastrado'
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário
    const result = await queryWithRetry(pool, 'INSERT INTO profiles (nome, email, senha, role) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, role', [nome, email, hashedPassword, role]);
    
    const newUser = result.rows[0];
    
    // Gerar token
    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email, 
        role: newUser.role 
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        user: newUser,
        token,
        expiresIn: TOKEN_EXPIRY
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro ao criar usuário'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

async function handleVerifyToken(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token não fornecido'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    return new Response(JSON.stringify({
      success: true,
      data: { user: decoded }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Token inválido ou expirado'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

// ===== FUNÇÃO DE AUTENTICAÇÃO MIDDLEWARE =====

async function authenticateAndExecute(request, pool, executeFunction) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Autenticação necessária'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    return await executeFunction(request, pool, decoded);
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Token inválido ou expirado'
    }), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

// ===== FUNÇÕES DE DADOS =====

async function getProfilesByRole(pathname, pool) {
  try {
    let role;
    if (pathname === '/api/producers') role = 'Produtor';
    else if (pathname === '/api/artists') role = 'Artista';
    else if (pathname === '/api/composers') role = 'Compositor';
    else role = null; // /api/profiles - todos os perfis
    
    let query;
    let params = [];
    
    if (role) {
      query = `
        SELECT p.id, p.nome, p.cargo, p.avatar_url, p.created_at
        FROM profiles p
        WHERE p.cargo = $1
        ORDER BY p.nome ASC
        LIMIT 50
      `;
      params = [role];
    } else {
      query = `
        SELECT p.id, p.nome, p.cargo, p.avatar_url, p.created_at
        FROM profiles p
        ORDER BY p.nome ASC
        LIMIT 50
      `;
    }
    
    const result = await queryWithRetry(pool, query, params);
    return createArrayResponse(result.rows);
    
  } catch (error) {
    console.error('Profiles error:', error);
    return createArrayResponse([]);
  }
}

async function getCompositions(pool) {
  try {
    const result = await queryWithRetry(pool, `
      SELECT 
        c.id,
        c.titulo,
        c.descricao,
        c.data_criacao,
        c.duracao,
        c.estilo,
        p.nome as autor_nome,
        p.id as autor_id
      FROM compositions c
      LEFT JOIN profiles p ON c.artist_id = p.id
      ORDER BY c.data_criacao DESC
      LIMIT 50
    `);
    
    return createArrayResponse(result.rows);
    
  } catch (error) {
    console.error('Compositions error:', error);
    return createArrayResponse([]);
  }
}

async function getMusics(pool) {
  try {
    const result = await queryWithRetry(pool, `
      SELECT 
        m.id,
        m.titulo,
        m.artista_id,
        m.estilo,
        m.duracao,
        m.release_date,
        m.spotify_url,
        m.youtube_url,
        m.cover_url
      FROM musics m
      ORDER BY m.release_date DESC
      LIMIT 50
    `);
    
    return createArrayResponse(result.rows);
    
  } catch (error) {
    console.error('Musics error:', error);
    return createArrayResponse([]);
  }
}

async function getSponsors(pool) {
  try {
    const result = await queryWithRetry(pool, `
      SELECT 
        s.id,
        s.name,
        s.descricao,
        s.logo_url,
        s.website,
        s.tipo,
        s.created_at
      FROM sponsors s
      ORDER BY s.nome ASC
      LIMIT 50
    `);
    
    return createArrayResponse(result.rows);
    
  } catch (error) {
    console.error('Sponsors error:', error);
    return createArrayResponse([]);
  }
}

async function getUsersByRole(role, pool) {
  try {
    const result = await queryWithRetry(pool, `
      SELECT id, nome, email, role, created_at
      FROM profiles
      WHERE role = $1
      ORDER BY nome ASC
      LIMIT 50
    `, [role]);
    
    return createArrayResponse(result.rows);
    
  } catch (error) {
    console.error('Users by role error:', error);
    return createArrayResponse([]);
  }
}

async function getAllUsers(pool) {
  try {
    const result = await queryWithRetry(pool, `
      SELECT id, nome, email, role, created_at
      FROM profiles
      ORDER BY nome ASC
      LIMIT 50
    `);
    
    return createArrayResponse(result.rows);
    
  } catch (error) {
    console.error('All profiles error:', error);
    return createArrayResponse([]);
  }
}

// ===== FUNÇÕES DE CRIAÇÃO (REQUEREM AUTH) =====

async function createUser(request, pool, user) {
  try {
    const { nome, email, password, role = 'user' } = await request.json();
    
    if (!nome || !email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Nome, email e senha são obrigatórios'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Verificar se email já existe
    const existingUser = await queryWithRetry(pool, 'SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email já cadastrado'
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário
    const result = await queryWithRetry(pool, 'INSERT INTO users (nome, email, senha, role) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, role', [nome, email, hashedPassword, role]);
    
    return new Response(JSON.stringify({
      success: true,
      data: result.rows[0]
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('Create user error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro ao criar usuário'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

async function createComposition(request, pool, user) {
  try {
    const { titulo, descricao, duracao, estilo, artist_id } = await request.json();
    
    if (!titulo) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Título é obrigatório'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    const result = await queryWithRetry(pool, `
      INSERT INTO compositions (titulo, descricao, duracao, estilo, artist_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, titulo, descricao, data_criacao, duracao, estilo
    `, [titulo, descricao, duracao, estilo, artist_id || user.id]);
    
    return new Response(JSON.stringify({
      success: true,
      data: result.rows[0]
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('Create composition error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro ao criar composição'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

async function createSponsor(request, pool, user) {
  try {
    const { name, descricao, logo_url, website, tipo } = await request.json();
    
    if (!name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Nome é obrigatório'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    const result = await queryWithRetry(pool, `
      INSERT INTO sponsors (name, descricao, logo_url, website, tipo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, descricao, logo_url, website, tipo, created_at
    `, [name, descricao, logo_url, website, tipo]);
    
    return new Response(JSON.stringify({
      success: true,
      data: result.rows[0]
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('Create sponsor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro ao criar patrocinador'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}