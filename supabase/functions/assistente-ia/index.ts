import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyCb4Ik5il5fH7cMqYmobw8f5Hi3Eb-dHok';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const { messages } = await req.json()
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid messages format')
    }

    // System instruction for Gemini
    const systemInstruction = {
      role: "user", 
      parts: [{
        text: `Você é o Assistente Oficial da BeatWap.
Especialista em: Marketing musical, Estratégia para artistas independentes, Distribuição digital, Direitos autorais, ISRC, Crescimento no Spotify, Estratégia de lançamento, Engajamento em redes sociais.
Tom de voz: Profissional, estratégico, direto e motivador.
IMPORTANTE: Se o usuário perguntar algo fora do contexto musical/carreira artística, responda educadamente que você só pode ajudar com assuntos relacionados à música e traga a conversa de volta ao universo artístico.
Responda sempre em Português do Brasil.`
      }]
    };

    // Format history for Gemini
    // Gemini expects: { role: "user"|"model", parts: [{ text: "..." }] }
    // User messages are "user", Assistant messages are "model"
    const contents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add system instruction as the first part of the request context or using systemInstruction field in v1beta
    // For simplicity and compatibility with standard generateContent, we can prepend it to the first user message 
    // or use the systemInstruction field if using the appropriate API version.
    // Let's use the systemInstruction field with v1beta.

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemInstruction.parts[0].text }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API Error: ${response.status} - ${errorText}`);
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
      const reply = result.candidates[0].content.parts[0].text;
      
      return new Response(
        JSON.stringify({ reply }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      throw new Error('Empty response from Gemini');
    }

  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
