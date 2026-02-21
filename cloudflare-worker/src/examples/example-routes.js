// src/examples/example-routes.js
// EXEMPLO DE ROTA GET: Buscar perfil por ID
export async function exampleGetRoute(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split('/')[3]; // /api/profiles/123
  
  try {
    const db = new Database(env);
    
    const result = await db.queryWithReturn(
      'SELECT id, nome, email, cargo, avatar_url, created_at FROM public.profiles WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Perfil não encontrado' }),
        { 
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': env.FRONTEND_URL || '*'
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result.rows[0],
        message: 'Perfil encontrado'
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.FRONTEND_URL || '*'
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ message: 'Erro interno do servidor' }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.FRONTEND_URL || '*'
        }
      }
    );
  }
}

// EXEMPLO DE ROTA POST: Criar novo post
export async function examplePostRoute(request, env) {
  try {
    const body = await request.json();
    const { titulo, conteudo, autor_id } = body;

    // Validação
    if (!titulo || !autor_id) {
      return new Response(
        JSON.stringify({ message: 'Título e autor_id são obrigatórios' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': env.FRONTEND_URL || '*'
          }
        }
      );
    }

    const db = new Database(env);
    
    const result = await db.queryWithReturn(
      'INSERT INTO public.posts (titulo, conteudo, autor_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [titulo, conteudo || null, autor_id]
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: result.rows[0],
        message: 'Post criado com sucesso'
      }),
      { 
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.FRONTEND_URL || '*'
        }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ message: 'Erro ao criar post' }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.FRONTEND_URL || '*'
        }
      }
    );
  }
}