/**
 * Script de Diagnóstico para a API BeatWap
 * 
 * Este script testa todos os endpoints da API, incluindo:
 * - Requisições GET para verificar dados.
 * - Requisições OPTIONS para validar o preflight de CORS.
 * - Validação de headers, status e formato da resposta.
 * 
 * Como usar:
 * node test-api.mjs
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'https://beatwap-api-worker.beatwappiracicaba.workers.dev';
const FRONTEND_ORIGIN = 'https://beatwapproducoes.pages.dev';

const endpoints = [
  '/api/producers',
  '/api/profiles',
  '/api/artists',
  '/api/compositions',
  '/api/composers',
  '/api/releases',
  '/api/users',
];

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(color, message) {
  console.log(`${color}%s${COLORS.reset}`, message);
}

async function testEndpoint(endpoint) {
  const url = `${API_BASE_URL}${endpoint}`;
  log(COLORS.cyan, `\n=================================================`);
  log(COLORS.cyan, `[INICIANDO TESTE] Endpoint: ${endpoint}`);
  log(COLORS.cyan, `=================================================`);

  // --- Teste 1: Requisição OPTIONS (Preflight CORS) ---
  log(COLORS.magenta, `\n--- 1. Testando OPTIONS (Preflight CORS) ---`);
  try {
    const optionsResponse = await fetch(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    log(COLORS.yellow, `[STATUS] ${optionsResponse.status}`);
    if (optionsResponse.status === 204) {
      log(COLORS.green, '✅ SUCESSO: Status 204 (No Content) recebido.');
    } else {
      log(COLORS.red, `❌ FALHA: Esperado Status 204, mas recebido ${optionsResponse.status}.`);
    }

    const corsOrigin = optionsResponse.headers.get('access-control-allow-origin');
    if (corsOrigin === FRONTEND_ORIGIN) {
      log(COLORS.green, `✅ SUCESSO: Header 'Access-Control-Allow-Origin' está correto.`);
    } else {
      log(COLORS.red, `❌ FALHA: Header 'Access-Control-Allow-Origin' incorreto ou ausente. Recebido: ${corsOrigin}`);
    }
  } catch (error) {
    log(COLORS.red, `❌ ERRO CRÍTICO (OPTIONS): Não foi possível conectar à API. ${error.message}`);
  }

  // --- Teste 2: Requisição GET ---
  log(COLORS.magenta, `\n--- 2. Testando GET (Busca de Dados) ---`);
  try {
    const getResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Origin': FRONTEND_ORIGIN,
      },
    });

    log(COLORS.yellow, `[STATUS] ${getResponse.status}`);
    if (getResponse.status === 200) {
      log(COLORS.green, '✅ SUCESSO: Status 200 (OK) recebido.');
    } else {
      log(COLORS.red, `❌ FALHA: Esperado Status 200, mas recebido ${getResponse.status}.`);
      if (getResponse.status === 500) {
        log(COLORS.red, '   -> Causa provável: Erro interno no Worker. Verifique os logs do `wrangler tail`.');
      }
    }

    const corsOriginGet = getResponse.headers.get('access-control-allow-origin');
    if (corsOriginGet === FRONTEND_ORIGIN) {
      log(COLORS.green, `✅ SUCESSO: Header 'Access-Control-Allow-Origin' presente na resposta GET.`);
    } else {
      log(COLORS.red, `❌ FALHA: Header 'Access-Control-Allow-Origin' ausente na resposta GET. Isso causa o erro de CORS no navegador.`);
    }

    const contentType = getResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      log(COLORS.green, '✅ SUCESSO: Content-Type é application/json.');
    } else {
      log(COLORS.red, `❌ FALHA: Content-Type incorreto. Esperado 'application/json', recebido '${contentType}'. A API pode estar retornando HTML (página de erro).`);
    }

    const textBody = await getResponse.text();
    let data;
    try {
      data = JSON.parse(textBody);
      log(COLORS.green, '✅ SUCESSO: A resposta é um JSON válido.');
    } catch (e) {
      log(COLORS.red, '❌ FALHA: A resposta NÃO é um JSON válido.');
      log(COLORS.yellow, '--- Corpo da Resposta (Texto) ---');
      console.log(textBody.substring(0, 500) + (textBody.length > 500 ? '...' : ''));
      log(COLORS.yellow, '---------------------------------');
      return; // Interrompe se não for JSON
    }

    if (data && typeof data === 'object' && data !== null) {
        // Verifica se a propriedade 'data' existe e é um array
        if (data.hasOwnProperty('data') && Array.isArray(data.data)) {
            log(COLORS.green, `✅ SUCESSO: A propriedade 'data' é um array com ${data.data.length} itens.`);
        } else if (Array.isArray(data)) {
             log(COLORS.green, `✅ SUCESSO: A resposta é um array com ${data.length} itens.`);
        } else {
            log(COLORS.red, `❌ FALHA: A propriedade 'data' não é um array. Tipo recebido: ${typeof data.data}. Isso causa o erro ".map is not a function".`);
        }
    } else {
        log(COLORS.red, `❌ FALHA: A resposta não é um objeto JSON válido. Tipo recebido: ${typeof data}.`);
    }


  } catch (error) {
    log(COLORS.red, `❌ ERRO CRÍTICO (GET): Não foi possível conectar à API. ${error.message}`);
  }
}

async function runTests() {
  log(COLORS.cyan, '*******************************************');
  log(COLORS.cyan, '*  INICIANDO DIAGNÓSTICO DA API BEATWAP   *');
  log(COLORS.cyan, '*******************************************');

  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }

  log(COLORS.cyan, `\n=================================================`);
  log(COLORS.cyan, `[DIAGNÓSTICO FINALIZADO]`);
  log(COLORS.cyan, `=================================================`);
}

runTests();
