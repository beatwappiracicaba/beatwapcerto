export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/debug/env') {
      return new Response(JSON.stringify({
        hasDatabaseUrl: !!env.DATABASE_URL,
        hasHyperdrive: !!env.DB,
        envKeys: Object.keys(env),
        databaseUrlLength: env.DATABASE_URL ? env.DATABASE_URL.length : 0,
        databaseUrlStart: env.DATABASE_URL ? env.DATABASE_URL.substring(0, 50) : null
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    return new Response('Use /debug/env para ver variáveis de ambiente', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};