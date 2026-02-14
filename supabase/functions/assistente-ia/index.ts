import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Using the provided OpenAI API Key
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
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

    // System instruction for OpenAI
    const systemMessage = {
      role: "system", 
      content: `Você é o Assistente Oficial da plataforma BeatWap, focado EXCLUSIVAMENTE em música e estratégia de marketing musical.

Sua função é ajudar usuários APENAS com dúvidas sobre:
- Marketing musical e lançamento de músicas
- Estratégias para crescer no Spotify, YouTube, redes sociais (para artistas)
- Direitos autorais, distribuição digital, ISRC
- Uso da plataforma BeatWap para artistas e produtores

Regras obrigatórias:
- Se o assunto NÃO for relacionado a música ou carreira artística, responda: "Desculpe, só posso responder sobre música e estratégias de marketing musical." e encerre o assunto.
- Responder de forma clara e objetiva.
- Máximo de 5 linhas por resposta.
- Não repetir a pergunta.
- Não usar emojis.
- Focar sempre em solução prática.`
    };

    // Format history for OpenAI
    const openAIMessages = [
      systemMessage,
      ...messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user', // Ensure 'assistant' role is correct
        content: msg.content
      }))
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Using gpt-4o-mini for speed/cost efficiency, or "gpt-3.5-turbo"
        messages: openAIMessages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API Error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.choices && result.choices.length > 0 && result.choices[0].message) {
      const reply = result.choices[0].message.content;
      
      return new Response(
        JSON.stringify({ reply }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      throw new Error('Empty response from OpenAI');
    }

  } catch (error: any) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      {
        status: 200, // Return 200 to frontend to handle error display gracefully
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
