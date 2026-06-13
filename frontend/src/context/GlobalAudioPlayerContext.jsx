import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Music, Pause, Play, RotateCcw, SkipBack, SkipForward, X } from 'lucide-react';

const GlobalAudioPlayerContext = createContext(null);

const normalizeNumber = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const formatTime = (value) => {
  const totalSeconds = Math.max(0, Math.floor(normalizeNumber(value, 0)));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const buildTrack = (track) => {
  const src = String(track?.src || '').trim();
  if (!src) return null;
  return {
    id: String(track?.id || src),
    src,
    title: String(track?.title || 'Tocando agora'),
    artist: String(track?.artist || ''),
    coverUrl: String(track?.coverUrl || '').trim(),
    startSeconds: Math.max(0, normalizeNumber(track?.startSeconds, 0)),
    endSeconds: track?.endSeconds,
    previewDurationSeconds: normalizeNumber(track?.previewDurationSeconds, 30),
    full: track?.full === true,
    onPlaybackEvent: typeof track?.onPlaybackEvent === 'function' ? track.onPlaybackEvent : null
  };
};

export const GlobalAudioPlayerProvider = ({ children }) => {
  const audioRef = useRef(null);
  const currentTrackRef = useRef(null);
  const playbackStartedAtRef = useRef(null);
  const loadingTrackIdRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const getTrackBounds = useCallback((track = currentTrackRef.current, audioDuration = null) => {
    const activeTrack = track || null;
    const start = Math.max(0, normalizeNumber(activeTrack?.startSeconds, 0));
    const resolvedDuration = Number.isFinite(Number(audioDuration))
      ? Number(audioDuration)
      : Number(audioRef.current?.duration);

    let end = null;
    const rawEnd = Number(activeTrack?.endSeconds);
    if (Number.isFinite(rawEnd) && rawEnd > start) {
      end = rawEnd;
    } else if (activeTrack && activeTrack.full !== true) {
      end = start + Math.max(1, normalizeNumber(activeTrack.previewDurationSeconds, 30));
    }

    if (Number.isFinite(resolvedDuration) && resolvedDuration > 0) {
      end = end == null ? resolvedDuration : Math.min(end, resolvedDuration);
    }

    return { start, end };
  }, []);

  const clampTime = useCallback((value, track = currentTrackRef.current, audioDuration = null) => {
    const nextValue = Math.max(0, normalizeNumber(value, 0));
    const bounds = getTrackBounds(track, audioDuration);
    if (bounds.end == null) {
      return Math.max(bounds.start, nextValue);
    }
    return Math.min(bounds.end, Math.max(bounds.start, nextValue));
  }, [getTrackBounds]);

  const flushPlaybackEvent = useCallback((reason = 'stop') => {
    const startedAt = playbackStartedAtRef.current;
    playbackStartedAtRef.current = null;
    if (!startedAt) return;
    const track = currentTrackRef.current;
    const callback = track?.onPlaybackEvent;
    if (typeof callback !== 'function') return;
    const durationSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    if (durationSeconds <= 0) return;
    try {
      callback({ reason, durationSeconds, track });
    } catch {
      void 0;
    }
  }, []);

  const startPlaybackSession = useCallback(() => {
    playbackStartedAtRef.current = Date.now();
  }, []);

  const playAudio = useCallback(async () => {
    const audio = audioRef.current;
    const track = currentTrackRef.current;
    if (!audio || !track) return;
    const bounds = getTrackBounds(track);
    const maxBoundary = bounds.end ?? duration;
    if (Number.isFinite(maxBoundary) && maxBoundary > 0 && audio.currentTime >= maxBoundary - 0.25) {
      audio.currentTime = bounds.start;
      setCurrentTime(bounds.start);
    }
    try {
      await audio.play();
      setIsPlaying(true);
      startPlaybackSession();
    } catch {
      setIsPlaying(false);
    }
  }, [duration, getTrackBounds, startPlaybackSession]);

  const pausePlayback = useCallback((reason = 'pause') => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    flushPlaybackEvent(reason);
  }, [flushPlaybackEvent]);

  const stopPlayback = useCallback((reason = 'stop', clearTrack = false) => {
    const audio = audioRef.current;
    const track = currentTrackRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
    flushPlaybackEvent(reason);
    const bounds = getTrackBounds(track);
    const resetTime = bounds.start;
    if (audio) {
      try {
        audio.currentTime = resetTime;
      } catch {
        void 0;
      }
    }
    setCurrentTime(0);
    if (clearTrack) {
      if (audio) {
        try {
          audio.removeAttribute('src');
          audio.load();
        } catch {
          void 0;
        }
      }
      currentTrackRef.current = null;
      setCurrentTrack(null);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [flushPlaybackEvent, getTrackBounds]);

  const seekTo = useCallback((value) => {
    const audio = audioRef.current;
    const track = currentTrackRef.current;
    if (!audio || !track) return;
    const bounds = getTrackBounds(track, audio.duration);
    const absoluteTime = bounds.start + Math.max(0, normalizeNumber(value, 0));
    const nextTime = clampTime(absoluteTime, track, audio.duration);
    try {
      audio.currentTime = nextTime;
    } catch {
      void 0;
    }
    setCurrentTime(Math.max(0, nextTime - bounds.start));
  }, [clampTime, getTrackBounds]);

  const skipBy = useCallback((deltaSeconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    seekTo(audio.currentTime + normalizeNumber(deltaSeconds, 0));
  }, [seekTo]);

  const playTrack = useCallback(async (trackLike) => {
    const nextTrack = buildTrack(trackLike);
    if (!nextTrack) return;
    const audio = audioRef.current;
    if (!audio) return;

    const activeTrack = currentTrackRef.current;
    const sameTrack = activeTrack && activeTrack.id === nextTrack.id;

    if (sameTrack) {
      if (isPlaying) {
        pausePlayback('pause');
      } else {
        await playAudio();
      }
      return;
    }

    stopPlayback('switch', false);

    loadingTrackIdRef.current = nextTrack.id;
    currentTrackRef.current = nextTrack;
    setCurrentTrack(nextTrack);
    setDuration(0);
    setCurrentTime(0);

    audio.src = nextTrack.src;
    audio.preload = 'metadata';
    audio.load();

    const applyStartTime = () => {
      const active = currentTrackRef.current;
      if (!active || active.id !== nextTrack.id) return;
      const bounded = clampTime(active.startSeconds, active, audio.duration);
      try {
        audio.currentTime = bounded;
      } catch {
        void 0;
      }
      setCurrentTime(0);
    };

    if (audio.readyState >= 1) {
      applyStartTime();
    } else {
      audio.addEventListener('loadedmetadata', applyStartTime, { once: true });
    }

    await playAudio();
  }, [clampTime, isPlaying, pausePlayback, playAudio, stopPlayback]);

  const toggleTrack = useCallback((trackLike) => {
    playTrack(trackLike).catch(() => void 0);
  }, [playTrack]);

  const togglePlayPause = useCallback(() => {
    if (!currentTrackRef.current) return;
    if (isPlaying) {
      pausePlayback('pause');
      return;
    }
    playAudio().catch(() => void 0);
  }, [isPlaying, pausePlayback, playAudio]);

  const closePlayer = useCallback(() => {
    stopPlayback('close', true);
  }, [stopPlayback]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      const bounds = getTrackBounds(currentTrackRef.current, audio.duration);
      const effectiveDuration = bounds.end == null ? normalizeNumber(audio.duration, 0) : Math.max(0, bounds.end - bounds.start);
      setDuration(effectiveDuration);
    };

    const handleTimeUpdate = () => {
      const track = currentTrackRef.current;
      if (!track) return;
      const bounds = getTrackBounds(track, audio.duration);
      const effectiveCurrentTime = Math.max(0, audio.currentTime - bounds.start);
      setCurrentTime(effectiveCurrentTime);
      const effectiveDuration = bounds.end == null ? normalizeNumber(audio.duration, 0) : Math.max(0, bounds.end - bounds.start);
      setDuration(effectiveDuration);

      if (bounds.end != null && audio.currentTime >= bounds.end - 0.1) {
        pausePlayback('preview_end');
        try {
          audio.currentTime = bounds.start;
        } catch {
          void 0;
        }
        setCurrentTime(0);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      flushPlaybackEvent('ended');
      const track = currentTrackRef.current;
      const bounds = getTrackBounds(track, audio.duration);
      const effectiveDuration = Math.max(0, (bounds.end ?? audio.duration) - bounds.start);
      setCurrentTime(effectiveDuration);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if (!playbackStartedAtRef.current) {
        startPlaybackSession();
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {
        void 0;
      }
      flushPlaybackEvent('unmount');
      audioRef.current = null;
    };
  }, [flushPlaybackEvent, getTrackBounds, pausePlayback, startPlaybackSession]);

  const value = useMemo(() => ({
    currentTrack,
    currentTrackId: currentTrack?.id || null,
    isPlaying,
    currentTime,
    duration,
    playTrack,
    toggleTrack,
    togglePlayPause,
    seekTo,
    skipBy,
    stopPlayback,
    closePlayer,
    isTrackActive: (trackId) => String(trackId || '') !== '' && String(currentTrackRef.current?.id || '') === String(trackId || '')
  }), [currentTime, currentTrack, duration, isPlaying, playTrack, togglePlayPause, toggleTrack, seekTo, skipBy, stopPlayback, closePlayer]);

  return (
    <GlobalAudioPlayerContext.Provider value={value}>
      <div className={currentTrack ? 'pb-28 md:pb-24' : ''}>
        {children}
      </div>
    </GlobalAudioPlayerContext.Provider>
  );
};

export const useGlobalAudioPlayer = () => {
  const context = useContext(GlobalAudioPlayerContext);
  if (!context) {
    throw new Error('useGlobalAudioPlayer must be used within GlobalAudioPlayerProvider');
  }
  return context;
};

export const GlobalAudioPlayerDock = () => {
  const { closePlayer, currentTime, currentTrack, duration, isPlaying, seekTo, skipBy, togglePlayPause } = useGlobalAudioPlayer();

  if (!currentTrack) return null;

  const safeDuration = Math.max(0, normalizeNumber(duration, 0));
  const safeCurrentTime = Math.min(safeDuration || 0, Math.max(0, normalizeNumber(currentTime, 0)));

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-white/10 bg-[rgba(5,5,8,0.96)] backdrop-blur-xl shadow-[0_-12px_40px_rgba(0,0,0,0.45)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 md:flex-row md:items-center md:gap-5">
        <div className="flex min-w-0 items-center gap-3 md:w-[280px]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {currentTrack.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <Music size={18} className="text-beatwap-gold" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">{currentTrack.title}</div>
            <div className="truncate text-xs text-gray-400">{currentTrack.artist || 'BeatWap'}</div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => skipBy(-10)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-200 transition hover:border-beatwap-gold/40 hover:text-white"
              aria-label="Voltar 10 segundos"
            >
              <SkipBack size={16} />
            </button>
            <button
              type="button"
              onClick={togglePlayPause}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-beatwap-gold text-black transition hover:bg-white"
              aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={() => skipBy(10)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-200 transition hover:border-beatwap-gold/40 hover:text-white"
              aria-label="Avançar 10 segundos"
            >
              <SkipForward size={16} />
            </button>
            <button
              type="button"
              onClick={() => seekTo(0)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-200 transition hover:border-beatwap-gold/40 hover:text-white"
              aria-label="Recomeçar"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-[11px] text-gray-400">{formatTime(safeCurrentTime)}</span>
            <input
              type="range"
              min="0"
              max={safeDuration > 0 ? safeDuration : 0}
              step="0.1"
              value={safeCurrentTime}
              onChange={(event) => seekTo(event.target.value)}
              className="h-1 flex-1 cursor-pointer accent-[#f5c542]"
            />
            <span className="w-10 shrink-0 text-right text-[11px] text-gray-400">{formatTime(safeDuration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end md:w-[72px]">
          <button
            type="button"
            onClick={closePlayer}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition hover:border-red-400/40 hover:text-white"
            aria-label="Fechar player"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
