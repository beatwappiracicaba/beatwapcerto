import { getAllProfiles, getProfileById, getByRole } from './handlers/profiles.js';
import { getAdminStats, getAdminMusics, getAdminCompositions, getAdminSellers } from './handlers/admin.js';
import { getAllArtists, getArtistById } from './handlers/artists.js';
import { getAllProducers, getProducerById } from './handlers/producers.js';
import { getAllComposers, getComposerById } from './handlers/composers.js';
import { getAllCompositions, getCompositionById } from './handlers/compositions.js';
import { getAllSponsors, getSponsorById } from './handlers/sponsors.js';
import { getAllMusics, getMusicById, getReleases } from './handlers/musics.js';
import { getAllUsers, getUserById } from './handlers/users.js';
import { authHandler } from './handlers/auth.js';

export async function handleRequest(path, pool, env, request = null) {
  const url = new URL(path, 'http://localhost');
  const pathname = url.pathname;
  
  // Health check
  if (pathname === '/health') {
    return { success: true, data: { status: 'ok', timestamp: new Date().toISOString() } };
  }
  
  // Auth endpoints
  if (pathname === '/api/auth/login') {
    return await authHandler.login(env.request, env);
  }
  
  // Admin endpoints
  if (pathname === '/api/admin/stats') {
    return await getAdminStats(pool, url.searchParams);
  }
  
  if (pathname === '/api/admin/musics') {
    return await getAdminMusics(pool, url.searchParams);
  }
  
  if (pathname === '/api/admin/compositions') {
    return await getAdminCompositions(pool, url.searchParams);
  }
  
  if (pathname === '/api/admin/sellers') {
    return await getAdminSellers(pool, url.searchParams);
  }
  
  // Profile endpoint for current user
  if (pathname === '/api/profile') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Token não fornecido' };
    }
    
    try {
      const token = authHeader.split(' ')[1];
      const jwt = await import('./utils/jwt.js');
      const decoded = jwt.verifyToken(token, env.JWT_SECRET);
      
      if (decoded && decoded.id) {
        return await getProfileById(pool, decoded.id, request);
      } else {
        return { success: false, error: 'Token inválido' };
      }
    } catch (error) {
      return { success: false, error: 'Erro ao verificar token' };
    }
  }
  
  // Profiles endpoints
  if (pathname === '/api/profiles') {
    return await getAllProfiles(pool, request);
  }
  
  if (pathname.match(/^\/api\/profiles\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getProfileById(pool, id, request);
  }
  
  // Artists endpoints
  if (pathname === '/api/artists') {
    return await getAllArtists(pool, request);
  }
  
  if (pathname.match(/^\/api\/artists\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getArtistById(pool, id, request);
  }
  
  // Producers endpoints
  if (pathname === '/api/producers') {
    return await getAllProducers(pool, request);
  }
  
  if (pathname.match(/^\/api\/producers\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getProducerById(pool, id, request);
  }
  
  // Composers endpoints
  if (pathname === '/api/composers') {
    return await getAllComposers(pool, request);
  }
  
  if (pathname.match(/^\/api\/composers\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getComposerById(pool, id, request);
  }
  
  // Compositions endpoints
  if (pathname === '/api/compositions') {
    return await getAllCompositions(pool, request);
  }
  
  if (pathname.match(/^\/api\/compositions\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getCompositionById(pool, id, request);
  }
  
  // Sponsors endpoints
  if (pathname === '/api/sponsors') {
    return await getAllSponsors(pool, request);
  }
  
  if (pathname.match(/^\/api\/sponsors\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getSponsorById(pool, id, request);
  }
  
  // Musics endpoints
  if (pathname === '/api/musics') {
    return await getAllMusics(pool, request);
  }
  
  if (pathname.match(/^\/api\/musics\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getMusicById(pool, id, request);
  }
  
  // Releases endpoints (músicas com release_date)
  if (pathname === '/api/releases') {
    return await getReleases(pool, request);
  }
  
  // Users endpoints
  if (pathname === '/api/users') {
    return await getAllUsers(pool, request);
  }
  
  if (pathname.match(/^\/api\/users\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getUserById(pool, id, request);
  }
  
  // Role-based endpoints
  if (pathname === '/api/artists') {
    return await getByRole(pool, 'Artista', request);
  }
  
  if (pathname === '/api/producers') {
    return await getByRole(pool, 'Produtor', request);
  }
  
  if (pathname === '/api/composers') {
    return await getByRole(pool, 'Compositor', request);
  }
  
  return { success: false, error: 'Endpoint não encontrado' };
}
