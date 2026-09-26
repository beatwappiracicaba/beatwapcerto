const express = require('express');
const { Op } = require('sequelize');
const { auth } = require('../middleware/auth');
const { Profile, Story, StoryView } = require('../models');
const { emitEvent } = require('../realtime');

const router = express.Router();

const HORA = 60 * 60 * 1000;
const VALIDADE_HORAS = 24;
const TIPOS = ['text', 'image', 'video'];

const normId = (v) => String(v || '').trim();
const idRandom = (prefixo) => `${prefixo}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Recorte visual do autor: vem do mesmo Profile (identidade global), e o
// @ do Perfil Social. Nunca do Perfil Publico.
async function buscarAutor(userId) {
  const p = await Profile.findByPk(userId);
  if (!p) return null;
  return {
    id: p.id,
    nome: p.nome || p.nome_completo_razao_social || 'Usuário',
    cargo: p.cargo || null,
    avatar_url: p.avatar_url || null,
    social_username: p.social_username || null
  };
}

// Versao sincrona a partir de um Profile ja carregado.
function autorDe(p) {
  if (!p) return null;
  return {
    id: p.id,
    nome: p.nome || p.nome_completo_razao_social || 'Usuário',
    cargo: p.cargo || null,
    avatar_url: p.avatar_url || null,
    social_username: p.social_username || null
  };
}

// Serializa um story com o bloco do autor, no formato que o front consome.
function comAutor(story, user, visto) {
  return {
    id: story.id,
    user_id: story.user_id,
    type: story.type,
    media_url: story.media_url || null,
    text_content: story.text_content || null,
    background: story.background || null,
    created_at: story.created_at,
    expires_at: story.expires_at,
    visto: visto === true,
    autor: user
  };
}

/**
 * Stories ativos do Feed, agrupados por pessoa.
 * Ordena quem tem story nao visto primeiro (padrao de redes sociais).
 */
router.get('/stories', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    if (!meId) return res.status(401).json({ error: 'Não autorizado' });

    const agora = new Date();
    const stories = await Story.findAll({
      where: { expires_at: { [Op.gt]: agora } },
      order: [['created_at', 'DESC']]
    });
    if (!stories.length) return res.json({ stories: [] });

    const ids = [...new Set(stories.map((s) => s.user_id))];
    const perfis = await Profile.findAll({ where: { id: ids } });
    const porPerfil = new Map(perfis.map((p) => [normId(p.id), p]));

    const meusVistos = await StoryView.findAll({
      where: { viewer_user_id: meId, story_id: stories.map((s) => s.id) }
    });
    const vistos = new Set(meusVistos.map((v) => v.story_id));

    const itens = stories
      // Story de quem nao existe mais no perfil nao aparece
      .filter((s) => porPerfil.has(normId(s.user_id)))
      // Nao conta como visto o proprio story
      .map((s) => comAutor(s, autorDe(porPerfil.get(normId(s.user_id))), vistos.has(s.id)));

    // agrupa por pessoa mantendo a ordem de chegada
    const grupos = new Map();
    for (const s of itens) {
      const chave = normId(s.user_id);
      if (!grupos.has(chave)) grupos.set(chave, { user_id: chave, autor: s.autor, stories: [], naoVisto: false });
      const g = grupos.get(chave);
      g.stories.push(s);
      if (!s.visto) g.naoVisto = true;
    }

    const lista = [...grupos.values()].sort((a, b) => {
      if (a.user_id === meId) return -1;  // meu story sempre primeiro
      if (a.naoVisto !== b.naoVisto) return a.naoVisto ? -1 : 1;
      return 0;
    });

    res.json({ stories: lista });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Erro ao carregar stories' });
  }
});

// Cria um story. Texto, imagem ou video.
router.post('/stories', auth, async (req, res) => {
  try {
    const userId = normId(req.user?.id);
    if (!userId) return res.status(401).json({ error: 'Não autorizado' });

    const tipo = String(req.body?.type || '').trim().toLowerCase();
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });

    const texto = String(req.body?.text_content || '').trim();
    const midia = String(req.body?.media_url || '').trim();

    if (tipo === 'text' && !texto) {
      return res.status(400).json({ error: 'Escreva algo no story de texto' });
    }
    if ((tipo === 'image' || tipo === 'video') && !/^https?:\/\//i.test(midia)) {
      return res.status(400).json({ error: 'Envie a mídia do story' });
    }

    const fundo = String(req.body?.background || '').trim() || null;
    const item = await Story.create({
      id: idRandom('st'),
      user_id: userId,
      type: tipo,
      media_url: midia || null,
      text_content: texto || null,
      background: fundo,
      created_at: new Date(),
      // expira em 24h; o registro NAO e apagado, so deixa de ser entregue
      expires_at: new Date(Date.now() + VALIDADE_HORAS * HORA)
    });

    const user = await buscarAutor(userId);
    const criado = comAutor(item, user, true);
    emitEvent('stories.created', criado, `story:${userId}`);
    res.json({ ok: true, story: criado });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Erro ao criar story' });
  }
});

// Registra visualizacao. Um registro por pessoa por story.
router.post('/stories/:id/view', auth, async (req, res) => {
  try {
    const viewerId = normId(req.user?.id);
    const storyId = normId(req.params.id);
    if (!viewerId) return res.status(401).json({ error: 'Não autorizado' });

    const story = await Story.findByPk(storyId);
    if (!story) return res.status(404).json({ error: 'Story não encontrado' });
    if (new Date(story.expires_at).getTime() <= Date.now()) {
      return res.status(410).json({ error: 'Story expirado' });
    }
    // Nao conta visualizacao do proprio story.
    if (normId(story.user_id) === viewerId) return res.json({ ok: true, own: true });

    const existente = await StoryView.findOne({ where: { story_id: storyId, viewer_user_id: viewerId } });
    if (existente) {
      // ja visto: apenas renova o horario, sem duplicar
      existente.viewed_at = new Date();
      await existente.save();
    } else {
      await StoryView.create({
        id: idRandom('sv'),
        story_id: storyId,
        viewer_user_id: viewerId,
        viewed_at: new Date()
      });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Erro ao registrar visualização' });
  }
});

// Quem viu. Somente o dono do story.
router.get('/stories/:id/views', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    const storyId = normId(req.params.id);
    if (!meId) return res.status(401).json({ error: 'Não autorizado' });

    const story = await Story.findByPk(storyId);
    if (!story) return res.status(404).json({ error: 'Story não encontrado' });
    if (normId(story.user_id) !== meId) {
      return res.status(403).json({ error: 'Apenas o autor vê as visualizações' });
    }

    const views = await StoryView.findAll({
      where: { story_id: storyId },
      order: [['viewed_at', 'DESC']]
    });
    const ids = [...new Set(views.map((v) => v.viewer_user_id))];
    const perfis = await Profile.findAll({ where: { id: ids } });
    const porPerfil = new Map(perfis.map((p) => [normId(p.id), p]));

    res.json({
      total: views.length,
      viewers: views
        .filter((v) => porPerfil.has(normId(v.viewer_user_id)))
        .map((v) => {
          const p = porPerfil.get(normId(v.viewer_user_id));
          return {
            id: p.id,
            nome: p.nome || p.nome_completo_razao_social || 'Usuário',
            cargo: p.cargo || null,
            avatar_url: p.avatar_url || null,
            social_username: p.social_username || null,
            viewed_at: v.viewed_at
          };
        })
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Erro ao buscar visualizações' });
  }
});

// Exclui um story. Somente o proprio autor.
router.delete('/stories/:id', auth, async (req, res) => {
  try {
    const meId = normId(req.user?.id);
    const storyId = normId(req.params.id);
    if (!meId) return res.status(401).json({ error: 'Não autorizado' });

    const story = await Story.findByPk(storyId);
    if (!story) return res.status(404).json({ error: 'Story não encontrado' });
    if (normId(story.user_id) !== meId) {
      return res.status(403).json({ error: 'Você só pode excluir o seu próprio story' });
    }

    await StoryView.destroy({ where: { story_id: storyId } });
    await story.destroy();
    emitEvent('stories.deleted', { id: storyId }, `story:${meId}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Erro ao excluir story' });
  }
});

module.exports = router;
