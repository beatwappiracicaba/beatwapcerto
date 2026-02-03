import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [artists, setArtists] = useState([]);
  const [music, setMusic] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`*`);
        if (profilesError) throw profilesError;

        const formattedArtists = (profilesData || []).map(artist => ({
          ...artist,
          metrics: { plays: '0', listeners: '0', revenue: 'R$ 0,00', growth: '0%' }
        }));

        // Load metrics in batch for artists
        const artistIds = (formattedArtists || [])
          .filter(a => a.cargo === 'Artista')
          .map(a => a.id);
        let metricsMap = {};
        if (artistIds.length) {
          const { data: metricsData } = await supabase
            .from('artist_metrics')
            .select('artista_id,total_plays,ouvintes_mensais,receita_estimada')
            .in('artista_id', artistIds);
          (metricsData || []).forEach(m => {
            metricsMap[m.artista_id] = {
              plays: String(m.total_plays ?? '0'),
              listeners: String(m.ouvintes_mensais ?? '0'),
              revenue: String(m.receita_estimada ?? '0'),
              growth: '0%'
            };
          });
        }
        const mergedArtists = formattedArtists.map(a => ({
          ...a,
          metrics: metricsMap[a.id] || a.metrics
        }));

        const { data: musicData, error: musicError } = await supabase
          .from('musics')
          .select('*')
          .order('created_at', { ascending: false });
        if (musicError) throw musicError;

        setArtists(mergedArtists);

        // Normalização de dados para o frontend (camelCase) com colunas reais
        const normalizedMusic = (musicData || []).map(m => ({
          ...m,
          id: m.id,
          title: m.titulo,
          artist: m.nome_artista,
          artistId: m.artista_id,
          cover: m.cover_url,
          audioFile: m.audio_url,
          authorizationFile: m.authorization_url,
          isOriginal: m.is_original,
          status: m.status,
          genre: m.estilo,
          releaseDate: new Date(m.created_at).toLocaleDateString('pt-BR'),
          isrc: m.isrc || 'Pendente',
          upc: m.upc || 'Pendente',
          date: new Date(m.created_at).toLocaleDateString('pt-BR')
        }));
        setMusic(normalizedMusic);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time updates for profiles and musics
    const channel = supabase
      .channel('public:data-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'musics' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateArtistMetrics = async (artistId, newMetrics) => {
    try {
      // Optimistic update
      setArtists(prev => prev.map(artist => 
        artist.id === artistId 
          ? { ...artist, metrics: { ...artist.metrics, ...newMetrics } }
          : artist
      ));

      // Database upsert to artist_metrics (schema real)
      const payload = {
        artista_id: artistId,
        total_plays: Number(newMetrics.plays ?? 0),
        ouvintes_mensais: Number(newMetrics.listeners ?? 0),
        receita_estimada: Number(String(newMetrics.revenue ?? '0').replace(/[^\d.-]/g, '')) || 0
      };
      const { error } = await supabase
        .from('artist_metrics')
        .upsert(payload, { onConflict: 'artista_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating metrics:', error);
      // Revert logic could be added here
    }
  };

  const updateMusicStatus = async (musicId, status, additionalData = {}) => {
    try {
      // Optimistic update
      setMusic(prev => prev.map(m => 
        m.id === musicId 
          ? { ...m, status, ...additionalData }
          : m
      ));

      // Database update
      const { error } = await supabase
        .from('musics')
        .update({ status, ...additionalData })
        .eq('id', musicId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating music status:', error);
    }
  };

  const addMusic = async (newMusicData) => {
    try {
      // Mapeamento alinhado ao schema existente
      const musicPayload = {
        status: newMusicData.status || 'pendente',
        titulo: newMusicData.title,
        estilo: newMusicData.genre,
        isrc: newMusicData.isrc,
        artista_id: newMusicData.artistId,
        nome_artista: newMusicData.artist,
        audio_url: newMusicData.audioFile,
        cover_url: newMusicData.cover,
        authorization_url: newMusicData.authorizationUrl || null,
        plataformas: newMusicData.plataformas || ['Todas']
      };

      const { data, error } = await supabase
        .from('musics')
        .insert([musicPayload])
        .select()
        .single();

      if (error) throw error;

      // Map back to frontend structure (Consistent with normalized fetch)
      const newMusic = {
        ...data,
        id: data.id,
        artistId: data.artista_id,
        artist: data.nome_artista,
        audioFile: data.audio_url,
        cover: data.cover_url,
        authorizationFile: data.authorization_url,
        isOriginal: data.is_original,
        status: data.status,
        genre: data.estilo,
        releaseDate: new Date(data.created_at).toLocaleDateString('pt-BR'),
        isrc: data.isrc || 'Pendente',
        upc: data.upc || 'Pendente',
        date: new Date(data.created_at).toLocaleDateString('pt-BR')
      };

      setMusic(prev => [newMusic, ...prev]);
      return newMusic;
    } catch (error) {
      console.error('Error adding music:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      throw error;
    }
  };

  const editMusic = async (musicId, updatedData) => {
    try {
      // Optimistic update
      setMusic(prev => prev.map(m => 
        m.id === musicId 
          ? { ...m, ...updatedData }
          : m
      ));

      // Map keys
      const dbData = {};
    if (updatedData.artistId) dbData.artista_id = updatedData.artistId;
    if (updatedData.artist) dbData.nome_artista = updatedData.artist;
      if (updatedData.audioFile) dbData.audio_url = updatedData.audioFile;
      if (updatedData.cover) dbData.cover_url = updatedData.cover;
    if (updatedData.title) dbData.titulo = updatedData.title;
    if (updatedData.genre) dbData.estilo = updatedData.genre;
      if (updatedData.isrc) dbData.isrc = updatedData.isrc;
      if (updatedData.upc) dbData.upc = updatedData.upc;
    // coluna internal_note não existe no schema; omitida para evitar erro

      const { error } = await supabase
        .from('musics')
        .update(dbData)
        .eq('id', musicId);

      if (error) throw error;
    } catch (error) {
      console.error('Error editing music:', error);
    }
  };

  const deleteMusic = async (musicId) => {
    try {
      setMusic(prev => prev.filter(m => m.id !== musicId));
      
      const { error } = await supabase
        .from('musics')
        .delete()
        .eq('id', musicId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting music:', error);
    }
  };

  const getArtistById = (id) => artists.find(a => a.id === id);

  return (
    <DataContext.Provider value={{ 
      artists, 
      music, 
      loading,
      setMusic,
      updateArtistMetrics,
      updateMusicStatus,
      addMusic,
      editMusic,
      deleteMusic,
      getArtistById 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
