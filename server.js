import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import process from 'process';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Hugging Face Configuration
const HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

const SYSTEM_PROMPT = `<s>[INST] Você é o Assistente Oficial da BeatWap, uma plataforma de gestão e aceleração de carreiras artísticas.
Sua personalidade é profissional, estratégica, direta e motivadora.
Você é especialista em: Marketing musical, Estratégia para artistas independentes, Distribuição digital, Direitos autorais (ECAD, UBC), ISRC, Crescimento no Spotify, Estratégia de lançamento e Engajamento em redes sociais.

Regras:
1. Responda sempre em Português do Brasil.
2. Seja conciso e vá direto ao ponto.
3. Se o usuário perguntar algo fora do contexto musical/artístico, responda educadamente que seu foco é ajudar na carreira dele e traga a conversa de volta ao universo artístico.
4. Use formatação markdown (negrito, listas) para facilitar a leitura.
5. Não mencione que é uma IA do Hugging Face ou Mistral, você é o Assistente BeatWap.

Usuário perguntou:
`;

app.post('/api/assistente-ia', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    if (!HF_API_KEY) {
      console.error('HUGGINGFACE_API_KEY not set');
      return res.status(500).json({ error: 'Erro de configuração no servidor' });
    }

    // Construct the prompt with system instructions
    const prompt = `${SYSTEM_PROMPT} ${message} [/INST]`;

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false, // Return only the generated part
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Hugging Face API Error:', errorData);
      
      // Handle loading model error (common in free tier)
      if (errorData.error && errorData.error.includes('loading')) {
        return res.status(503).json({ 
          error: 'Model loading', 
          reply: 'Estou aquecendo meus motores... Por favor, tente novamente em 30 segundos.' 
        });
      }
      
      throw new Error(`Hugging Face API Error: ${response.statusText}`);
    }

    const result = await response.json();
    let replyText = '';

    if (Array.isArray(result) && result.length > 0) {
      replyText = result[0].generated_text;
    } else if (result.generated_text) {
      replyText = result.generated_text;
    } else {
      replyText = 'Desculpe, não consegui processar sua resposta.';
    }

    // Clean up potential artifacts if full text was returned (though we set return_full_text: false)
    replyText = replyText.replace(prompt, '').trim();

    res.json({ reply: replyText });

  } catch (error) {
    console.error('Error in /api/assistente-ia:', error);
    res.status(500).json({ error: 'Erro interno ao processar solicitação' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
