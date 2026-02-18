import React, { useState, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../utils/cropImage';
import { supabase } from '../../services/supabaseClient';
import { Card } from '../ui/Card';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { Plus, Trash2, Image as ImageIcon, Video, Link as LinkIcon, X, Loader } from 'lucide-react';

export const GalleryManager = ({ userId }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [newPost, setNewPost] = useState({
    file: null,
    caption: '',
    link_url: '',
    type: 'image'
  });

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);

  useEffect(() => {
    if (userId) fetchPosts();
  }, [userId]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('profile_posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.split('/')[0];
    if (fileType !== 'image' && fileType !== 'video') {
      alert('Apenas imagens e vídeos são permitidos.');
      return;
    }
    
    // Validate size (e.g. 50MB)
    if (file.size > 50 * 1024 * 1024) {
       alert('Arquivo muito grande. Máximo 50MB.');
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
      setNewPost({ ...newPost, file, type: fileType });
    }
  };

  const onCropComplete = (_, pixels) => {
    setCroppedArea(pixels);
  };

  const handleSave = async () => {
    if (!newPost.file && !originalFile) {
      alert('Selecione um arquivo.');
      return;
    }

    setUploading(true);
    try {
      let fileToUpload = newPost.file;
      if (!fileToUpload && originalFile && imageSrc && croppedArea) {
        const blob = await getCroppedImg(imageSrc, croppedArea, 1200, 1200);
        fileToUpload = new File([blob], originalFile.name, { type: blob.type || originalFile.type });
      }

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('profile_posts')
        .insert([{
          user_id: userId,
          media_url: publicUrlData.publicUrl,
          media_type: newPost.type,
          caption: newPost.caption,
          link_url: newPost.link_url
        }]);

      if (dbError) throw dbError;

      setShowModal(false);
      setNewPost({ file: null, caption: '', link_url: '', type: 'image' });
      setImageSrc(null);
      setOriginalFile(null);
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
        // Extract path from URL if needed for storage delete
        // URL: .../posts/USER_ID/FILENAME
        const path = post.media_url.split('/posts/')[1];
        if (path) {
            await supabase.storage.from('posts').remove([path]);
        }

        const { error } = await supabase
            .from('profile_posts')
            .delete()
            .eq('id', post.id);

        if (error) throw error;
        
        setPosts(posts.filter(p => p.id !== post.id));
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {posts.map(post => (
            <div key={post.id} className="group relative aspect-square bg-black rounded-xl overflow-hidden border border-white/10">
              {post.media_type === 'video' ? (
                <video src={post.media_url} className="w-full h-full object-cover" controls />
              ) : (
                <img src={post.media_url} alt={post.caption} className="w-full h-full object-cover" />
              )}
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                <div className="flex justify-end">
                    <button onClick={() => handleDelete(post)} className="text-red-500 hover:text-red-400 p-2 bg-black/50 rounded-full transition-colors">
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
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md relative animate-in fade-in zoom-in duration-200 border border-white/10 shadow-2xl">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-6">Novo Post</h3>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer relative group">
                <input 
                    type="file" 
                    accept="image/*,video/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                {newPost.file ? (
                    <div className="text-sm text-green-400 flex items-center justify-center gap-2">
                        {newPost.type === 'video' ? <Video size={20} /> : <ImageIcon size={20} />}
                        <span className="truncate max-w-[200px]">{newPost.file.name}</span>
                    </div>
                ) : (
                    <div className="text-gray-400 group-hover:text-white transition-colors">
                        <Plus className="mx-auto mb-2" />
                        <span>Clique para selecionar foto ou vídeo</span>
                    </div>
                )}
              </div>

              <AnimatedInput 
                label="Legenda"
                value={newPost.caption}
                onChange={e => setNewPost({...newPost, caption: e.target.value})}
                placeholder="Escreva algo sobre este momento..."
              />

              <AnimatedInput 
                label="Link (Opcional)"
                value={newPost.link_url}
                onChange={e => setNewPost({...newPost, link_url: e.target.value})}
                placeholder="https://..."
              />

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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
              <div className="relative w-full h-64 bg-black rounded-xl overflow-hidden">
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
                  objectFit="contain"
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
                      const blob = await getCroppedImg(imageSrc, croppedArea, 1200, 1200);
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
    </div>
  );
};
