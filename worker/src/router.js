import { getAllProfiles, getProfileById, getByRole } from './handlers/profiles.js';
import { getAllArtists, getArtistById } from './handlers/artists.js';
import { getAllProducers, getProducerById } from './handlers/producers.js';
import { getAllComposers, getComposerById } from './handlers/composers.js';
import { getAllCompositions, getCompositionById } from './handlers/compositions.js';
import { getAllSponsors, getSponsorById } from './handlers/sponsors.js';
import { getAllMusics, getMusicById, getReleases } from './handlers/musics.js';
import { getAllUsers, getUserById } from './handlers/users.js';
import { authHandler } from './handlers/auth.js';

export async function handleRequest(path, pool, env) {
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
  
  // Profiles endpoints
  if (pathname === '/api/profiles') {
    return await getAllProfiles(pool);
  }
  
  if (pathname.match(/^\/api\/profiles\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getProfileById(pool, id);
  }
  
  // Artists endpoints
  if (pathname === '/api/artists') {
    return await getAllArtists(pool);
  }
  
  if (pathname.match(/^\/api\/artists\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getArtistById(pool, id);
  }
  
  // Producers endpoints
  if (pathname === '/api/producers') {
    return await getAllProducers(pool);
  }
  
  if (pathname.match(/^\/api\/producers\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getProducerById(pool, id);
  }
  
  // Composers endpoints
  if (pathname === '/api/composers') {
    return await getAllComposers(pool);
  }
  
  if (pathname.match(/^\/api\/composers\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getComposerById(pool, id);
  }
  
  // Compositions endpoints
  if (pathname === '/api/compositions') {
    return await getAllCompositions(pool);
  }
  
  if (pathname.match(/^\/api\/compositions\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getCompositionById(pool, id);
  }
  
  // Sponsors endpoints
  if (pathname === '/api/sponsors') {
    return await getAllSponsors(pool);
  }
  
  if (pathname.match(/^\/api\/sponsors\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getSponsorById(pool, id);
  }
  
  // Musics endpoints
  if (pathname === '/api/musics') {
    return await getAllMusics(pool);
  }
  
  if (pathname.match(/^\/api\/musics\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getMusicById(pool, id);
  }
  
  // Releases endpoints (músicas com release_date)
  if (pathname === '/api/releases') {
    return await getReleases(pool);
  }
  
  // Users endpoints
  if (pathname === '/api/users') {
    return await getAllUsers(pool);
  }
  
  if (pathname.match(/^\/api\/users\/(.*)$/)) {
    const id = pathname.split('/')[3];
    return await getUserById(pool, id);
  }
  
  // Role-based endpoints
  if (pathname === '/api/artists') {
    return await getByRole(pool, 'Artista');
  }
  
  if (pathname === '/api/producers') {
    return await getByRole(pool, 'Produtor');
  }
  
  if (pathname === '/api/composers') {
    return await getByRole(pool, 'Compositor');
  }
  
  return { success: false, error: 'Endpoint não encontrado' };
}
