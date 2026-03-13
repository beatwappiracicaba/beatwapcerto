import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';

export const AudioPlayer = ({ src, title, artist, minimal = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => {
            console.error("Playback failed", e);
            setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      if (total > 0) {
        setProgress((current / total) * 100);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className={`bg-beatwap-graphite/50 border border-white/5 rounded-xl overflow-hidden ${minimal ? 'p-2' : 'p-4'}`}>
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      <div className="flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsPlaying(!isPlaying)}
          className={`flex items-center justify-center rounded-full bg-beatwap-gold text-beatwap-black ${minimal ? 'w-8 h-8' : 'w-12 h-12'}`}
        >
          {isPlaying ? <Pause size={minimal ? 14 : 20} fill="currentColor" /> : <Play size={minimal ? 14 : 20} fill="currentColor" className="ml-1" />}
        </motion.button>

        <div className="flex-1">
          {!minimal && (
            <div className="mb-2">
              <h4 className="font-bold text-white text-sm">{title || "Preview da Música"}</h4>
              {artist && <p className="text-xs text-gray-400">{artist}</p>}
            </div>
          )}
          
          {/* Waveform Visualization (Real) */}
          <div className="h-8 flex items-end gap-1 overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-beatwap-gold/30 rounded-full"
                animate={{ 
                  height: isPlaying ? [10, Math.random() * 25 + 5, 10] : 8,
                  backgroundColor: progress > (i / 30) * 100 ? '#F5C542' : 'rgba(245, 197, 66, 0.3)'
                }}
                transition={{ 
                  duration: 0.5, 
                  repeat: isPlaying ? Infinity : 0,
                  delay: i * 0.05 
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
