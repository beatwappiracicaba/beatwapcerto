import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [artists, setArtists] = useState([]);
  const [music, setMusic] = useState([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (profile?.cargo !== 'Produtor') {
        setArtists([]);
        setMusic([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const profilesData = await apiClient.get('/profiles');

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
          const idsParam = encodeURIComponent(artistIds.join(','));
          const metricsRows = await apiClient.get(`/admin/artists/metrics?ids=${idsParam}`);
          (metricsRows || []).forEach(m => {
            const id = m?.artist_id || m?.artista_id;
            if (!id) return;
            metricsMap[id] = {
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

        const musicData = await apiClient.get('/admin/musics');

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

  }, [profile?.cargo]);

  const updateArtistMetrics = async (artistId, newMetrics) => {
    try {
      setArtists(prev => prev.map(artist => 
        artist.id === artistId 
          ? { ...artist, metrics: { ...artist.metrics, ...newMetrics } }
          : artist
      ));

      const payload = {
        total_plays: Number(newMetrics.plays ?? 0),
        ouvintes_mensais: Number(newMetrics.listeners ?? 0),
        receita_estimada: Number(String(newMetrics.revenue ?? '0').replace(/[^\d.-]/g, '')) || 0
      };
      await apiClient.post(`/admin/artist/${artistId}/metrics`, payload);
    } catch (error) {
      console.error('Error updating metrics:', error);
      console.error('Error details:', error?.message, error?.details, error?.hint);
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

      await apiClient.put(`/admin/musics/${musicId}`, { status, ...additionalData });
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
        plataformas: newMusicData.plataformas || ['Todas'],
        composer: newMusicData.composer || null,
        producer: newMusicData.producer || null,
        has_feat: newMusicData.hasFeaturing || false,
        feat_name: newMusicData.featuringArtist || null,
        album_id: newMusicData.albumId || null,
        album_title: newMusicData.albumTitle || null
      };

      const data = await apiClient.post('/admin/musics', musicPayload);
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
        date: new Date(data.created_at).toLocaleDateString('pt-BR'),
        composer: data.composer,
        producer: data.producer,
        hasFeaturing: data.has_feat,
        featuringArtist: data.feat_name,
        albumId: data.album_id,
        albumTitle: data.album_title
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

      await apiClient.put(`/admin/musics/${musicId}`, dbData);
    } catch (error) {
      console.error('Error editing music:', error);
    }
  };

  const deleteMusic = async (musicId) => {
    try {
      setMusic(prev => prev.filter(m => m.id !== musicId));
      await apiClient.del(`/admin/musics/${musicId}`);
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
