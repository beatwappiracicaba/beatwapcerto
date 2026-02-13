import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const HF_API_KEY = Deno.env.get('HF_API_KEY')

// Lista de modelos resilientes e gratuitos (Free Tier)
// Ordem de prioridade: Qwen (melhor performance) -> Gemma (Google, estável) -> Phi-3 (Microsoft, leve)
const MODELS = [
  {
    id: 'Qwen/Qwen2.5-7B-Instruct',
    type: 'chatml'
  },
  {
    id: 'google/gemma-1.1-7b-it',
    type: 'gemma'
  },
  {
    id: 'microsoft/Phi-3-mini-4k-instruct',
    type: 'phi'
  },
  {
    id: 'Qwen/Qwen2.5-1.5B-Instruct', // Backup ultra-leve
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
        let stopSequences = []
        
        if (model.type === 'chatml') {
          // Qwen / ChatML format
          prompt = `<|im_start|>system\n${systemPersona}\n<|im_end|>\n`
          recentMessages.forEach(msg => {
            prompt += `<|im_start|>${msg.role}\n${msg.content}\n<|im_end|>\n`
          })
          prompt += `<|im_start|>assistant\n`
          stopSequences = ["<|im_end|>", "<|endoftext|>"]
          
        } else if (model.type === 'gemma') {
          // Google Gemma format
          prompt = `<start_of_turn>user\n${systemPersona}\n\n`
          recentMessages.forEach(msg => {
            prompt += `${msg.role === 'user' ? '' : 'Modelo: '}${msg.content}\n`
          })
          // Ensure structure ends correctly
          const lastMsg = recentMessages[recentMessages.length - 1]
          if (lastMsg.role === 'user') {
             prompt += `<end_of_turn>\n<start_of_turn>model\n`
          } else {
             prompt += `\n<start_of_turn>model\n`
          }
          stopSequences = ["<end_of_turn>"]

        } else if (model.type === 'phi') {
          // Microsoft Phi-3 format
          prompt = `<|system|>\n${systemPersona}<|end|>\n`
          recentMessages.forEach(msg => {
            prompt += `<|${msg.role}|>\n${msg.content}<|end|>\n`
          })
          prompt += `<|assistant|>\n`
          stopSequences = ["<|end|>", "<|endoftext|>"]
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
                stop: stopSequences
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
        generatedText = generatedText.replace(prompt, '').trim()
        
        // Remove known tags based on model type
        if (model.type === 'chatml') {
          generatedText = generatedText.replace(/<\|im_end\|>/g, '').replace(/<\|im_start\|>/g, '').trim()
        } else if (model.type === 'gemma') {
          generatedText = generatedText.replace(/<end_of_turn>/g, '').replace(/<start_of_turn>/g, '').trim()
        } else if (model.type === 'phi') {
          generatedText = generatedText.replace(/<\|end\|>/g, '').replace(/<\|assistant\|>/g, '').trim()
        }

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