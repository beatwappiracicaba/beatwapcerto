const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { auth } = require('../middleware/auth');
const { Audition, AuditionSubmission, Profile } = require('../models');
const { logAudit } = require('../services/auditLogger');

const router = express.Router();

function normalizeText(v) {
  return String(v || '').trim();
}

function normalizeStatusAudition(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'aberta' || s === 'open') return 'Aberta';
  if (s === 'encerrada' || s === 'closed') return 'Encerrada';
  return String(v || '').trim();
}

function normalizeStatusSubmission(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'pendente' || s === 'pending') return 'Pendente';
  if (s === 'avaliada' || s === 'reviewed') return 'Avaliada';
  if (s === 'selecionada' || s === 'selected') return 'Selecionada';
  if (s === 'rejeitada' || s === 'rejected') return 'Rejeitada';
  return String(v || '').trim();
}

function isValidHttpUrl(url) {
  try {
    const u = new URL(String(url || ''));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function toDigitsPhone(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function buildWhatsAppUrl(phoneRaw, message) {
  const digits = toDigitsPhone(phoneRaw);
  if (!digits) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(String(message || ''))}`;
}

function now() {
  return new Date();
}

function isAuditionOpenForSubmissions(audition) {
  if (!audition) return false;
  const st = normalizeStatusAudition(audition.status);
  if (st !== 'Aberta') return false;
  const deadline = audition.prazo_envio ? new Date(audition.prazo_envio) : null;
  if (!deadline || Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() > Date.now();
}

router.get('/auditions/public/open', async (req, res) => {
  try {
    const list = await Audition.findAll({
      where: { status: 'Aberta', prazo_envio: { [Op.gt]: now() } },
      order: [['createdAt', 'DESC']],
      limit: 8
    });
    const auditions = list.map((a) => {
      const json = a.toJSON();
      delete json.whatsapp_recebimento;
      delete json.created_by;
      return json;
    });
    return res.json({ ok: true, auditions });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/auditions', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });

    const nome_artista = normalizeText(req.body?.nome_artista);
    const nome_produtor = normalizeText(req.body?.nome_produtor);
    const foto_artista_url = normalizeText(req.body?.foto_artista_url);
    const estilo_musical_principal = normalizeText(req.body?.estilo_musical_principal);
    const estilos_semelhantes = normalizeText(req.body?.estilos_semelhantes);
    const referencias_musicais = normalizeText(req.body?.referencias_musicais);
    const descricao_detalhada = normalizeText(req.body?.descricao_detalhada);
    const tema = normalizeText(req.body?.tema);
    const faixa_etaria_publico = normalizeText(req.body?.faixa_etaria_publico);
    const cidade_estado = normalizeText(req.body?.cidade_estado);
    const valor_negociacao = normalizeText(req.body?.valor_negociacao) || null;
    const prazo_envio_raw = req.body?.prazo_envio;
    const whatsapp_recebimento = normalizeText(req.body?.whatsapp_recebimento);
    const observacoes_adicionais = normalizeText(req.body?.observacoes_adicionais) || null;
    const status = normalizeStatusAudition(req.body?.status || 'Aberta') || 'Aberta';

    const prazo_envio = prazo_envio_raw ? new Date(prazo_envio_raw) : null;
    if (!prazo_envio || Number.isNaN(prazo_envio.getTime())) {
      return res.status(400).json({ ok: false, error: 'Prazo para envio inválido' });
    }

    const required = [
      nome_artista,
      nome_produtor,
      foto_artista_url,
      estilo_musical_principal,
      estilos_semelhantes,
      referencias_musicais,
      descricao_detalhada,
      tema,
      faixa_etaria_publico,
      cidade_estado,
      whatsapp_recebimento
    ];
    if (required.some((v) => !v)) return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    if (!isValidHttpUrl(foto_artista_url)) return res.status(400).json({ ok: false, error: 'Foto do artista inválida' });
    if (status !== 'Aberta' && status !== 'Encerrada') return res.status(400).json({ ok: false, error: 'Status inválido' });

    const created = await Audition.create({
      created_by: req.user.id,
      nome_artista,
      nome_produtor,
      foto_artista_url,
      estilo_musical_principal,
      estilos_semelhantes,
      referencias_musicais,
      descricao_detalhada,
      tema,
      faixa_etaria_publico,
      cidade_estado,
      valor_negociacao,
      prazo_envio,
      whatsapp_recebimento,
      observacoes_adicionais,
      status,
      encerrada_em: status === 'Encerrada' ? now() : null
    });

    await logAudit({
      action: 'auditions.create',
      email: req.user.email,
      user_id: req.user.id,
      status: 'success',
      ip: String(req.headers['x-real-ip'] || req.ip || ''),
      user_agent: String(req.headers['user-agent'] || ''),
      details: { audition_id: created.id, status }
    });

    return res.json({ ok: true, audition: created });
  } catch (e) {
    await logAudit({
      action: 'auditions.create',
      email: req.user?.email || null,
      user_id: req.user?.id || null,
      status: 'exception',
      ip: String(req.headers['x-real-ip'] || req.ip || ''),
      user_agent: String(req.headers['user-agent'] || ''),
      details: { message: e?.message || 'error' }
    });
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.get('/auditions/producer', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const list = await Audition.findAll({
      where: { created_by: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    const ids = list.map((a) => a.id);
    const statsById = {};
    if (ids.length) {
      const rows = await AuditionSubmission.findAll({
        where: { audition_id: { [Op.in]: ids } },
        attributes: [
          'audition_id',
          [fn('COUNT', col('id')), 'total_submissions'],
          [fn('COUNT', literal('DISTINCT composer_id')), 'total_composers']
        ],
        group: ['audition_id']
      });
      rows.forEach((r) => {
        const id = String(r.get('audition_id') || '');
        statsById[id] = {
          total_submissions: Number(r.get('total_submissions') || 0),
          total_composers: Number(r.get('total_composers') || 0)
        };
      });
    }
    const auditions = list.map((a) => {
      const s = statsById[String(a.id)] || { total_submissions: 0, total_composers: 0 };
      return {
        ...a.toJSON(),
        total_submissions: s.total_submissions,
        total_composers: s.total_composers
      };
    });
    return res.json({ ok: true, auditions });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.patch('/auditions/:id', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const id = String(req.params.id || '').trim();
    const audition = await Audition.findByPk(id);
    if (!audition) return res.status(404).json({ ok: false, error: 'Audição não encontrada' });
    if (String(audition.created_by) !== String(req.user.id)) return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const status = normalizeStatusAudition(req.body?.status);
    if (status !== 'Aberta' && status !== 'Encerrada') return res.status(400).json({ ok: false, error: 'Status inválido' });
    audition.status = status;
    audition.encerrada_em = status === 'Encerrada' ? now() : null;
    await audition.save();
    await logAudit({
      action: 'auditions.update',
      email: req.user.email,
      user_id: req.user.id,
      status: 'success',
      ip: String(req.headers['x-real-ip'] || req.ip || ''),
      user_agent: String(req.headers['user-agent'] || ''),
      details: { audition_id: audition.id, status }
    });
    return res.json({ ok: true, audition });
  } catch (e) {
    await logAudit({
      action: 'auditions.update',
      email: req.user?.email || null,
      user_id: req.user?.id || null,
      status: 'exception',
      ip: String(req.headers['x-real-ip'] || req.ip || ''),
      user_agent: String(req.headers['user-agent'] || ''),
      details: { message: e?.message || 'error' }
    });
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.delete('/auditions/:id', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const id = String(req.params.id || '').trim();
    const audition = await Audition.findByPk(id);
    if (!audition) return res.status(404).json({ ok: false, error: 'Audição não encontrada' });
    if (String(audition.created_by) !== String(req.user.id)) return res.status(403).json({ ok: false, error: 'Sem permissão' });

    await AuditionSubmission.destroy({ where: { audition_id: id } });
    await Audition.destroy({ where: { id } });

    await logAudit({
      action: 'auditions.delete',
      email: req.user.email,
      user_id: req.user.id,
      status: 'success',
      ip: String(req.headers['x-real-ip'] || req.ip || ''),
      user_agent: String(req.headers['user-agent'] || ''),
      details: { audition_id: id }
    });

    return res.json({ ok: true });
  } catch (e) {
    await logAudit({
      action: 'auditions.delete',
      email: req.user?.email || null,
      user_id: req.user?.id || null,
      status: 'exception',
      ip: String(req.headers['x-real-ip'] || req.ip || ''),
      user_agent: String(req.headers['user-agent'] || ''),
      details: { message: e?.message || 'error' }
    });
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.get('/auditions/open', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Compositor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const list = await Audition.findAll({
      where: { status: 'Aberta', prazo_envio: { [Op.gt]: now() } },
      order: [['createdAt', 'DESC']]
    });
    const ids = list.map((a) => a.id);
    const myCountByAudition = {};
    if (ids.length) {
      const rows = await AuditionSubmission.findAll({
        where: { audition_id: { [Op.in]: ids }, composer_id: req.user.id },
        attributes: ['audition_id', [fn('COUNT', col('id')), 'c']],
        group: ['audition_id']
      });
      rows.forEach((r) => {
        myCountByAudition[String(r.get('audition_id'))] = Number(r.get('c') || 0);
      });
    }
    const auditions = list.map((a) => {
      const json = a.toJSON();
      delete json.whatsapp_recebimento;
      const myCount = myCountByAudition[String(a.id)] || 0;
      return { ...json, my_submissions_count: myCount, remaining_submissions: Math.max(0, 2 - myCount) };
    });
    return res.json({ ok: true, auditions });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.post('/auditions/:id/submissions', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Compositor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const audition_id = String(req.params.id || '').trim();
    const audition = await Audition.findByPk(audition_id);
    if (!audition) return res.status(404).json({ ok: false, error: 'Audição não encontrada' });
    if (!isAuditionOpenForSubmissions(audition)) {
      return res.status(400).json({ ok: false, error: 'Audição encerrada ou fora do prazo' });
    }

    const nome_musica = normalizeText(req.body?.nome_musica);
    const link_musica = normalizeText(req.body?.link_musica);
    const observacoes = normalizeText(req.body?.observacoes) || null;
    if (!nome_musica || !link_musica) return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });
    if (!isValidHttpUrl(link_musica)) return res.status(400).json({ ok: false, error: 'Link inválido' });

    const already = await AuditionSubmission.findOne({ where: { audition_id, composer_id: req.user.id, link_musica } });
    if (already) return res.status(400).json({ ok: false, error: 'Envio duplicado' });

    const currentCount = await AuditionSubmission.count({ where: { audition_id, composer_id: req.user.id } });
    if (currentCount >= 2) {
      return res.status(400).json({ ok: false, error: 'Você já atingiu o limite de envios para esta audição.' });
    }

    const created = await AuditionSubmission.create({
      audition_id,
      composer_id: req.user.id,
      nome_musica,
      link_musica,
      observacoes,
      status: 'Pendente'
    });

    const composer = await Profile.findByPk(req.user.id);
    const composer_whatsapp = composer?.celular || null;

    const msg = `Olá, estou participando da audição do artista ${audition.nome_artista}.\nMúsica: ${nome_musica}\nLink: ${link_musica}`;
    const whatsapp_url = buildWhatsAppUrl(audition.whatsapp_recebimento, msg);

    await logAudit({
      action: 'auditions.submit',
      email: req.user.email,
      user_id: req.user.id,
      status: 'success',
      ip: String(req.headers['x-real-ip'] || req.ip || ''),
      user_agent: String(req.headers['user-agent'] || ''),
      details: { audition_id, submission_id: created.id }
    });

    return res.json({
      ok: true,
      submission: created,
      whatsapp: { to: audition.whatsapp_recebimento, url: whatsapp_url, message: msg },
      composer_whatsapp
    });
  } catch (e) {
    await logAudit({
      action: 'auditions.submit',
      email: req.user?.email || null,
      user_id: req.user?.id || null,
      status: 'exception',
      ip: String(req.headers['x-real-ip'] || req.ip || ''),
      user_agent: String(req.headers['user-agent'] || ''),
      details: { message: e?.message || 'error' }
    });
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.get('/auditions/:id/submissions', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const audition_id = String(req.params.id || '').trim();
    const audition = await Audition.findByPk(audition_id);
    if (!audition) return res.status(404).json({ ok: false, error: 'Audição não encontrada' });
    if (String(audition.created_by) !== String(req.user.id)) return res.status(403).json({ ok: false, error: 'Sem permissão' });

    const list = await AuditionSubmission.findAll({
      where: { audition_id },
      order: [['createdAt', 'DESC']]
    });
    const composerIds = Array.from(new Set(list.map((s) => String(s.composer_id))));
    const composers = await Profile.findAll({
      where: { id: { [Op.in]: composerIds } },
      attributes: ['id', 'nome', 'nome_completo_razao_social', 'email', 'celular']
    });
    const map = {};
    composers.forEach((c) => { map[String(c.id)] = c.toJSON(); });

    const submissions = list.map((s) => {
      const composer = map[String(s.composer_id)] || null;
      return {
        ...s.toJSON(),
        compositor: composer
          ? {
              id: composer.id,
              nome: composer.nome || composer.nome_completo_razao_social || composer.email,
              email: composer.email,
              whatsapp: composer.celular || null
            }
          : null
      };
    });

    const total_submissions = submissions.length;
    const total_composers = composerIds.length;
    return res.json({ ok: true, audition, submissions, stats: { total_submissions, total_composers } });
  } catch {
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

router.patch('/auditions/submissions/:id/status', auth, async (req, res) => {
  try {
    if (req.user.cargo !== 'Produtor') return res.status(403).json({ ok: false, error: 'Sem permissão' });
    const id = String(req.params.id || '').trim();
    const submission = await AuditionSubmission.findByPk(id);
    if (!submission) return res.status(404).json({ ok: false, error: 'Envio não encontrado' });
    const audition = await Audition.findByPk(String(submission.audition_id));
    if (!audition) return res.status(404).json({ ok: false, error: 'Audição não encontrada' });
    if (String(audition.created_by) !== String(req.user.id)) return res.status(403).json({ ok: false, error: 'Sem permissão' });

    const status = normalizeStatusSubmission(req.body?.status);
    const allowed = ['Pendente', 'Avaliada', 'Selecionada', 'Rejeitada'];
    if (!allowed.includes(status)) return res.status(400).json({ ok: false, error: 'Status inválido' });
    submission.status = status;
    await submission.save();

    await logAudit({
      action: 'auditions.submission_status',
      email: req.user.email,
      user_id: req.user.id,
      status: 'success',
      ip: String(req.headers['x-real-ip'] || req.ip || ''),
      user_agent: String(req.headers['user-agent'] || ''),
      details: { audition_id: audition.id, submission_id: submission.id, status }
    });

    return res.json({ ok: true, submission });
  } catch (e) {
    await logAudit({
      action: 'auditions.submission_status',
      email: req.user?.email || null,
      user_id: req.user?.id || null,
      status: 'exception',
      ip: String(req.headers['x-real-ip'] || req.ip || ''),
      user_agent: String(req.headers['user-agent'] || ''),
      details: { message: e?.message || 'error' }
    });
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

module.exports = router;
