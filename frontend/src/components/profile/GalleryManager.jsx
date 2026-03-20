import { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../utils/cropImage';
import { apiClient, uploadApi } from '../../services/apiClient';
import { connectRealtime, subscribe, unsubscribe } from '../../services/realtime';
import { Card } from '../ui/Card';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { Plus, Trash2, Image as ImageIcon, Video, Link as LinkIcon, X, Loader } from 'lucide-react';

export const GalleryManager = ({ userId }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewPost, setPreviewPost] = useState(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (previewPost) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = prev || '';
    }
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [previewPost]);
  
  const [newPost, setNewPost] = useState({
    file: null,
    caption: '',
    link_url: '',
    type: 'link'
  });
  const [galleryTab, setGalleryTab] = useState('image');
  const [previewThumb, setPreviewThumb] = useState(null);

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);

  useEffect(() => {
    if (!imageSrc) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [imageSrc]);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await apiClient.get(`/profiles/${userId}/posts`);

      if (!data) throw new Error('No data returned');
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!userId) return;
    const socket = connectRealtime('https://api.beatwap.com.br');
    const room = `profile:${userId}`;
    subscribe(room);
    const onPostCreated = (item) => {
      if (!item) return;
      if (String(item.user_id || '') !== String(userId)) return;
      const scope = String(item?.scope || 'public').toLowerCase().trim();
      const mediaType = String(item?.media_type || '').toLowerCase().trim();
      if (scope === 'feed') return;
      if (mediaType === 'text') return;
      setPosts(prev => [item, ...prev]);
    };
    const onPostDeleted = (payload) => {
      if (!payload?.id) return;
      setPosts(prev => prev.filter(p => p.id !== payload.id));
    };
    const onPostLikes = (payload) => {
      if (!payload?.id) return;
      setPosts(prev => prev.map(p => p.id === payload.id ? { ...p, likes_count: Number(payload.likes || 0) } : p));
    };
    socket.on('posts.created', onPostCreated);
    socket.on('posts.deleted', onPostDeleted);
    socket.on('posts.likes.updated', onPostLikes);
    return () => {
      unsubscribe(room);
      socket.off('posts.created', onPostCreated);
      socket.off('posts.deleted', onPostDeleted);
      socket.off('posts.likes.updated', onPostLikes);
    };
  }, [userId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.split('/')[0];
    if (fileType !== 'image' && fileType !== 'video') {
      alert('Apenas imagens e vídeos são permitidos.');
      return;
    }
    
    if (file.size > 150 * 1024 * 1024) {
       alert('Arquivo muito grande. Máximo 150MB.');
       return;
    }

    if (fileType === 'image') {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result);
        setOriginalFile(file);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedArea(null);
      };
      reader.readAsDataURL(file);
    } else {
      setNewPost(prev => ({ ...prev, type: 'video', file }));
    }
  };

  const extractYoutubeId = (url) => {
    if (!url) return null;
    const reg = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/i;
    const m = String(url).match(reg);
    return m && m[2] && m[2].length === 11 ? m[2] : null;
  };

  const onCropComplete = (_, pixels) => {
    setCroppedArea(pixels);
  };

  const handleSave = async () => {
    if (newPost.type === 'link') {
      const vid = extractYoutubeId(newPost.link_url);
      if (!vid) {
        alert('Informe um link válido do YouTube.');
        return;
      }
    } else if (newPost.type === 'video') {
      if (!newPost.file) {
        alert('Selecione um arquivo de vídeo.');
        return;
      }
    } else {
      if (!newPost.file && !originalFile) {
        alert('Selecione um arquivo.');
        return;
      }
    }

    setUploading(true);
    try {
      if (newPost.type === 'link') {
        const vid = extractYoutubeId(newPost.link_url);
        const thumb = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
        await apiClient.post('/posts', {
          user_id: userId,
          media_url: thumb,
          media_type: 'link',
          caption: newPost.caption,
          link_url: newPost.link_url
        });
      } else if (newPost.type === 'video') {
        const fileExt = newPost.file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const uploadResponse = await uploadApi.uploadWithMeta(newPost.file, { fileName, bucket: 'posts' });
        if (uploadResponse?.error) throw new Error(uploadResponse.error);
        if (!uploadResponse?.url) throw new Error('Falha no upload de vídeo');
        await apiClient.post('/posts', {
          user_id: userId,
          media_url: uploadResponse.url,
          media_type: 'video',
          caption: newPost.caption,
          link_url: ''
        });
      } else {
        let fileToUpload = newPost.file;
        if (!fileToUpload && originalFile && imageSrc && croppedArea) {
          const blob = await getCroppedImg(imageSrc, croppedArea, 1200, 1200);
          fileToUpload = new File([blob], originalFile.name, { type: blob.type || originalFile.type });
        }
        const toDataUrl = (blobOrFile) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blobOrFile);
          });
        const dataUrl = await toDataUrl(fileToUpload);
        await apiClient.post('/posts', {
          user_id: userId,
          media_url: dataUrl,
          media_type: 'image',
          caption: newPost.caption,
          link_url: newPost.link_url
        });
      }

      setShowModal(false);
      setNewPost({ file: null, caption: '', link_url: '', type: 'image' });
      setImageSrc(null);
      setOriginalFile(null);
      setPreviewThumb(null);
      fetchPosts();
      alert('Publicado com sucesso!');
    } catch (error) {
      console.error('Error uploading post:', error);
      alert('Erro ao publicar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (post) => {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;

    try {
      await apiClient.del(`/posts/${post.id}`);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Erro ao excluir.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Galeria e Momentos</h3>
        <AnimatedButton onClick={() => setShowModal(true)} icon={Plus}>
          Novo Post
        </AnimatedButton>
      </div>

      {loading ? (
        <div className="text-center py-10"><Loader className="animate-spin mx-auto text-beatwap-gold" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white/5 rounded-xl border border-white/5">
          <ImageIcon className="mx-auto mb-2 opacity-50" size={32} />
          <p>Nenhum post ainda. Compartilhe seus momentos!</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {['video','image','link'].map(tab => (
              <button
                key={tab}
                onClick={() => setGalleryTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                  galleryTab === tab
                    ? 'bg-beatwap-gold text-beatwap-black'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {tab === 'video' ? 'Vídeos' : tab === 'image' ? 'Fotos' : 'Outros'}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {posts.filter(p => p.media_type === galleryTab).map(post => (
              <div
                key={post.id}
                className="group relative bg-black rounded-xl overflow-hidden border-2 border-beatwap-gold cursor-pointer"
                onClick={() => setPreviewPost(post)}
              >
                {post.media_type === 'video' ? (
                  <div className="relative w-full aspect-[9/16] bg-black">
                    <video src={post.media_url} className="absolute inset-0 w-full h-full object-cover" controls playsInline preload="metadata" />
                  </div>
                ) : post.media_type === 'link' ? (
                  <div className="relative w-full aspect-video bg-black">
                    <img
                      src={post.media_url}
                      alt={post.caption || 'Link'}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { try { e.currentTarget.style.display = 'none'; } catch { void 0; } }}
                    />
                  </div>
                ) : (
                  <div className="relative w-full aspect-square bg-black">
                    <img
                      src={post.media_url}
                      alt={post.caption || 'Foto'}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { try { e.currentTarget.style.display = 'none'; } catch { void 0; } }}
                    />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                  <div className="flex justify-end">
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(post); }} className="text-red-500 hover:text-red-400 p-2 bg-black/50 rounded-full transition-colors">
                          <Trash2 size={18} />
                      </button>
                  </div>
                  <div>
                      {post.caption && <p className="text-white text-sm font-medium line-clamp-2 drop-shadow-md">{post.caption}</p>}
                      {post.link_url && (
                          <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="text-beatwap-gold text-xs flex items-center gap-1 mt-1 hover:underline drop-shadow-md">
                              <LinkIcon size={12} /> Link
                          </a>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 pointer-events-auto">
          <Card className="w-full max-w-md relative animate-in fade-in zoom-in duration-200 border border-white/10 shadow-2xl">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-6">Novo Post</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setNewPost({ ...newPost, type: 'link', file: null }); setPreviewThumb(null); }}
                  className={`px-3 py-2 rounded-lg border ${newPost.type === 'link' ? 'bg-beatwap-gold text-black border-beatwap-gold' : 'bg-white/5 text-white border-white/10'}`}
                >
                  Link
                </button>
                <button
                  onClick={() => { setNewPost({ ...newPost, type: 'image', file: null }); setPreviewThumb(null); }}
                  className={`px-3 py-2 rounded-lg border ${newPost.type === 'image' ? 'bg-beatwap-gold text-black border-beatwap-gold' : 'bg-white/5 text-white border-white/10'}`}
                >
                  Imagem
                </button>
                <button
                  onClick={() => { setNewPost({ ...newPost, type: 'video', file: null }); setPreviewThumb(null); }}
                  className={`px-3 py-2 rounded-lg border ${newPost.type === 'video' ? 'bg-beatwap-gold text-black border-beatwap-gold' : 'bg-white/5 text-white border-white/10'}`}
                >
                  Vídeo
                </button>
              </div>

              {newPost.type === 'link' ? (
                <div className="space-y-3">
                  <AnimatedInput 
                    label="Link do YouTube (1920×1080)"
                    value={newPost.link_url}
                    onChange={e => {
                      const v = e.target.value;
                      setNewPost({ ...newPost, link_url: v });
                      const id = extractYoutubeId(v);
                      setPreviewThumb(id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null);
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  {previewThumb && (
                    <div className="border-2 border-beatwap-gold rounded-xl overflow-hidden">
                      <img src={previewThumb} alt="Prévia" className="w-full h-auto" />
                    </div>
                  )}
                </div>
              ) : newPost.type === 'video' ? (
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer relative group">
                  <input 
                      type="file" 
                      accept="video/*" 
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {newPost.file ? (
                      <div className="text-sm text-green-400 flex items-center justify-center gap-2">
                          <Video size={20} />
                          <span className="truncate max-w-[200px]">{newPost.file.name}</span>
                      </div>
                  ) : (
                      <div className="text-gray-400 group-hover:text-white transition-colors">
                          <Plus className="mx-auto mb-2" />
                          <span>Clique para selecionar vídeo</span>
                      </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer relative group">
                  <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {newPost.file ? (
                      <div className="text-sm text-green-400 flex items-center justify-center gap-2">
                          <ImageIcon size={20} />
                          <span className="truncate max-w-[200px]">{newPost.file.name}</span>
                      </div>
                  ) : (
                      <div className="text-gray-400 group-hover:text-white transition-colors">
                          <Plus className="mx-auto mb-2" />
                          <span>Clique para selecionar imagem</span>
                      </div>
                  )}
                </div>
              )}

              <AnimatedInput 
                label="Legenda"
                value={newPost.caption}
                onChange={e => setNewPost({...newPost, caption: e.target.value})}
                placeholder="Escreva algo sobre este momento..."
              />

              {newPost.type === 'image' && (
                <AnimatedInput 
                  label="Link (Opcional)"
                  value={newPost.link_url}
                  onChange={e => {
                    const v = e.target.value;
                    const id = extractYoutubeId(v);
                    if (id) {
                      setNewPost({ ...newPost, link_url: v, type: 'link' });
                      setPreviewThumb(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
                    } else {
                      setNewPost({ ...newPost, link_url: v });
                    }
                  }}
                  placeholder="https://..."
                />
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button 
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                    Cancelar
                </button>
                <AnimatedButton 
                    onClick={handleSave} 
                    loading={uploading}
                    className="bg-beatwap-gold text-black hover:bg-yellow-500 transition-colors"
                >
                    Publicar
                </AnimatedButton>
              </div>
            </div>
          </Card>
        </div>
      )}

      {imageSrc && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 pointer-events-auto">
          <Card className="w-full max-w-md relative border border-white/10 bg-[#121212]">
            <button
              onClick={() => {
                setImageSrc(null);
                setOriginalFile(null);
                setNewPost({ file: null, caption: '', link_url: '', type: 'image' });
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-4">Ajustar imagem</h3>
            <div className="space-y-4">
              <div
                className="relative w-full max-w-sm aspect-square bg-transparent rounded-xl overflow-hidden pointer-events-auto mx-auto"
                style={{ touchAction: 'none' }}
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  cropShape="rect"
                  showGrid={true}
                  objectFit="cover"
                  restrictPosition={false}
                />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-beatwap-gold h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setImageSrc(null);
                    setOriginalFile(null);
                    setNewPost({ file: null, caption: '', link_url: '', type: 'image' });
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!imageSrc || !croppedArea || !originalFile) return;
                    try {
                      const blob = await getCroppedImg(imageSrc, croppedArea, 1080, 1080);
                      const file = new File([blob], originalFile.name, { type: blob.type || originalFile.type });
                      setNewPost({ ...newPost, file, type: 'image' });
                      setImageSrc(null);
                      setOriginalFile(null);
                    } catch (e) {
                      alert('Erro ao recortar imagem.');
                    }
                  }}
                  className="px-4 py-2 text-sm font-bold bg-beatwap-gold text-black rounded-lg hover:bg-yellow-500 transition-colors"
                >
                  Confirmar recorte
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {previewPost && (
        <div className="fixed inset-0 bg-black/95 z-[10000]" onClick={() => setPreviewPost(null)}>
          <button
            onClick={() => setPreviewPost(null)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
          >
            <X size={18} className="text-gray-300" />
          </button>
          <div className="w-screen h-screen flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const url = previewPost.link_url || previewPost.media_url;
              const isYoutube = (() => {
                try { const u = new URL(url); return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be'); } catch { return false; }
              })();
              if (isYoutube) {
                const embed = (() => {
                  try {
                    const u = new URL(url);
                    if (u.hostname.includes('youtube.com')) {
                      const id = u.searchParams.get('v');
                      return id ? `https://www.youtube.com/embed/${id}` : null;
                    }
                    if (u.hostname.includes('youtu.be')) {
                      const id = u.pathname.replace('/', '');
                      return id ? `https://www.youtube.com/embed/${id}` : null;
                    }
                    return null;
                  } catch { return null; }
                })();
                return (
                  <div className="relative w-[90vw] max-w-[90vw] max-h-[85vh] aspect-video border-2 border-beatwap-gold rounded-xl overflow-hidden bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={embed || ''}
                      title="Vídeo"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                );
              }
              if (previewPost.media_type === 'image') {
                return (
                  <img src={previewPost.media_url} alt={previewPost.caption || 'Imagem'} className="max-w-[90vw] max-h-[85vh] w-auto h-auto border-2 border-beatwap-gold rounded-xl" />
                );
              }
              return (
                <video
                  src={previewPost.media_url}
                  className="max-w-[90vw] max-h-[85vh] w-auto h-auto border-2 border-beatwap-gold rounded-xl"
                  controls
                  autoPlay
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
