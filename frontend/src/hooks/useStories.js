import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient, uploadApi } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

// Stories do Perfil Social do Feed. O backend ja filtra expirados e
// agrupa por pessoa, entao aqui nao ha duplicacao de chamada.
export const useStories = () => {
  const { user } = useAuth();
  const meId = String(user?.id || '');
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const carregandoRef = useRef(false);

  const carregar = useCallback(async () => {
    if (carregandoRef.current) return;
    carregandoRef.current = true;
    setLoading(true);
    try {
      const r = await apiClient.get('/stories', { cache: false });
      setGrupos(Array.isArray(r?.stories) ? r.stories : []);
      setErro('');
    } catch (e) {
      setErro(e?.message || 'Não foi possível carregar os Stories');
    } finally {
      carregandoRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (meId) carregar();
  }, [meId, carregar]);

  // Marca como visto. Registrar no servidor e nao contar o proprio story.
  const registrarVisualizacao = useCallback(async (storyId, ownerId) => {
    if (!storyId) return;
    if (String(ownerId) === meId) return;
    try {
      await apiClient.post(`/stories/${storyId}/view`);
    } catch {
      // Falha silenciosa: o story continua abrindo normalmente.
    }
  }, [meId]);

  // Cria story. Imagem/video sobem pelo upload que o Feed ja usa.
  const criar = useCallback(async ({ type, text_content, media, background }) => {
    let media_url = null;

    if (type === 'image' || type === 'video') {
      if (!media?.file) throw new Error('Selecione um arquivo');
      const mime = String(media.file.type || '').toLowerCase();
      const ext = type === 'video'
        ? (mime.includes('webm') ? 'webm' : mime.includes('quicktime') ? 'mov' : 'mp4')
        : (mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg');
      const up = await uploadApi.uploadWithMeta(media.file, {
        bucket: 'feed_stories',
        fileName: `stories/${meId}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`,
        onProgress: media.onProgress
      });
      if (!up?.url) throw new Error('Falha no envio do arquivo');
      media_url = up.url;
    }

    const r = await apiClient.post('/stories', {
      type,
      text_content: text_content || null,
      media_url,
      background: background || null
    });
    await carregar();
    return r?.story || null;
  }, [carregar, meId]);

  const excluir = useCallback(async (storyId) => {
    await apiClient.del(`/stories/${storyId}`);
    await carregar();
  }, [carregar]);

  const listarVisualizacoes = useCallback(async (storyId) => {
    const r = await apiClient.get(`/stories/${storyId}/views`, { cache: false });
    return { total: Number(r?.total) || 0, viewers: Array.isArray(r?.viewers) ? r.viewers : [] };
  }, []);

  const meuGrupo = useMemo(
    () => grupos.find((g) => String(g.user_id) === meId) || null,
    [grupos, meId]
  );

  return {
    grupos,
    meuGrupo,
    loading,
    erro,
    carregar,
    criar,
    excluir,
    registrarVisualizacao,
    listarVisualizacoes,
    meId
  };
};
