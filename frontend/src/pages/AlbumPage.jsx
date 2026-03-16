import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import Header from '../components/landing/Header';
import Footer from '../components/landing/Footer';
import { Play, Pause, ArrowLeft, Music } from 'lucide-react';
import { AnimatedButton } from '../components/ui/AnimatedButton';

const AlbumPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState([]);
  const [albumInfo, setAlbumInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [playStartTS, setPlayStartTS] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchAlbum();
  }, [id]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const fetchAlbum = async () => {
    try {
      setLoading(true);
      const list = await apiClient.get(`/albums/${id}/tracks`);
      setTracks(list);
      if (list.length > 0) {
        const first = list[0];
        setAlbumInfo({
          title: first.album_title || first.titulo || 'Álbum',
          artistName: first.nome_artista || 'Artista',
          cover_url: first.cover_url || null,
          estilo: first.estilo || '',
          release_date: first.release_date || null
        });
      } else {
        setAlbumInfo(null);
      }
    } catch (e) {
      console.error('Erro ao carregar álbum:', e);
    } finally {
      setLoading(false);
    }
  };

  const recordEvent = async (payload) => {
    try {
      await apiClient.post('/analytics', { ...payload, ip_hash: 'album_page' });
    } catch (e) {
      void e;
    }
  };

  const togglePlay = (trackId, url, artistId) => {
    if (!url) return;
    if (playingTrack === trackId && audioElement) {
      if (audioElement.paused) {
        audioElement.play().catch(() => {});
        setPlayStartTS(Date.now());
      } else {
        audioElement.pause();
        if (playStartTS) {
          const duration = Math.max(0, Math.round((Date.now() - playStartTS) / 1000));
          recordEvent({ type: 'music_play', music_id: trackId, artist_id: artistId, duration_seconds: duration });
          setPlayStartTS(null);
        }
      }
      return;
    }
    if (audioElement) {
      audioElement.pause();
    }
    const audio = new Audio(url);
    audio.onended = () => {
      if (playStartTS) {
        const duration = Math.max(0, Math.round((Date.now() - playStartTS) / 1000));
        recordEvent({ type: 'music_play', music_id: trackId, artist_id: artistId, duration_seconds: duration });
        setPlayStartTS(null);
      }
      setPlayingTrack(null);
      setAudioElement(null);
    };
    audio.play().catch(() => {});
    setPlayStartTS(Date.now());
    setAudioElement(audio);
    setPlayingTrack(trackId);
  };

  const hasTracks = tracks && tracks.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />
      <main className="flex-1 bg-gradient-to-b from-black via-black to-[#06060a] pt-24 md:pt-28">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white relative z-10"
            >
              <ArrowLeft size={16} />
              <span>Voltar</span>
            </button>
          </div>

          {loading && (
            <div className="text-gray-300 text-center py-20">
              <span>Carregando álbum...</span>
            </div>
          )}

          {!loading && !hasTracks && (
            <div className="text-gray-300 text-center py-20">
              <span>Álbum não encontrado.</span>
            </div>
          )}

          {!loading && hasTracks && albumInfo && (
            <>
              <div className="flex flex-col md:flex-row gap-6 mb-10">
                <div className="w-40 h-40 md:w-56 md:h-56 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                  {albumInfo.cover_url ? (
                    <img
                      src={albumInfo.cover_url}
                      alt={albumInfo.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-12 h-12 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-xs uppercase tracking-[0.2em] text-beatwap-gold mb-2">
                    Álbum
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {albumInfo.title}
                  </h1>
                  <div className="text-gray-300 text-sm mb-1">
                    {albumInfo.artistName}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {albumInfo.estilo && <span>{albumInfo.estilo} • </span>}
                    {albumInfo.release_date && (
                      <span>Lançado em {new Date(albumInfo.release_date).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 text-xs uppercase tracking-[0.2em] text-gray-400 flex items-center justify-between">
                  <span>Faixas</span>
                  <span>{tracks.length} músicas</span>
                </div>
                <div className="divide-y divide-white/10">
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors"
                    >
                      <div className="w-8 text-center text-xs text-gray-500">
                        {index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePlay(track.id, track.preview_url || track.audio_url, track.artista_id)}
                        className="w-9 h-9 rounded-full bg-beatwap-gold flex items-center justify-center text-black hover:bg-white transition-colors shrink-0"
                      >
                        {playingTrack === track.id ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {track.titulo}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {track.nome_artista}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AlbumPage;
