import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const HF_API_KEY = Deno.env.get('HF_API_KEY')
const MODEL_ID = 'mistralai/Mistral-7B-Instruct-v0.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // 2. Get User Input
    const { messages } = await req.json()
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid messages format')
    }

    // 3. Construct Prompt with System Persona
    const systemPersona = `Você é o Assistente Oficial da BeatWap.
Especialista em: Marketing musical, Estratégia para artistas independentes, Distribuição digital, Direitos autorais, ISRC, Crescimento no Spotify, Estratégia de lançamento, Engajamento em redes sociais.
Tom de voz: Profissional, estratégico, direto e motivador.
IMPORTANTE: Se o usuário perguntar algo fora do contexto musical/carreira artística, responda educadamente que você só pode ajudar com assuntos relacionados à música e traga a conversa de volta ao universo artístico.
Responda sempre em Português do Brasil.`

    // Construct prompt for Mistral
    let prompt = `<s>[INST] ${systemPersona}\n\n`
    
    // Append conversation history (limit to last 10 messages)
    const recentMessages = messages.slice(-10)
    
    recentMessages.forEach(msg => {
      if (msg.role === 'user') {
        prompt += `${msg.content} [/INST] `
      } else {
        prompt += `${msg.content} </s><s>[INST] `
      }
    })
    
    if (prompt.endsWith('</s><s>[INST] ')) {
       prompt = prompt.slice(0, -14)
    }

    // 4. Call Hugging Face API
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL_ID}`,
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            top_p: 0.95,
            return_full_text: false,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('HF API Error:', errorText)
      throw new Error(`Error calling AI provider: ${response.statusText}`)
    }

    const result = await response.json()
    let generatedText = ''
    
    if (Array.isArray(result) && result.length > 0) {
      generatedText = result[0].generated_text
    } else if (result.generated_text) {
      generatedText = result.generated_text
    } else {
      generatedText = "Desculpe, não consegui processar sua resposta no momento."
    }

    return new Response(
      JSON.stringify({ reply: generatedText }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 200, // Return 200 to prevent Supabase SDK from throwing generic error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
