
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Save, Check, Camera } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';
import { getCroppedImg } from '../../utils/cropImage';

export const ProfileEditModal = ({ isOpen, onClose, currentAvatar, currentName, currentBio, onSave, uploading }) => {
  const [name, setName] = useState(currentName || '');
  const [bio, setBio] = useState(currentBio || '');
  
  const [imageSrc, setImageSrc] = useState(null); // Raw image for cropping
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const [previewUrl, setPreviewUrl] = useState(null); // Cropped image preview
  const [blobToUpload, setBlobToUpload] = useState(null); // Blob to upload

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName || '');
      setBio(currentBio || '');
      setPreviewUrl(null);
      setBlobToUpload(null);
      setImageSrc(null);
    }
  }, [isOpen, currentName, currentBio]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
    }
  };

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const handleCropConfirm = async () => {
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const preview = URL.createObjectURL(croppedBlob);
      setPreviewUrl(preview);
      setBlobToUpload(croppedBlob);
      setImageSrc(null); // Exit crop mode
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = () => {
    onSave({ name, bio, blob: blobToUpload });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-beatwap-black">
            <h3 className="text-xl font-bold text-white">Editar Perfil</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            {imageSrc ? (
              // Crop Mode
              <div className="space-y-4">
                <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    cropShape="round"
                    showGrid={false}
                  />
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">Zoom</span>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      onChange={(e) => setZoom(e.target.value)}
                      className="w-full accent-beatwap-gold h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                     <button 
                        onClick={() => setImageSrc(null)}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                     >
                        Cancelar
                     </button>
                     <AnimatedButton onClick={handleCropConfirm} icon={Check}>
                        Confirmar Recorte
                     </AnimatedButton>
                </div>
              </div>
            ) : (
              // Form Mode
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-beatwap-gold/20 relative group">
                      <img 
                        src={previewUrl || currentAvatar || 'https://via.placeholder.com/150'} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                      />
                      <div 
                        onClick={() => fileInputRef.current.click()}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Camera size={24} className="text-white" />
                      </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current.click()}
                    className="text-sm text-beatwap-gold hover:underline"
                  >
                    Alterar Foto
                  </button>
                </div>

                {/* Inputs Section */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Nome</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors"
                            placeholder="Seu nome de artista"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Status / Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors resize-none h-24"
                            placeholder="Conte um pouco sobre você..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                     <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                     >
                        Cancelar
                     </button>
                     <AnimatedButton onClick={handleSave} isLoading={uploading} icon={Save}>
                        Salvar Alterações
                     </AnimatedButton>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
