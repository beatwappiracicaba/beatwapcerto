import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const HF_API_KEY = Deno.env.get('HF_API_KEY')

// Lista de modelos para tentar em ordem, caso um falhe (Erro 410, 503, etc)
const MODELS = [
  {
    id: 'google/gemma-1.1-7b-it',
    type: 'gemma'
  },
  {
    id: 'microsoft/Phi-3-mini-4k-instruct',
    type: 'phi'
  },
  {
    id: 'HuggingFaceH4/zephyr-7b-beta',
    type: 'zephyr'
  }
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // 3. System Persona
    const systemPersona = `Você é o Assistente Oficial da BeatWap.
Especialista em: Marketing musical, Estratégia para artistas independentes, Distribuição digital, Direitos autorais, ISRC, Crescimento no Spotify, Estratégia de lançamento, Engajamento em redes sociais.
Tom de voz: Profissional, estratégico, direto e motivador.
IMPORTANTE: Se o usuário perguntar algo fora do contexto musical/carreira artística, responda educadamente que você só pode ajudar com assuntos relacionados à música e traga a conversa de volta ao universo artístico.
Responda sempre em Português do Brasil.`

    // Append conversation history (limit to last 10 messages)
    const recentMessages = messages.slice(-10)
    let lastError = null

    // 4. Try models in sequence until one works
    for (const model of MODELS) {
      try {
        console.log(`Attempting to use model: ${model.id}`)
        
        // Construct Prompt based on model type
        let prompt = ''
        
        if (model.type === 'gemma') {
          // Gemma Format: <start_of_turn>user\n...<end_of_turn>\n<start_of_turn>model\n
          prompt = `<start_of_turn>user\n${systemPersona}\n\n`
          recentMessages.forEach(msg => {
            prompt += `${msg.role === 'user' ? '' : 'Modelo: '}${msg.content}\n`
          })
          // Add the final turn structure
          const lastMsg = recentMessages[recentMessages.length - 1]
          if (lastMsg.role === 'user') {
             // Ensure the last user message is properly formatted if not already
             prompt += `<end_of_turn>\n<start_of_turn>model\n`
          }
        } else if (model.type === 'phi' || model.type === 'zephyr') {
          // ChatML-like Format: <|user|>\n...<|end|>\n<|assistant|>\n
          prompt = `<|system|>\n${systemPersona}<|end|>\n`
          recentMessages.forEach(msg => {
            prompt += `<|${msg.role}|>\n${msg.content}<|end|>\n`
          })
          prompt += `<|assistant|>\n`
        }

        const response = await fetch(
          `https://api-inference.huggingface.co/models/${model.id}`,
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
          console.warn(`Model ${model.id} failed with ${response.status}: ${errorText}`)
          
          // If it's a "Wait" error (503), sometimes it means loading. But we want speed, so failover.
          // If it's 410 (Gone) or 404 (Not Found), definitely failover.
          throw new Error(`Model ${model.id} error: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        let generatedText = ''
        
        if (Array.isArray(result) && result.length > 0) {
          generatedText = result[0].generated_text
        } else if (result.generated_text) {
          generatedText = result.generated_text
        } else {
          // If success but empty, try next
          throw new Error('Empty response from model')
        }

        // Clean up response if it includes prompt (sometimes happens despite return_full_text: false)
        // Simple cleanup for common artifacts
        generatedText = generatedText.replace(prompt, '').trim()
        
        // Success! Return immediately
        return new Response(
          JSON.stringify({ reply: generatedText, model: model.id }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )

      } catch (err) {
        lastError = err
        console.error(`Attempt failed for ${model.id}:`, err)
        // Continue to next model in loop
      }
    }

    // If loop finishes without success
    throw lastError || new Error('All AI models failed to respond.')

  } catch (error) {
    console.error('Edge Function Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      {
        status: 200, // Return 200 to bubble up error message to frontend
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})