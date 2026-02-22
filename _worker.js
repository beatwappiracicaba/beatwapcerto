// Cloudflare Pages Configuration
// Este arquivo configura o build e deploy do frontend

export default {
  async fetch(request, env, ctx) {
    // Configuração de build para Cloudflare Pages
    const config = {
      build: {
        root: "frontend",
        buildCommand: "npm run build",
        buildOutputDir: "frontend/dist",
        nodeVersion: "18",
        environmentVariables: {
          VITE_API_BASE_URL: "https://beatwap-api-worker.beatwappiracicaba.workers.dev"
        }
      }
    };
    
    return new Response(JSON.stringify(config), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};