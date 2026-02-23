// src/handlers/admin.js - Handler de admin
import { Database } from '../utils/database.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { queryWithRetry } from '../database-utils.js';
import { createArrayResponse } from '../response.js';

export const adminHandler = {
  async getArtistMetrics(id, env) {
    try {
      const db = new Database(env);
      
      // Buscar métricas do artista
      const metricsResult = await db.queryWithReturn(`
        SELECT 
          COUNT(DISTINCT m.id) as total_musicas,
          COUNT(DISTINCT p.id) as total_projetos,
          COUNT(DISTINCT s.id) as total_composicoes
        FROM public.profiles perfil
        LEFT JOIN public.musics m ON perfil.id = m.artista_id
        LEFT JOIN public.projects p ON perfil.id = p.artista_id
        LEFT JOIN public.compositions s ON perfil.id = s.compositor_id
        WHERE perfil.id = $1
        GROUP BY perfil.id
      `, [id]);

      if (metricsResult.rows.length === 0) {
        return errorResponse('Artista não encontrado', 404, env);
      }

      return successResponse(metricsResult.rows[0], 'Métricas encontradas', 200, env);

    } catch (error) {
      console.error('Get artist metrics error:', error);
      return errorResponse('Erro ao buscar métricas', 500, env);
    }
  }
};

// Funções adicionais para rotas admin
export async function getAdminStats(pool) {
  try {
    const result = await queryWithRetry(pool, `
      SELECT 
        COUNT(DISTINCT p.id) as total_profiles,
        COUNT(DISTINCT m.id) as total_musics,
        COUNT(DISTINCT c.id) as total_compositions,
        COUNT(DISTINCT s.id) as total_sponsors,
        COUNT(DISTINCT proj.id) as total_projects
      FROM profiles p
      LEFT JOIN musics m ON p.id = m.artista_id
      LEFT JOIN compositions c ON p.id = c.compositor_id
      LEFT JOIN sponsors s ON 1=1
      LEFT JOIN projects proj ON 1=1
    `);
    
    return createArrayResponse(result.rows);
  } catch (error) {
    console.error('Admin stats error:', error);
    return createArrayResponse([]);
  }
}

export async function getAdminMusics(pool, searchParams) {
  try {
    const artistId = searchParams.get('artist_id');
    const status = searchParams.get('status');
    
    let query = `
      SELECT 
        m.id,
        m.titulo,
        m.status,
        m.created_at,
        p.nome as artist_name,
        p.id as artist_id
      FROM musics m
      LEFT JOIN profiles p ON m.artista_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (artistId) {
      query += ` AND m.artista_id = $${paramIndex}`;
      params.push(artistId);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND m.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY m.created_at DESC LIMIT 100`;
    
    const result = await queryWithRetry(pool, query, params);
    return createArrayResponse(result.rows);
  } catch (error) {
    console.error('Admin musics error:', error);
    return createArrayResponse([]);
  }
}

export async function getAdminCompositions(pool, searchParams) {
  try {
    const status = searchParams.get('status');
    
    let query = `
      SELECT 
        c.id,
        c.titulo,
        c.status,
        c.admin_feedback,
        c.created_at,
        p.nome as composer_name
      FROM compositions c
      LEFT JOIN profiles p ON c.compositor_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY c.created_at DESC LIMIT 100`;
    
    const result = await queryWithRetry(pool, query, params);
    return createArrayResponse(result.rows);
  } catch (error) {
    console.error('Admin compositions error:', error);
    return createArrayResponse([]);
  }
}

export async function getAdminSellers(pool, searchParams) {
  try {
    const result = await queryWithRetry(pool, `
      SELECT 
        p.id,
        p.nome,
        p.email,
        p.telefone,
        p.created_at,
        p.status,
        COUNT(DISTINCT v.id) as total_vendas
      FROM profiles p
      LEFT JOIN vendas v ON p.id = v.vendedor_id
      WHERE p.tipo = 'Vendedor'
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `);
    
    return createArrayResponse(result.rows);
  } catch (error) {
    console.error('Admin sellers error:', error);
    return createArrayResponse([]);
  }
}