import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const HF_API_KEY = Deno.env.get('HF_API_KEY')

// Lista de modelos resilientes (Qwen é open-weights e geralmente não requer gate approval complexo)
const MODELS = [
  {
    id: 'Qwen/Qwen2.5-7B-Instruct',
    type: 'chatml'
  },
  {
    id: 'Qwen/Qwen2.5-Coder-7B-Instruct', // Excelente para seguir instruções lógicas
    type: 'chatml'
  },
  {
    id: 'Qwen/Qwen2.5-1.5B-Instruct', // Backup ultra-leve e rápido
    type: 'chatml'
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
        
        if (model.type === 'chatml') {
          // Standard ChatML format (Used by Qwen, newer models)
          // <|im_start|>system\n...\n<|im_end|>\n<|im_start|>user\n...\n<|im_end|>\n<|im_start|>assistant\n
          
          prompt = `<|im_start|>system\n${systemPersona}\n<|im_end|>\n`
          
          recentMessages.forEach(msg => {
            prompt += `<|im_start|>${msg.role}\n${msg.content}\n<|im_end|>\n`
          })
          
          prompt += `<|im_start|>assistant\n`
        } else {
            // Fallback generic format
            prompt = `System: ${systemPersona}\n\n`
            recentMessages.forEach(msg => {
                prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`
            })
            prompt += `Assistant: `
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
                top_p: 0.9,
                return_full_text: false,
                stop: ["<|im_end|>", "<|endoftext|>"]
              },
            }),
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.warn(`Model ${model.id} failed with ${response.status}: ${errorText}`)
          throw new Error(`Model ${model.id} error: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()
        let generatedText = ''
        
        if (Array.isArray(result) && result.length > 0) {
          generatedText = result[0].generated_text
        } else if (result.generated_text) {
          generatedText = result.generated_text
        } else {
          throw new Error('Empty response from model')
        }

        // Clean up response
        // For ChatML, we just need the text after the prompt (HF sometimes returns full text depending on params)
        // Since we set return_full_text: false, it should be just the new tokens.
        // But double check for safety.
        generatedText = generatedText.replace(prompt, '').trim()
        
        // Remove any leaked tags
        generatedText = generatedText.replace(/<\|im_end\|>/g, '').trim()
        generatedText = generatedText.replace(/<\|im_start\|>/g, '').trim()

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
    throw lastError || new Error('All AI models failed to respond. Please check API Key permissions.')

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