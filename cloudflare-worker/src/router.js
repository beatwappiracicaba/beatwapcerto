// src/router.js - Sistema de roteamento
import { profilesHandler } from './handlers/profiles.js';
import { authHandler } from './handlers/auth.js';
import { adminHandler } from './handlers/admin.js';
import { analyticsHandler } from './handlers/analytics.js';
import { songsHandler } from './handlers/songs.js';
import { compositionsHandler } from './handlers/compositions.js';
import { sponsorsHandler } from './handlers/sponsors.js';

export async function router(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  console.log(`[${method}] ${path}`);

  // Auth routes
  if (path === '/api/login' && method === 'POST') {
    return await authHandler.login(request, env);
  }

  // Profiles routes
  if (path.match(/^\/api\/profiles\/([^\/]+)$/)) {
    const id = path.split('/')[3];
    if (method === 'GET') {
      return await profilesHandler.getById(id, env);
    }
  }

  if (path.match(/^\/api\/profiles\/([^\/]+)\/posts$/)) {
    const id = path.split('/')[3];
    if (method === 'GET') {
      return await profilesHandler.getPosts(id, env);
    }
  }

  // Admin routes
  if (path.match(/^\/api\/admin\/artist\/([^\/]+)\/metrics$/)) {
    const id = path.split('/')[4];
    if (method === 'GET') {
      return await adminHandler.getArtistMetrics(id, env);
    }
  }

  // Analytics routes
  if (path.match(/^\/api\/analytics\/artist\/([^\/]+)\/events$/)) {
    const id = path.split('/')[4];
    if (method === 'GET') {
      return await analyticsHandler.getArtistEvents(id, env);
    }
  }

  // Songs routes
  if (path === '/api/songs/mine') {
    if (method === 'GET') {
      return await songsHandler.getMine(request, env);
    }
  }

  // Compositions routes
  if (path === '/api/compositions') {
    if (method === 'GET') {
      return await compositionsHandler.getAll(env);
    }
  }

  // Sponsors routes
  if (path === '/api/sponsors') {
    if (method === 'GET') {
      return await sponsorsHandler.getAll(env);
    }
  }

  // Health check
  if (path === '/api/health') {
    return new Response(
      JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': env.FRONTEND_URL || '*'
        }
      }
    );
  }

  // 404 para rotas não encontradas
  return new Response(
    JSON.stringify({ message: 'Rota não encontrada' }),
    { 
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.FRONTEND_URL || '*'
      }
    }
  );
}