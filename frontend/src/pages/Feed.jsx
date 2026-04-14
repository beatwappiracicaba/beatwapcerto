import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { Play, Pause, Music, Image, Video, ExternalLink, Search, Plus, X, TrendingUp, Heart, MessageCircle, Send, Pencil, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { apiClient, uploadApi } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { connectRealtime, subscribe, unsubscribe } from '../services/realtime';
import { getCroppedImg } from '../utils/cropImage';

const Feed = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const roleLower = String(profile?.cargo || '').toLowerCase();
  const isProdutor = roleLower === 'produtor';
  const isVendedor = roleLower === 'vendedor';
  const isPrivileged = isProdutor || isVendedor;
  const meId = String(profile?.id || '').trim();
  const [activeTab, setActiveTab] = useState(() => {
    const p = String(location?.pathname || '');
    if (/\/painel(?:\/|$)/.test(p)) return 'painel';
    if (/\/pesquisar(?:\/|$)/.test(p)) return 'search';
    return 'feed';
  }); // feed | painel | search
  const [feedSubTab, setFeedSubTab] = useState('posts'); // posts | musics | mine

  useEffect(() => {
    const p = String(location?.pathname || '');
    const next =
      /\/painel(?:\/|$)/.test(p) ? 'painel'
        : /\/pesquisar(?:\/|$)/.test(p) ? 'search'
          : 'feed';
    setActiveTab((prev) => (prev === next ? prev : next));
  }, [location?.pathname]);
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [followingCount, setFollowingCount] = useState(null);
  const [followingIds, setFollowingIds] = useState([]);
  const [followLoadingById, setFollowLoadingById] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [audioElement, setAudioElement] = useState(null);
  const playStartRef = useRef(null);
  const playMetaRef = useRef({ musicId: null, artistId: null });
  const [videoModalPost, setVideoModalPost] = useState(null);
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [postType, setPostType] = useState('text'); // text | link | image | video
  const [postFormat, setPostFormat] = useState('square'); // square (1080x1080) | vertical (1080x1920)
  const [postCaption, setPostCaption] = useState('');
  const [postLinkUrl, setPostLinkUrl] = useState('');
  const [postFile, setPostFile] = useState(null);
  const [postPreviewUrl, setPostPreviewUrl] = useState('');
  const [postObjectPos, setPostObjectPos] = useState({ x: 50, y: 50 }); // for video display crop
  const [postProgress, setPostProgress] = useState(0);
  const [posting, setPosting] = useState(false);
  const [commentsOpenById, setCommentsOpenById] = useState({});
  const [commentsLoadingById, setCommentsLoadingById] = useState({});
  const [commentsByPostId, setCommentsByPostId] = useState({});
  const [commentDraftByPostId, setCommentDraftByPostId] = useState({});
  const [commentPostingById, setCommentPostingById] = useState({});
  const [postActionLoadingById, setPostActionLoadingById] = useState({});
  const [imageCropSrc, setImageCropSrc] = useState(null);
  const [imageCrop, setImageCrop] = useState({ x: 0, y: 0 });
  const [imageZoom, setImageZoom] = useState(1);
  const [imageCroppedAreaPixels, setImageCroppedAreaPixels] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [panelTotals, setPanelTotals] = useState(null);
  const [panelTopMusics, setPanelTopMusics] = useState([]);
  const [panelMusics, setPanelMusics] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [boostedProfilesLoading, setBoostedProfilesLoading] = useState(false);
  const [boostedProfilesError, setBoostedProfilesError] = useState('');
  const [boostedProfiles, setBoostedProfiles] = useState([]);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [myPostsError, setMyPostsError] = useState('');
  const [myPosts, setMyPosts] = useState([]);
  const [editingPostId, setEditingPostId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const sentinelRef = useRef(null);
  const subscribedRoomsRef = useRef([]);
  const refreshTimerRef = useRef(null);
  const panelLoadingRef = useRef(false);
  const profilesLoadingRef = useRef(false);
  const boostedProfilesLoadingRef = useRef(false);
  const myPostsLoadingRef = useRef(false);

  const sanitizeUrl = useCallback((raw) => {
    const v = String(raw || '').trim();
    if (!v) return '';
    if (v.startsWith('data:')) return v;
    if (/^https?:\/\//i.test(v)) return v;
    return v;
  }, []);

  const featuredWeight = useCallback((lvl) => {
    const x = String(lvl || '').toLowerCase();
    if (x === 'top') return 3;
    if (x === 'pro') return 2;
    if (x === 'basic') return 1;
    return 0;
  }, []);

  const isFeaturedActive = useCallback((row) => {
    const f = row?.access_control?.featured && typeof row.access_control.featured === 'object' ? row.access_control.featured : null;
    if (!f) return false;
    if (f.enabled === false) return false;
    const endsAt = f.ends_at || f.until || f.end_at || null;
    if (!endsAt) return true;
    const t = new Date(endsAt).getTime();
    return Number.isFinite(t) ? t > Date.now() : false;
  }, []);

  const isVisibleOnHome = useCallback((row) => {
    return row?.access_control?.show_on_home !== false;
  }, []);

  const feedAlbums = useMemo(() => {
    const map = new Map();
    (items || []).forEach((it) => {
      if (it?.type !== 'music') return;
      const m = it?.data || {};
      const albumId = String(m?.album_id || '').trim();
      if (!albumId) return;
      const owner = it?.owner || {};
      const ownerName = owner?.nome || owner?.nome_completo_razao_social || 'Artista';
      const createdAt = it?.created_at || m?.created_at || null;
      const createdTs = createdAt ? new Date(String(createdAt)).getTime() : 0;
      const current = map.get(albumId) || {
        id: albumId,
        title: m?.album_title || 'Álbum',
        cover_url: m?.cover_url || null,
        artistName: m?.nome_artista || ownerName,
        latest_ts: createdTs,
        count: 0
      };
      current.count += 1;
      if (!current.cover_url && m?.cover_url) current.cover_url = m.cover_url;
      if (m?.album_title && current.title === 'Álbum') current.title = m.album_title;
      if (m?.nome_artista && current.artistName === ownerName) current.artistName = m.nome_artista;
      if (createdTs > (current.latest_ts || 0)) current.latest_ts = createdTs;
      map.set(albumId, current);
    });
    return Array.from(map.values())
      .sort((a, b) => (b.latest_ts || 0) - (a.latest_ts || 0))
      .slice(0, 10);
  }, [items]);

  const displayName = useCallback((p) => {
    return p?.nome || p?.nome_completo_razao_social || 'Usuário';
  }, []);

  const roleLabel = useCallback((p) => {
    const v = String(p?.cargo || '').trim();
    return v || 'Perfil';
  }, []);

  const timeAgo = useCallback((iso) => {
    const d = new Date(String(iso || ''));
    const t = d.getTime();
    if (!Number.isFinite(t)) return '';
    const diff = Math.max(0, Date.now() - t);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return `há ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `há ${h} h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `há ${days} dias`;
    return d.toLocaleDateString('pt-BR');
  }, []);

  const buildWhatsAppHref = useCallback((rawPhone, title) => {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const text = encodeURIComponent(`Olá, tenho interesse na composição: ${String(title || '').trim() || 'Sem título'}.`);
    return `https://wa.me/${withCountry}?text=${text}`;
  }, []);

  const isFollowing = useCallback((targetId) => {
    const tid = String(targetId || '').trim();
    if (!tid) return false;
    return (followingIds || []).some((x) => String(x || '').trim() === tid);
  }, [followingIds]);

  const toggleFollow = useCallback(async (targetId) => {
    const tid = String(targetId || '').trim();
    if (!tid) return;
    if (!meId) return;
    if (tid === meId) return;
    setFollowLoadingById((prev) => ({ ...prev, [tid]: true }));
    try {
      const action = isFollowing(tid) ? 'unfollow' : 'follow';
      const data = await apiClient.post(`/follow/${tid}`, { action });
      const nowFollowing = data?.following === true;
      setFollowingIds((prev) => {
        const arr = Array.isArray(prev) ? prev.slice() : [];
        const has = arr.some((x) => String(x || '').trim() === tid);
        if (nowFollowing) {
          if (!has) return [tid, ...arr];
          return arr;
        }
        return arr.filter((x) => String(x || '').trim() !== tid);
      });
      setFollowingCount((prev) => {
        const n = Number(prev);
        if (!Number.isFinite(n)) return prev;
        return nowFollowing ? n + 1 : Math.max(0, n - 1);
      });
    } catch {
      void 0;
    } finally {
      setFollowLoadingById((prev) => ({ ...prev, [tid]: false }));
    }
  }, [isFollowing, meId]);

  const recordAnalyticsEvent = useCallback(async (payload) => {
    try {
      await apiClient.post('/analytics', payload);
    } catch {
      void 0;
    }
  }, []);

  const finalizeCurrentMusicPlay = useCallback(async () => {
    const startedAt = playStartRef.current;
    const meta = playMetaRef.current || {};
    if (!startedAt) return;
    const musicId = String(meta?.musicId || '').trim();
    const artistId = String(meta?.artistId || '').trim();
    const duration = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    playStartRef.current = null;
    playMetaRef.current = { musicId: null, artistId: null };
    if (!musicId || duration <= 0) return;
    await recordAnalyticsEvent({
      type: 'music_play',
      music_id: musicId,
      artist_id: artistId || null,
      duration_seconds: duration,
      ip_hash: 'feed'
    });
  }, [recordAnalyticsEvent]);

  const togglePlay = useCallback(async (trackId, url, meta = null) => {
    const src = sanitizeUrl(url);
    if (!src) return;
    if (playingTrack === trackId && audioElement) {
      try {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.src = '';
        audioElement.load();
      } catch (e) {
        void e;
      }
      if (String(trackId || '').startsWith('music:')) {
        await finalizeCurrentMusicPlay();
      } else {
        playStartRef.current = null;
        playMetaRef.current = { musicId: null, artistId: null };
      }
      setPlayingTrack(null);
      setAudioElement(null);
      setIsPaused(false);
      return;
    }
    if (audioElement) {
      try {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.src = '';
        audioElement.load();
      } catch (e) {
        void e;
      }
      await finalizeCurrentMusicPlay();
    }
    const audio = new Audio(src);
    audio.onended = () => {
      const t = String(trackId || '');
      if (t.startsWith('music:')) {
        finalizeCurrentMusicPlay().catch(() => void 0);
      } else {
        playStartRef.current = null;
        playMetaRef.current = { musicId: null, artistId: null };
      }
      setPlayingTrack(null);
      setIsPaused(false);
    };
    audio.play().catch(() => {});
    setAudioElement(audio);
    setPlayingTrack(trackId);
    setIsPaused(false);
    const t = String(trackId || '');
    if (t.startsWith('music:')) {
      const musicId = t.slice('music:'.length).trim();
      const artistId = meta && typeof meta === 'object' ? String(meta.artistId || '').trim() : '';
      playMetaRef.current = { musicId, artistId: artistId || null };
      playStartRef.current = Date.now();
    } else {
      playStartRef.current = null;
      playMetaRef.current = { musicId: null, artistId: null };
    }
  }, [audioElement, finalizeCurrentMusicPlay, isPaused, playingTrack, sanitizeUrl]);

  useEffect(() => {
    return () => {
      try {
        if (audioElement) {
          audioElement.pause();
          audioElement.src = '';
          audioElement.load();
        }
      } catch {
        void 0;
      }
      finalizeCurrentMusicPlay().catch(() => void 0);
    };
  }, [audioElement, finalizeCurrentMusicPlay]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (videoModalPost) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = prev || '';
    }
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [videoModalPost]);

  const loadPage = useCallback(async ({ cursor, replace } = { cursor: null, replace: false }) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', '15');
      if (cursor) qs.set('cursor', cursor);
      const data = await apiClient.get(`/feed?${qs.toString()}`);
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setNextCursor(data?.nextCursor || null);
      setFollowingCount(Number.isFinite(Number(data?.followingCount)) ? Number(data.followingCount) : 0);
      setFollowingIds(Array.isArray(data?.followingIds) ? data.followingIds : []);
      setItems((prev) => (replace ? nextItems : prev.concat(nextItems)));
    } catch {
      if (replace) {
        setItems([]);
        setNextCursor(null);
        setFollowingCount(0);
        setFollowingIds([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const refresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      loadPage({ cursor: null, replace: true });
    }, 250);
  }, [loadPage]);

  useEffect(() => {
    if (activeTab !== 'feed') return;
    refresh();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [activeTab, refresh]);

  useEffect(() => {
    if (activeTab !== 'feed') return;
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      const first = entries && entries[0];
      if (!first?.isIntersecting) return;
      if (loadingMore || loading) return;
      if (!nextCursor) return;
      loadPage({ cursor: nextCursor, replace: false });
    }, { root: null, rootMargin: '1200px 0px', threshold: 0.01 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [activeTab, loadPage, loading, loadingMore, nextCursor]);

  useEffect(() => {
    if (activeTab !== 'feed') return;
    const socket = connectRealtime('https://api.beatwap.com.br');
    const roomIds = Array.from(new Set((followingIds || []).concat(meId ? [meId] : []).filter(Boolean)));
    const rooms = roomIds.map((id) => `profile:${id}`);
    const prevRooms = subscribedRoomsRef.current || [];
    for (const r of prevRooms) {
      if (!rooms.includes(r)) unsubscribe(r);
    }
    for (const r of rooms) {
      if (!prevRooms.includes(r)) subscribe(r);
    }
    subscribedRoomsRef.current = rooms;

    const onAnyUpdate = () => refresh();
    socket.on('posts.created', onAnyUpdate);
    socket.on('posts.deleted', onAnyUpdate);
    socket.on('posts.updated', onAnyUpdate);
    socket.on('compositions.created', onAnyUpdate);
    socket.on('compositions.updated', onAnyUpdate);
    socket.on('musics.created', onAnyUpdate);
    socket.on('musics.updated', onAnyUpdate);
    return () => {
      for (const r of rooms) unsubscribe(r);
      socket.off('posts.created', onAnyUpdate);
      socket.off('posts.deleted', onAnyUpdate);
      socket.off('posts.updated', onAnyUpdate);
      socket.off('compositions.created', onAnyUpdate);
      socket.off('compositions.updated', onAnyUpdate);
      socket.off('musics.created', onAnyUpdate);
      socket.off('musics.updated', onAnyUpdate);
    };
  }, [activeTab, followingIds, meId, refresh]);

  const closePostModal = useCallback(() => {
    setPostModalOpen(false);
    setEditingPostId(null);
    setPostType('text');
    setPostFormat('square');
    setPostCaption('');
    setPostLinkUrl('');
    setPostFile(null);
    setPostPreviewUrl('');
    setPostObjectPos({ x: 50, y: 50 });
    setPostProgress(0);
    setImageCropSrc(null);
    setImageCrop({ x: 0, y: 0 });
    setImageZoom(1);
    setImageCroppedAreaPixels(null);
  }, []);

  useEffect(() => {
    if (!postModalOpen) {
      setPostPreviewUrl('');
      return;
    }
    if (!postFile || (postType !== 'image' && postType !== 'video')) {
      setPostPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(postFile);
    setPostPreviewUrl(url);
    return () => {
      try { URL.revokeObjectURL(url); } catch { void 0; }
    };
  }, [postFile, postModalOpen, postType]);

  const onImageCropComplete = useCallback((_area, croppedPixels) => {
    setImageCroppedAreaPixels(croppedPixels || null);
  }, []);

  const readFileAsDataUrl = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }, []);

  const confirmImageCrop = useCallback(async () => {
    if (!imageCropSrc) return;
    const w = postFormat === 'vertical' ? 1080 : 1080;
    const h = postFormat === 'vertical' ? 1920 : 1080;
    try {
      const blob = await getCroppedImg(imageCropSrc, imageCroppedAreaPixels, w, h);
      const file = new File([blob], `post_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPostFile(file);
      setImageCropSrc(null);
      setImageCrop({ x: 0, y: 0 });
      setImageZoom(1);
      setImageCroppedAreaPixels(null);
    } catch {
      void 0;
    }
  }, [imageCropSrc, imageCroppedAreaPixels, postFormat]);

  const togglePostLike = useCallback(async (postId) => {
    const id = String(postId || '').trim();
    if (!id) return;
    if (!meId) return;
    setPostActionLoadingById((prev) => ({ ...prev, [`like:${id}`]: true }));
    try {
      const res = await apiClient.post(`/feed/posts/${id}/like`, {});
      const liked = res?.liked === true;
      const likes = Number(res?.likes || 0) || 0;
      setItems((prev) => (Array.isArray(prev) ? prev.map((it) => {
        if (it?.type !== 'post') return it;
        if (String(it?.id || it?.data?.id || '') !== id) return it;
        const data = it?.data || {};
        return { ...it, data: { ...data, liked, likes_count: likes } };
      }) : prev));
    } catch {
      void 0;
    } finally {
      setPostActionLoadingById((prev) => ({ ...prev, [`like:${id}`]: false }));
    }
  }, [meId]);

  const loadComments = useCallback(async (postId) => {
    const id = String(postId || '').trim();
    if (!id) return;
    if (commentsLoadingById?.[id]) return;
    setCommentsLoadingById((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await apiClient.get(`/feed/posts/${id}/comments`);
      const list = Array.isArray(res?.comments) ? res.comments : [];
      setCommentsByPostId((prev) => ({ ...prev, [id]: list }));
    } catch {
      setCommentsByPostId((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setCommentsLoadingById((prev) => ({ ...prev, [id]: false }));
    }
  }, [commentsLoadingById]);

  const toggleComments = useCallback(async (postId) => {
    const id = String(postId || '').trim();
    if (!id) return;
    setCommentsOpenById((prev) => {
      const next = { ...(prev || {}) };
      next[id] = !next[id];
      return next;
    });
    const already = Array.isArray(commentsByPostId?.[id]);
    if (!already) await loadComments(id);
  }, [commentsByPostId, loadComments]);

  const sendComment = useCallback(async (postId) => {
    const id = String(postId || '').trim();
    if (!id) return;
    if (!meId) return;
    const text = String(commentDraftByPostId?.[id] || '').trim();
    if (!text) return;
    if (commentPostingById?.[id]) return;
    setCommentPostingById((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await apiClient.post(`/feed/posts/${id}/comments`, { text });
      const comment = res?.comment || null;
      if (comment) {
        setCommentsByPostId((prev) => {
          const current = Array.isArray(prev?.[id]) ? prev[id].slice() : [];
          current.push(comment);
          return { ...prev, [id]: current };
        });
        setItems((prev) => (Array.isArray(prev) ? prev.map((it) => {
          if (it?.type !== 'post') return it;
          if (String(it?.id || it?.data?.id || '') !== id) return it;
          const data = it?.data || {};
          const n = Number(data?.comments_count || 0) || 0;
          return { ...it, data: { ...data, comments_count: n + 1 } };
        }) : prev));
      }
      setCommentDraftByPostId((prev) => ({ ...prev, [id]: '' }));
    } catch {
      void 0;
    } finally {
      setCommentPostingById((prev) => ({ ...prev, [id]: false }));
    }
  }, [commentDraftByPostId, commentPostingById, meId]);

  const createFeedPost = useCallback(async () => {
    if (!meId) return;
    if (posting) return;
    const caption = String(postCaption || '').trim();
    const linkUrl = String(postLinkUrl || '').trim();
    const type = String(postType || 'text').toLowerCase().trim();
    const isEditing = !!editingPostId;

    if (!isEditing) {
      if (type === 'text' && !caption) return;
      if (type === 'link' && !linkUrl) return;
      if ((type === 'image' || type === 'video') && !postFile) return;
    } else {
      if (type === 'text' && !caption) return;
      if (type === 'link' && !linkUrl) return;
    }

    setPosting(true);
    try {
      if (isEditing) {
        const res = await apiClient.patch(`/feed/posts/${editingPostId}`, {
          caption,
          link_url: type === 'link' ? linkUrl : null,
          format: (type === 'image' || type === 'video') ? postFormat : null,
          object_position: type === 'video' ? postObjectPos : null
        });
        const updated = res?.post || null;
        if (updated) {
          setMyPosts((prev) => (Array.isArray(prev) ? prev.map((p) => (String(p?.id || '') === String(updated.id || '') ? { ...p, ...updated } : p)) : prev));
          setItems((prev) => (Array.isArray(prev) ? prev.map((it) => {
            if (it?.type !== 'post') return it;
            const pid = String(it?.id || it?.data?.id || '').trim();
            if (pid !== String(updated.id || '').trim()) return it;
            const data = it?.data || {};
            return { ...it, data: { ...data, ...updated } };
          }) : prev));
        }
        closePostModal();
        return;
      }

      let mediaUrl = null;
      if (type === 'image' || type === 'video') {
        setPostProgress(0);
        const name = String(postFile?.name || '').trim();
        const mime = String(postFile?.type || '').toLowerCase().trim();
        const mimeToExt = () => {
          if (mime.includes('jpeg')) return 'jpg';
          if (mime.includes('png')) return 'png';
          if (mime.includes('webp')) return 'webp';
          if (mime.includes('mp4')) return 'mp4';
          if (mime.includes('quicktime')) return 'mov';
          if (mime.includes('webm')) return 'webm';
          return 'bin';
        };
        const ext = name ? (name.split('.').pop() || mimeToExt()) : mimeToExt();
        const fileName = `feed/${meId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const up = await uploadApi.uploadWithMeta(postFile, {
          bucket: 'feed_media',
          fileName,
          onProgress: (pct) => setPostProgress(Number(pct) || 0)
        });
        mediaUrl = up?.url || null;
        setPostProgress(100);
      }

      const created = await apiClient.post('/feed/posts', {
        media_type: type,
        caption,
        link_url: type === 'link' ? linkUrl : null,
        media_url: mediaUrl,
        format: (type === 'image' || type === 'video') ? postFormat : null,
        object_position: type === 'video' ? postObjectPos : null
      });
      if (feedSubTab === 'mine' && created && created.id) {
        setMyPosts((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          const id = String(created.id || '').trim();
          const next = arr.filter((p) => String(p?.id || '').trim() !== id);
          return [created, ...next];
        });
      }
      closePostModal();
      refresh();
    } catch {
      void 0;
    } finally {
      setPosting(false);
    }
  }, [closePostModal, editingPostId, feedSubTab, meId, postCaption, postFile, postFormat, postLinkUrl, postObjectPos, postType, posting, refresh]);

  const openEditPost = useCallback((p) => {
    const id = String(p?.id || '').trim();
    if (!id) return;
    const type = String(p?.media_type || 'text').toLowerCase().trim() || 'text';
    setEditingPostId(id);
    setPostModalOpen(true);
    setPostType(type);
    setPostFormat(String(p?.format || '').toLowerCase().trim() || (type === 'video' ? 'vertical' : 'square'));
    setPostCaption(String(p?.caption || ''));
    setPostLinkUrl(String(p?.link_url || ''));
    const rawPos = p?.object_position && typeof p.object_position === 'object' ? p.object_position : null;
    setPostObjectPos({ x: Math.max(0, Math.min(100, Number(rawPos?.x ?? 50) || 50)), y: Math.max(0, Math.min(100, Number(rawPos?.y ?? 50) || 50)) });
    setPostProgress(0);
    setPostFile(null);
    setPostPreviewUrl('');
    setImageCropSrc(null);
    setImageCrop({ x: 0, y: 0 });
    setImageZoom(1);
    setImageCroppedAreaPixels(null);
  }, []);

  const deleteMyPost = useCallback(async (postId) => {
    const id = String(postId || '').trim();
    if (!id) return;
    if (!window.confirm('Apagar esta postagem?')) return;
    setPostActionLoadingById((prev) => ({ ...prev, [`delete:${id}`]: true }));
    try {
      await apiClient.del(`/feed/posts/${id}`);
      setMyPosts((prev) => (Array.isArray(prev) ? prev.filter((p) => String(p?.id || '') !== id) : prev));
      setItems((prev) => (Array.isArray(prev) ? prev.filter((it) => {
        if (it?.type !== 'post') return true;
        const pid = String(it?.id || it?.data?.id || '').trim();
        return pid !== id;
      }) : prev));
      if (String(editingPostId || '') === id) closePostModal();
    } catch {
      void 0;
    } finally {
      setPostActionLoadingById((prev) => ({ ...prev, [`delete:${id}`]: false }));
    }
  }, [closePostModal, editingPostId]);

  const loadMyPosts = useCallback(async () => {
    if (!meId) return;
    if (myPostsLoadingRef.current) return;
    myPostsLoadingRef.current = true;
    setMyPostsLoading(true);
    setMyPostsError('');
    try {
      const res = await apiClient.get('/feed/my-posts');
      const list = Array.isArray(res?.items) ? res.items : [];
      setMyPosts(list);
    } catch {
      setMyPosts([]);
      setMyPostsError('Falha ao carregar suas postagens');
    } finally {
      setMyPostsLoading(false);
      myPostsLoadingRef.current = false;
    }
  }, [meId]);

  const loadProfiles = useCallback(async () => {
    if (profilesLoadingRef.current) return;
    profilesLoadingRef.current = true;
    setProfilesLoading(true);
    setProfilesError('');
    try {
      const data = await apiClient.get('/profiles');
      const list = Array.isArray(data) ? data : [];
      const cleaned = list
        .map((p) => ({
          id: String(p?.id || '').trim(),
          cargo: String(p?.cargo || '').trim(),
          nome: p?.nome || p?.nome_completo_razao_social || p?.email || 'Usuário',
          avatar_url: p?.avatar_url || null,
          verified: p?.verified === true || p?.access_control?.verified === true,
          access_control: p?.access_control || null,
          created_at: p?.created_at || null
        }))
        .filter((p) => p.id && p.id !== meId);
      cleaned.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
      setProfiles(cleaned);
    } catch {
      setProfiles([]);
      setProfilesError('Falha ao carregar perfis');
    } finally {
      setProfilesLoading(false);
      profilesLoadingRef.current = false;
    }
  }, [meId]);

  const loadBoostedProfiles = useCallback(async () => {
    if (boostedProfilesLoadingRef.current) return;
    boostedProfilesLoadingRef.current = true;
    setBoostedProfilesLoading(true);
    setBoostedProfilesError('');
    try {
      const data = await apiClient.get('/boosted-profiles', { cache: true, cacheTtlMs: 15000 });
      const list = Array.isArray(data) ? data : [];
      const cleaned = list
        .map((p) => ({
          id: String(p?.id || '').trim(),
          cargo: String(p?.cargo || '').trim(),
          nome: p?.nome || p?.nome_completo_razao_social || p?.email || 'Usuário',
          avatar_url: p?.avatar_url || null,
          verified: p?.verified === true || p?.access_control?.verified === true,
          access_control: p?.access_control || null,
          created_at: p?.created_at || null
        }))
        .filter((p) => p.id && isFeaturedActive(p) && isVisibleOnHome(p));

      cleaned.sort((a, b) => {
        const wa = featuredWeight(a?.access_control?.featured?.level);
        const wb = featuredWeight(b?.access_control?.featured?.level);
        if (wa !== wb) return wb - wa;
        const pa = a?.access_control?.featured?.pinned === true;
        const pb = b?.access_control?.featured?.pinned === true;
        if (pa !== pb) return pb ? 1 : -1;
        const ea = new Date(a?.access_control?.featured?.ends_at || a?.access_control?.featured?.until || 0).getTime();
        const eb = new Date(b?.access_control?.featured?.ends_at || b?.access_control?.featured?.until || 0).getTime();
        if (Number.isFinite(ea) && Number.isFinite(eb) && ea !== eb) return eb - ea;
        return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
      });

      setBoostedProfiles(cleaned.slice(0, 16));
    } catch {
      setBoostedProfiles([]);
      setBoostedProfilesError('Falha ao carregar perfis impulsionados');
    } finally {
      setBoostedProfilesLoading(false);
      boostedProfilesLoadingRef.current = false;
    }
  }, [featuredWeight, isFeaturedActive, isVisibleOnHome, meId]);

  const formatSeconds = useCallback((totalSeconds) => {
    const s = Math.max(0, Number(totalSeconds || 0));
    if (!Number.isFinite(s) || s <= 0) return '0 min';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const restM = m % 60;
    return `${h}h ${String(restM).padStart(2, '0')}m`;
  }, []);

  const loadPanel = useCallback(async () => {
    if (!meId) return;
    if (panelLoadingRef.current) return;
    panelLoadingRef.current = true;
    setPanelLoading(true);
    setPanelError('');
    try {
      if (isPrivileged) {
        const data = await apiClient.get('/admin/dashboard-metrics');
        setPanelTotals(data?.totals || null);
        setPanelTopMusics(Array.isArray(data?.topMusics) ? data.topMusics : []);
      } else {
        const [musicsRaw, eventsRaw] = await Promise.all([
          apiClient.get(`/profiles/${meId}/musics`),
          apiClient.get(`/analytics/artist/${meId}/events`)
        ]);
        const musics = Array.isArray(musicsRaw) ? musicsRaw : [];
        setPanelMusics(musics);
        const events = Array.isArray(eventsRaw) ? eventsRaw : [];

        const playsByMusic = new Map();
        const secondsByMusic = new Map();
        for (const ev of events) {
          if (String(ev?.type || '') !== 'music_play') continue;
          const p = ev?.payload || {};
          const mid = String(p?.music_id || p?.id || '').trim();
          if (!mid) continue;
          playsByMusic.set(mid, (playsByMusic.get(mid) || 0) + 1);
          const d = Number(p?.duration_seconds || 0);
          if (Number.isFinite(d) && d > 0) secondsByMusic.set(mid, (secondsByMusic.get(mid) || 0) + d);
        }

        const enriched = musics.map((m) => {
          const id = String(m?.id || '').trim();
          const likes = Number(m?.likes_count || 0) || 0;
          return {
            id,
            titulo: m?.titulo || m?.title || 'Sem título',
            nome_artista: m?.nome_artista || m?.artist_name || profile?.nome || 'Artista',
            cover_url: m?.cover_url || null,
            plays: playsByMusic.get(id) || 0,
            play_seconds: secondsByMusic.get(id) || 0,
            likes
          };
        });

        const topMusics = enriched
          .slice()
          .sort((a, b) => (b.plays - a.plays) || (b.likes - a.likes))
          .slice(0, 10);

        const totals = {
          musics_total: enriched.length,
          plays_total: Array.from(playsByMusic.values()).reduce((a, b) => a + b, 0),
          play_seconds_total: Array.from(secondsByMusic.values()).reduce((a, b) => a + b, 0),
          music_likes_total: enriched.reduce((a, b) => a + (Number(b.likes) || 0), 0)
        };

        setPanelTotals(totals);
        setPanelTopMusics(topMusics);
      }
    } catch {
      setPanelError('Falha ao carregar painel');
      setPanelTotals(null);
      setPanelTopMusics([]);
    } finally {
      setPanelLoading(false);
      panelLoadingRef.current = false;
    }
  }, [isPrivileged, meId, profile?.nome]);

  useEffect(() => {
    if (activeTab === 'search') loadProfiles();
    if (activeTab === 'painel') loadPanel();
    if (activeTab === 'feed') loadBoostedProfiles();
  }, [activeTab, loadBoostedProfiles, loadPanel, loadProfiles]);

  useEffect(() => {
    if (activeTab !== 'feed') return;
    if (feedSubTab !== 'mine') return;
    loadMyPosts();
  }, [activeTab, feedSubTab, loadMyPosts]);

  const getEmbedUrl = useCallback((url) => {
    if (!url) return null;
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
    } catch {
      return null;
    }
  }, []);

  const content = useMemo(() => {
    if (feedSubTab === 'mine') {
      if (!meId) {
        return (
          <Card className="p-6">
            <div className="text-gray-400">Faça login para ver suas postagens.</div>
          </Card>
        );
      }
      if (myPostsLoading) {
        return (
          <Card className="p-6">
            <div className="text-gray-400">Carregando suas postagens...</div>
          </Card>
        );
      }
      if (myPostsError) {
        return (
          <Card className="p-6">
            <div className="text-red-400">{myPostsError}</div>
          </Card>
        );
      }
      const list = Array.isArray(myPosts) ? myPosts : [];
      if (list.length === 0) {
        return (
          <Card className="p-6">
            <div className="text-gray-400">Você ainda não fez nenhuma postagem.</div>
          </Card>
        );
      }
      return (
        <div className="space-y-4">
          {list.map((p) => {
            const postId = String(p?.id || '').trim();
            const caption = String(p?.caption || '');
            const mediaType = String(p?.media_type || '').toLowerCase();
            const mediaUrl = sanitizeUrl(p?.media_url);
            const linkUrl = String(p?.link_url || '').trim();
            const embed = linkUrl ? getEmbedUrl(linkUrl) : null;
            const format = String(p?.format || '').toLowerCase().trim() || (mediaType === 'video' ? 'vertical' : 'square');
            const aspectClass = format === 'vertical' ? 'aspect-[9/16]' : 'aspect-square';
            const delLoading = postActionLoadingById?.[`delete:${postId}`] === true;
            return (
              <Card key={`mine-${postId}`} className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">Minhas postagens</div>
                    <div className="text-xs text-gray-400 truncate">{timeAgo(p?.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditPost(p)}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                      title="Editar"
                    >
                      <Pencil size={16} className="text-gray-200" />
                    </button>
                    <button
                      type="button"
                      disabled={delLoading}
                      onClick={() => deleteMyPost(postId)}
                      className={`p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 ${delLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      title="Apagar"
                    >
                      <Trash2 size={16} className="text-red-300" />
                    </button>
                  </div>
                </div>
                {mediaType === 'text' && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    {caption && <div className="text-sm text-white whitespace-pre-line break-words" style={{ overflowWrap: 'anywhere' }}>{caption}</div>}
                    {linkUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(linkUrl, '_blank')}
                        className="inline-flex items-center gap-2 text-xs text-gray-300 hover:text-beatwap-gold underline"
                      >
                        <ExternalLink size={14} />
                        <span>Abrir link</span>
                      </button>
                    )}
                  </div>
                )}
                {mediaType !== 'text' && (
                  <div className="space-y-3">
                    {(caption || linkUrl) && (
                      <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                        {caption && <div className="text-sm text-white whitespace-pre-line break-words" style={{ overflowWrap: 'anywhere' }}>{caption}</div>}
                        {linkUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(linkUrl, '_blank')}
                            className="inline-flex items-center gap-2 text-xs text-gray-300 hover:text-beatwap-gold underline"
                          >
                            <ExternalLink size={14} />
                            <span>Abrir link</span>
                          </button>
                        )}
                      </div>
                    )}
                    {embed ? (
                      <div className={`w-full ${aspectClass} rounded-xl overflow-hidden border border-white/10 bg-black`}>
                        <iframe
                          width="100%"
                          height="100%"
                          src={embed}
                          title="Link"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    ) : mediaType === 'image' ? (
                      <button
                        type="button"
                        onClick={() => setVideoModalPost({ ...p, media_url: mediaUrl, link_url: linkUrl })}
                        className={`w-full ${aspectClass} rounded-xl overflow-hidden border border-white/10 bg-black/30`}
                      >
                        {mediaUrl ? (
                          <img src={mediaUrl} alt={caption || 'Imagem'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <Image size={28} />
                          </div>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setVideoModalPost({ ...p, media_url: mediaUrl, link_url: linkUrl })}
                        className={`w-full ${aspectClass} rounded-xl overflow-hidden border border-white/10 bg-black/30`}
                      >
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Video size={28} />
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      );
    }

    const feedItems = (Array.isArray(items) ? items : []).filter((it) => (
      feedSubTab === 'musics'
        ? it?.type === 'music'
        : it?.type !== 'music'
    ));

    if (loading && items.length === 0) {
      return (
        <Card className="p-6">
          <div className="text-gray-400">Carregando...</div>
        </Card>
      );
    }

    if ((followingCount === 0 || followingCount === null) && !loading) {
      return (
        <Card className="p-6">
          <div className="text-gray-300 font-bold">Você ainda não segue ninguém. Comece a seguir para ver novidades.</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <AnimatedButton onClick={() => { setActiveTab('search'); navigate('/dashboard/pesquisar'); }}>Pesquisar perfis</AnimatedButton>
          </div>
        </Card>
      );
    }

    if (!loading && feedItems.length === 0) {
      return (
        <Card className="p-6">
          <div className="text-gray-400">
            {feedSubTab === 'musics' ? 'Nenhum lançamento de música ainda.' : 'Nenhuma novidade ainda.'}
          </div>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {feedSubTab === 'musics' && feedAlbums.length > 0 && (
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-2 text-white font-bold">
              <Music size={18} />
              <span>Álbuns</span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {feedAlbums.slice(0, 8).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => navigate(`/album/${a.id}`)}
                  className="text-left bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-colors"
                >
                  <div className="aspect-square bg-black/30">
                    {a.cover_url ? (
                      <img src={sanitizeUrl(a.cover_url)} alt={a.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <Music size={28} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-bold text-white truncate">{a.title}</div>
                    <div className="text-xs text-gray-400 truncate">{a.artistName}</div>
                    <div className="text-xs text-gray-400">{a.count} faixas</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}
        {feedItems.map((it) => {
          const owner = it?.owner || {};
          const ownerName = displayName(owner);
          const ownerRole = roleLabel(owner);
          const at = timeAgo(it?.created_at);
          const ownerHref = owner?.id ? `/profile/${owner.id}` : null;
          const ownerId = String(owner?.id || '').trim();
          const canFollow = !!meId && !!ownerId && ownerId !== meId;
          const following = canFollow ? isFollowing(ownerId) : false;
          const followLoading = canFollow ? followLoadingById?.[ownerId] === true : false;

          return (
            <Card key={`${it.type}-${it.id}-${owner?.id || 'x'}`} className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => { if (ownerHref) navigate(ownerHref); }}
                  className="min-w-0 text-left"
                >
                  <div className="font-bold text-white truncate">{ownerName}</div>
                  <div className="text-xs text-gray-400 truncate">{ownerRole}</div>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-xs text-gray-400">{at}</div>
                  {canFollow && (
                    <button
                      type="button"
                      disabled={followLoading}
                      onClick={() => toggleFollow(ownerId)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        following
                          ? 'bg-white/10 border-white/10 text-gray-200 hover:bg-white/15'
                          : 'bg-beatwap-gold text-black border-beatwap-gold hover:bg-white hover:border-white'
                      } ${followLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {followLoading ? '...' : (following ? 'Seguindo' : 'Seguir')}
                    </button>
                  )}
                </div>
              </div>

              {it.type === 'composition' && (() => {
                const c = it.data || {};
                const title = c.title || c.titulo || 'Sem título';
                const href = c.composer_phone ? buildWhatsAppHref(c.composer_phone, title) : null;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
                    <div
                      className="group relative cursor-pointer"
                      onClick={() => togglePlay(`composition:${it.id}`, c.audio_url)}
                    >
                      <div className="aspect-square rounded-2xl overflow-hidden relative shadow-lg bg-gray-800">
                        {c.cover_url ? (
                          <img
                            src={sanitizeUrl(c.cover_url)}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <Music size={40} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black transform scale-100 sm:scale-0 sm:group-hover:scale-100 transition-transform duration-300 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlay(`composition:${it.id}`, c.audio_url);
                            }}
                          >
                            {playingTrack === `composition:${it.id}` && !isPaused
                              ? <Pause fill="currentColor" className="ml-1" />
                              : <Play fill="currentColor" className="ml-1" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold text-xl text-white">{title}</div>
                      <div className="text-sm text-gray-400">{c.composer_name || 'Autor'}</div>
                      {c.genre && <div className="text-xs text-beatwap-gold uppercase font-bold tracking-wider">{c.genre}</div>}
                      {Number.isFinite(Number(c.price)) && <div className="text-sm text-beatwap-gold font-bold">R$ {c.price}</div>}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <AnimatedButton onClick={() => togglePlay(`composition:${it.id}`, c.audio_url)}>
                          <span>{playingTrack === `composition:${it.id}` && !isPaused ? 'Pausar' : 'Reproduzir'}</span>
                        </AnimatedButton>
                        {href && (
                          <AnimatedButton onClick={() => window.open(href, '_blank')}>
                            <span>WhatsApp</span>
                          </AnimatedButton>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {it.type === 'music' && (() => {
                const m = it.data || {};
                const title = m.titulo || m.title || 'Lançamento';
                const cover = m.cover_url ? sanitizeUrl(m.cover_url) : '';
                const artistName = m.nome_artista || m.artist_name || ownerName;
                const url = m.preview_url || m.audio_url;
                const artistId = String(m.artista_id || m.artist_id || ownerId || '').trim() || null;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
                    <div
                      className="group relative cursor-pointer"
                      onClick={() => {
                        if (m.album_id) {
                          navigate(`/album/${m.album_id}`);
                        } else {
                          togglePlay(`music:${it.id}`, url, { artistId });
                        }
                      }}
                    >
                      <div className="aspect-square rounded-2xl overflow-hidden relative shadow-lg bg-gray-800">
                        {cover ? (
                          <img
                            src={cover}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <Music size={40} />
                          </div>
                        )}
                        {!m.album_id && (
                          <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black transform scale-100 sm:scale-0 sm:group-hover:scale-100 transition-transform duration-300 hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlay(`music:${it.id}`, url, { artistId });
                              }}
                            >
                              {playingTrack === `music:${it.id}` && !isPaused
                                ? <Pause fill="currentColor" className="ml-1" />
                                : <Play fill="currentColor" className="ml-1" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold text-xl text-white">{title}</div>
                      <div className="text-sm text-gray-400">{artistName || 'Artista'}</div>
                      {m.estilo && <div className="text-xs text-beatwap-gold uppercase font-bold tracking-wider">{m.estilo}</div>}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {m.album_id ? (
                          <AnimatedButton onClick={() => navigate(`/album/${m.album_id}`)}>
                            <span>Ver Álbum</span>
                          </AnimatedButton>
                        ) : (
                          <AnimatedButton onClick={() => togglePlay(`music:${it.id}`, url, { artistId })}>
                            <span>{playingTrack === `music:${it.id}` && !isPaused ? 'Pausar' : 'Reproduzir'}</span>
                          </AnimatedButton>
                        )}
                        {m.presave_link && (
                          <AnimatedButton onClick={() => window.open(m.presave_link, '_blank')}>
                            <span>Smartlink</span>
                          </AnimatedButton>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {it.type === 'post' && (() => {
                const p = it.data || {};
                const postId = String(it?.id || p?.id || '').trim();
                const caption = p.caption || '';
                const mediaType = String(p.media_type || '').toLowerCase();
                const mediaUrl = sanitizeUrl(p.media_url);
                const linkUrl = String(p.link_url || '').trim();
                const embed = linkUrl ? getEmbedUrl(linkUrl) : null;
                const open = () => setVideoModalPost({ ...p, media_url: mediaUrl, link_url: linkUrl });
                const likesCount = Number(p.likes_count || 0) || 0;
                const commentsCount = Number(p.comments_count || 0) || 0;
                const liked = p.liked === true;
                const commentsOpen = commentsOpenById?.[postId] === true;
                const comments = Array.isArray(commentsByPostId?.[postId]) ? commentsByPostId[postId] : null;
                const commentsLoading = commentsLoadingById?.[postId] === true;
                const draft = String(commentDraftByPostId?.[postId] || '');
                const sending = commentPostingById?.[postId] === true;
                const likeLoading = postActionLoadingById?.[`like:${postId}`] === true;
                const format = String(p.format || '').toLowerCase().trim() || (mediaType === 'video' ? 'vertical' : 'square');
                const aspectClass = format === 'vertical' ? 'aspect-[9/16]' : 'aspect-square';
                const rawPos = p.object_position && typeof p.object_position === 'object' ? p.object_position : null;
                const ox = Math.max(0, Math.min(100, Number(rawPos?.x ?? 50) || 50));
                const oy = Math.max(0, Math.min(100, Number(rawPos?.y ?? 50) || 50));
                if (mediaType === 'text') {
                  return (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                      {caption && <div className="text-sm text-white whitespace-pre-line break-words" style={{ overflowWrap: 'anywhere' }}>{caption}</div>}
                      {linkUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(linkUrl, '_blank')}
                          className="inline-flex items-center gap-2 text-xs text-gray-300 hover:text-beatwap-gold underline"
                        >
                          <ExternalLink size={14} />
                          <span>Abrir link</span>
                        </button>
                      )}

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          disabled={likeLoading}
                          onClick={() => togglePostLike(postId)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                            liked ? 'bg-white/10 border-white/10 text-white' : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5'
                          } ${likeLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <Heart size={14} className={liked ? 'text-beatwap-gold' : 'text-gray-300'} fill={liked ? 'currentColor' : 'none'} />
                          <span>{likesCount}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleComments(postId)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border bg-black/20 border-white/5 text-gray-300 hover:bg-white/5 transition"
                        >
                          <MessageCircle size={14} />
                          <span>{commentsCount}</span>
                        </button>
                      </div>

                      {commentsOpen && (
                        <div className="pt-2 space-y-3">
                          {commentsLoading && <div className="text-xs text-gray-400">Carregando comentários...</div>}
                          {!commentsLoading && comments && comments.length === 0 && (
                            <div className="text-xs text-gray-400">Nenhum comentário ainda.</div>
                          )}
                          {!commentsLoading && comments && comments.length > 0 && (
                            <div className="space-y-2">
                              {comments.slice(-6).map((c) => (
                                <div key={c.id} className="text-xs text-gray-200">
                                  <span className="text-gray-400 font-bold">{displayName(c.owner)}:</span>{' '}
                                  <span className="text-gray-200">{String(c.text || '')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <input
                              value={draft}
                              onChange={(e) => setCommentDraftByPostId((prev) => ({ ...prev, [postId]: e.target.value }))}
                              placeholder="Escreva um comentário..."
                              className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder:text-gray-500 outline-none focus:border-white/20"
                            />
                            <button
                              type="button"
                              disabled={sending || !String(draft || '').trim()}
                              onClick={() => sendComment(postId)}
                              className={`px-3 py-2 rounded-xl border transition ${
                                sending || !String(draft || '').trim()
                                  ? 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                                  : 'bg-beatwap-gold border-beatwap-gold text-black hover:bg-white hover:border-white'
                              }`}
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div className="group relative overflow-hidden bg-black/40 border border-white/10 rounded-xl">
                    <div className={`relative w-full ${aspectClass} bg-black cursor-pointer`} onClick={open}>
                      {embed ? (
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src={embed}
                          title="Link"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : mediaType === 'video' ? (
                        <video
                          src={mediaUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{ objectPosition: `${ox}% ${oy}%` }}
                        />
                      ) : (
                        <img
                          src={mediaUrl || 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22675%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231a1a1a%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffd700%22 font-size=%2232%22 font-family=%22Arial%22>Prévia indisponível</text></svg>'}
                          alt={caption || 'Post'}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="absolute top-3 left-3 p-2 rounded-xl bg-black/60 border border-white/10 flex items-center gap-2">
                        {mediaType === 'video' ? <Video className="text-white" size={18} /> : <Image className="text-white" size={18} />}
                        <span className="text-xs text-white font-bold">Post</span>
                      </div>
                    </div>
                    {(caption || linkUrl) && (
                      <div className="p-4 space-y-3">
                        {caption && <div className="text-sm text-white whitespace-pre-line break-words" style={{ overflowWrap: 'anywhere' }}>{caption}</div>}
                        {linkUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(linkUrl, '_blank')}
                            className="inline-flex items-center gap-2 text-xs text-gray-300 hover:text-beatwap-gold underline"
                          >
                            <ExternalLink size={14} />
                            <span>Abrir link</span>
                          </button>
                        )}
                      </div>
                    )}
                    <div className="px-4 pb-4 pt-1 flex items-center gap-3">
                      <button
                        type="button"
                        disabled={likeLoading}
                        onClick={() => togglePostLike(postId)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                          liked ? 'bg-white/10 border-white/10 text-white' : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5'
                        } ${likeLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <Heart size={14} className={liked ? 'text-beatwap-gold' : 'text-gray-300'} fill={liked ? 'currentColor' : 'none'} />
                        <span>{likesCount}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleComments(postId)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border bg-black/20 border-white/5 text-gray-300 hover:bg-white/5 transition"
                      >
                        <MessageCircle size={14} />
                        <span>{commentsCount}</span>
                      </button>
                    </div>
                    {commentsOpen && (
                      <div className="px-4 pb-4 space-y-3">
                        {commentsLoading && <div className="text-xs text-gray-400">Carregando comentários...</div>}
                        {!commentsLoading && comments && comments.length === 0 && (
                          <div className="text-xs text-gray-400">Nenhum comentário ainda.</div>
                        )}
                        {!commentsLoading && comments && comments.length > 0 && (
                          <div className="space-y-2">
                            {comments.slice(-6).map((c) => (
                              <div key={c.id} className="text-xs text-gray-200">
                                <span className="text-gray-400 font-bold">{displayName(c.owner)}:</span>{' '}
                                <span className="text-gray-200 break-words" style={{ overflowWrap: 'anywhere' }}>{String(c.text || '')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            value={draft}
                            onChange={(e) => setCommentDraftByPostId((prev) => ({ ...prev, [postId]: e.target.value }))}
                            placeholder="Escreva um comentário..."
                            className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder:text-gray-500 outline-none focus:border-white/20"
                          />
                          <button
                            type="button"
                            disabled={sending || !String(draft || '').trim()}
                            onClick={() => sendComment(postId)}
                            className={`px-3 py-2 rounded-xl border transition ${
                              sending || !String(draft || '').trim()
                                ? 'bg-white/5 border-white/10 text-gray-500 cursor-not-allowed'
                                : 'bg-beatwap-gold border-beatwap-gold text-black hover:bg-white hover:border-white'
                            }`}
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card>
          );
        })}
        <div ref={sentinelRef} />
        {loadingMore && (
          <Card className="p-4">
            <div className="text-gray-400 text-sm">Carregando mais...</div>
          </Card>
        )}
      </div>
    );
  }, [buildWhatsAppHref, commentDraftByPostId, commentPostingById, commentsByPostId, commentsLoadingById, commentsOpenById, deleteMyPost, displayName, feedAlbums, feedSubTab, followLoadingById, followingCount, getEmbedUrl, isFollowing, isPaused, items, loading, loadingMore, meId, myPosts, myPostsError, myPostsLoading, navigate, openEditPost, playingTrack, postActionLoadingById, roleLabel, sanitizeUrl, sendComment, timeAgo, toggleComments, toggleFollow, togglePlay, togglePostLike]);

  const Layout = isProdutor ? AdminLayout : DashboardLayout;

  const filteredProfiles = useMemo(() => {
    const term = String(searchQuery || '').trim().toLowerCase();
    const list = Array.isArray(profiles) ? profiles : [];
    if (!term) return list.slice(0, 60);
    return list
      .filter((p) => {
        const n = String(p?.nome || '').toLowerCase();
        const c = String(p?.cargo || '').toLowerCase();
        return n.includes(term) || c.includes(term) || String(p?.id || '').includes(term);
      })
      .slice(0, 60);
  }, [profiles, searchQuery]);

  const boostedStories = useMemo(() => {
    if (activeTab !== 'feed') return null;
    if (boostedProfilesLoading) {
      return (
        <Card className="p-4">
          <div className="text-sm text-gray-400">Carregando impulsionados...</div>
        </Card>
      );
    }
    if (boostedProfilesError) {
      return (
        <Card className="p-4">
          <div className="text-sm text-red-400">{boostedProfilesError}</div>
        </Card>
      );
    }
    if (!boostedProfiles || boostedProfiles.length === 0) return null;
    return (
      <Card className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-sm font-bold text-white">Impulsionados</div>
          <div className="text-xs text-gray-400">Perfis em destaque</div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 bw-stories-scroll">
          {boostedProfiles.map((p) => {
            const name = String(p?.nome || 'Usuário');
            const initial = name.trim() ? name.trim()[0].toUpperCase() : 'U';
            return (
              <div key={p.id} className="shrink-0 w-[78px] text-center">
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${p.id}`)}
                  className="block mx-auto w-[64px] h-[64px] rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  aria-label={`Ver perfil de ${name}`}
                >
                  <div className="bw-story-ring">
                    <div className="bw-story-avatar">
                      {p.avatar_url ? (
                        <img
                          src={sanitizeUrl(p.avatar_url)}
                          alt={name}
                          className="w-full h-full object-cover"
                          draggable="false"
                          style={{ userSelect: 'none' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5 text-white font-bold">
                          {initial}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                <div className="mt-1 text-[11px] text-gray-200 truncate">{name}</div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }, [activeTab, boostedProfiles, boostedProfilesError, boostedProfilesLoading, navigate, sanitizeUrl]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl font-bold text-white truncate">BeatWap</div>
            <div className="text-sm text-gray-400 truncate">
              {activeTab === 'feed' && 'Novidades de quem você segue'}
              {activeTab === 'painel' && 'Desempenho e métricas'}
              {activeTab === 'search' && 'Pesquisar perfis'}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { setActiveTab('feed'); navigate('/dashboard/feed'); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  activeTab === 'feed' ? 'bg-white/10 border-white/10 text-white' : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5'
                }`}
              >
                Feed
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('search'); navigate('/dashboard/pesquisar'); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition inline-flex items-center gap-2 ${
                  activeTab === 'search' ? 'bg-white/10 border-white/10 text-white' : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5'
                }`}
              >
                <Search size={14} />
                Pesquisar
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto sm:justify-end">
            {activeTab === 'feed' && (
              <>
                <AnimatedButton
                  onClick={() => { setActiveTab('search'); navigate('/dashboard/pesquisar'); }}
                  className="w-full sm:w-auto px-4 py-2 text-xs"
                >
                  <span className="inline-flex items-center gap-2">
                    <Search size={16} />
                    <span className="hidden sm:inline">Pesquisar</span>
                    <span className="sm:hidden">Buscar</span>
                  </span>
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => setPostModalOpen(true)}
                  disabled={!meId}
                  className="w-full sm:w-auto px-4 py-2 text-xs"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus size={16} />
                    <span>Postar</span>
                  </span>
                </AnimatedButton>
              </>
            )}
            <AnimatedButton
              onClick={activeTab === 'painel' ? loadPanel : refresh}
              className="w-full sm:w-auto px-4 py-2 text-xs"
            >
              Atualizar
            </AnimatedButton>
          </div>
        </div>

        {activeTab === 'feed' && (
          <>
            {boostedStories}
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFeedSubTab('posts')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    feedSubTab === 'posts' ? 'bg-white/10 border-white/15 text-white' : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5'
                  }`}
                >
                  Feed
                </button>
                <button
                  type="button"
                  onClick={() => setFeedSubTab('musics')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    feedSubTab === 'musics' ? 'bg-white/10 border-white/15 text-white' : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5'
                  }`}
                >
                  Músicas lançadas
                </button>
                <button
                  type="button"
                  onClick={() => setFeedSubTab('mine')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    feedSubTab === 'mine' ? 'bg-white/10 border-white/15 text-white' : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5'
                  }`}
                >
                  Minhas postagens
                </button>
              </div>
            </Card>
            {content}
          </>
        )}

        {activeTab === 'painel' && (
          <div className="space-y-4">
            {panelLoading && (
              <Card className="p-6">
                <div className="text-gray-400">Carregando painel...</div>
              </Card>
            )}
            {!panelLoading && panelError && (
              <Card className="p-6">
                <div className="text-red-400">{panelError}</div>
              </Card>
            )}
            {!panelLoading && !panelError && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="text-xs text-gray-400">Músicas</div>
                    <div className="text-2xl font-bold text-white">{panelTotals?.musics_total ?? 0}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-xs text-gray-400">Reproduções</div>
                    <div className="text-2xl font-bold text-white">{panelTotals?.plays_total ?? 0}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-xs text-gray-400">Curtidas</div>
                    <div className="text-2xl font-bold text-white">{panelTotals?.music_likes_total ?? 0}</div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-xs text-gray-400">Tempo tocado</div>
                    <div className="text-2xl font-bold text-white">{formatSeconds(panelTotals?.play_seconds_total ?? 0)}</div>
                  </Card>
                </div>

                <Card className="p-4">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <TrendingUp size={18} />
                    <span>Músicas mais tocadas</span>
                    <span className="ml-auto">
                      <AnimatedButton onClick={() => navigate('/composicoes')}>Ver todas</AnimatedButton>
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(panelTopMusics || []).slice(0, 6).map((m) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/30 border border-white/10 flex items-center justify-center">
                          {m.cover_url ? (
                            <img src={sanitizeUrl(m.cover_url)} alt={m.titulo || 'Música'} className="w-full h-full object-cover" />
                          ) : (
                            <Music size={18} className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-white truncate">{m.titulo || 'Sem título'}</div>
                          <div className="text-xs text-gray-400 truncate">{m.nome_artista || 'Artista'}</div>
                          <div className="text-xs text-gray-400">
                            {Number(m.plays || 0)} plays · {Number(m.likes || 0)} curtidas
                          </div>
                        </div>
                      </div>
                    ))}
                    {(panelTopMusics || []).length === 0 && (
                      <div className="text-sm text-gray-400">Sem dados ainda.</div>
                    )}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-white font-bold">Álbuns</div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Array.from(
                      (panelMusics || []).reduce((map, m) => {
                        const aid = String(m?.album_id || '').trim();
                        if (!aid) return map;
                        if (!map.has(aid)) {
                          map.set(aid, {
                            id: aid,
                            title: m?.album_title || 'Álbum',
                            cover_url: m?.cover_url || null,
                            count: 1
                          });
                        } else {
                          const cur = map.get(aid);
                          cur.count += 1;
                          if (!cur.cover_url && m?.cover_url) cur.cover_url = m.cover_url;
                          map.set(aid, cur);
                        }
                        return map;
                      }, new Map()).values()
                    ).slice(0, 6).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => navigate(`/album/${a.id}`)}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-left"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/30 border border-white/10 flex items-center justify-center">
                          {a.cover_url ? (
                            <img src={sanitizeUrl(a.cover_url)} alt={a.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music size={16} className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{a.title}</div>
                          <div className="text-xs text-gray-400 truncate">{a.count} faixas</div>
                        </div>
                      </button>
                    ))}
                    {(panelMusics || []).filter(m => m?.album_id).length === 0 && (
                      <div className="text-sm text-gray-400">Nenhum álbum ainda.</div>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-4">
            <Card className="p-4">
              <AnimatedInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou cargo (Artista, Produtor, Compositor, Vendedor)"
              />
              {profilesError && <div className="mt-2 text-xs text-red-400">{profilesError}</div>}
            </Card>

            <Card className="p-4">
              <div className="text-white font-bold">Perfis</div>
              <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
                {filteredProfiles.slice(0, 20).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => navigate(`/profile/${p.id}`)}
                    className="w-20 shrink-0 text-center"
                  >
                    <div className="w-16 h-16 mx-auto rounded-full overflow-hidden border-2 border-beatwap-gold/60 bg-black/30 flex items-center justify-center">
                      {p.avatar_url ? (
                        <img src={sanitizeUrl(p.avatar_url)} alt={p.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">{String(p.nome || 'U').slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-200 truncate">{p.nome}</div>
                  </button>
                ))}
                {profilesLoading && (
                  <div className="text-sm text-gray-400">Carregando...</div>
                )}
                {!profilesLoading && filteredProfiles.length === 0 && (
                  <div className="text-sm text-gray-400">Nenhum perfil encontrado.</div>
                )}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProfiles.map((p) => {
                const canFollow = !!meId && p.id !== meId;
                const following = canFollow ? isFollowing(p.id) : false;
                const followLoading = canFollow ? followLoadingById?.[p.id] === true : false;
                return (
                  <Card key={`card-${p.id}`} className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${p.id}`)}
                        className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-black/30 flex items-center justify-center shrink-0"
                      >
                        {p.avatar_url ? (
                          <img src={sanitizeUrl(p.avatar_url)} alt={p.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold">{String(p.nome || 'U').slice(0, 1).toUpperCase()}</span>
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-bold truncate">{p.nome}</div>
                        <div className="text-xs text-gray-400 truncate">{p.cargo}{p.verified ? ' · Verificado' : ''}</div>
                      </div>
                      {canFollow && (
                        <button
                          type="button"
                          disabled={followLoading}
                          onClick={() => toggleFollow(p.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                            following
                              ? 'bg-white/10 border-white/10 text-gray-200 hover:bg-white/15'
                              : 'bg-beatwap-gold text-black border-beatwap-gold hover:bg-white hover:border-white'
                          } ${followLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {followLoading ? '...' : (following ? 'Seguindo' : 'Seguir')}
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {videoModalPost && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/95" onClick={() => setVideoModalPost(null)} />
          <div className="relative w-screen h-screen flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setVideoModalPost(null); }}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
            >
              <span className="text-gray-300 text-sm font-bold">Fechar</span>
            </button>
            {getEmbedUrl(videoModalPost.link_url || videoModalPost.media_url) ? (
              <div className="relative w-[90vw] max-w-[90vw] max-h-[85vh] aspect-video border border-white/10 rounded-xl overflow-hidden bg-black">
                <iframe
                  width="100%"
                  height="100%"
                  src={getEmbedUrl(videoModalPost.link_url || videoModalPost.media_url)}
                  title="Link"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : String(videoModalPost.media_type || '').toLowerCase() === 'image' ? (
              <img
                src={sanitizeUrl(videoModalPost.media_url)}
                alt={videoModalPost.caption || 'Imagem'}
                className="max-w-[92vw] max-h-[85vh] object-contain rounded-xl border border-white/10"
              />
            ) : (
              <video
                src={sanitizeUrl(videoModalPost.media_url)}
                className="max-w-[92vw] max-h-[85vh] rounded-xl border border-white/10"
                controls
                autoPlay
              />
            )}
          </div>
        </div>
      )}

      {postModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closePostModal}>
          <div className="w-full max-w-xl bg-[#121212] border border-white/10 rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="text-white font-bold">{editingPostId ? 'Editar post' : 'Novo post'}</div>
              <button type="button" onClick={closePostModal} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
                <X size={18} className="text-gray-300" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'text', label: 'Texto' },
                  { key: 'link', label: 'Link' },
                  { key: 'image', label: 'Foto' },
                  { key: 'video', label: 'Vídeo' }
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={!!editingPostId}
                    onClick={() => {
                      if (editingPostId) return;
                      setPostType(opt.key);
                      setPostProgress(0);
                      setPostFile(null);
                      setPostPreviewUrl('');
                      setPostLinkUrl('');
                      setPostObjectPos({ x: 50, y: 50 });
                      setImageCropSrc(null);
                      setImageCrop({ x: 0, y: 0 });
                      setImageZoom(1);
                      setImageCroppedAreaPixels(null);
                      if (opt.key === 'video') setPostFormat('vertical');
                      else if (opt.key === 'image') setPostFormat('square');
                      else setPostFormat('square');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                      postType === opt.key ? 'bg-white/10 border-white/10 text-white' : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5'
                    } ${editingPostId ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <textarea
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                placeholder="Escreva algo..."
                rows={3}
                className="w-full rounded-xl bg-white/5 border border-white/10 text-white px-4 py-3 outline-none focus:border-beatwap-gold resize-none"
              />

              {postType === 'link' && (
                <AnimatedInput
                  value={postLinkUrl}
                  onChange={(e) => setPostLinkUrl(e.target.value)}
                  placeholder="Cole um link (YouTube ou qualquer URL)"
                />
              )}

              {(postType === 'image' || postType === 'video') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPostFormat('square')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        postFormat === 'square' ? 'bg-white/10 border-white/10 text-white' : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      1080x1080
                    </button>
                    <button
                      type="button"
                      onClick={() => setPostFormat('vertical')}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        postFormat === 'vertical' ? 'bg-white/10 border-white/10 text-white' : 'bg-black/20 border-white/5 text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      1080x1920
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-xs text-gray-300 truncate">{postFile ? postFile.name : 'Nenhum arquivo selecionado'}</div>
                    <div className="flex items-center gap-2">
                      {postFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setPostFile(null);
                            setPostPreviewUrl('');
                            setImageCropSrc(null);
                            setImageCrop({ x: 0, y: 0 });
                            setImageZoom(1);
                            setImageCroppedAreaPixels(null);
                            setPostObjectPos({ x: 50, y: 50 });
                          }}
                          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                          title="Remover arquivo"
                        >
                          <X size={16} className="text-gray-300" />
                        </button>
                      )}
                      <label className={`px-3 py-2 rounded-xl text-xs font-bold bg-white/10 border border-white/10 hover:bg-white/15 cursor-pointer ${editingPostId ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        Escolher
                        <input
                          type="file"
                          accept={postType === 'image' ? 'image/*' : 'video/*'}
                          className="hidden"
                          disabled={!!editingPostId}
                          onChange={async (e) => {
                            if (editingPostId) return;
                            const f = e.target.files?.[0] || null;
                            setPostFile(f);
                            setPostObjectPos({ x: 50, y: 50 });
                            setImageCropSrc(null);
                            setImageCrop({ x: 0, y: 0 });
                            setImageZoom(1);
                            setImageCroppedAreaPixels(null);
                            if (postType === 'image' && f) {
                              try {
                                const dataUrl = await readFileAsDataUrl(f);
                                setImageCropSrc(String(dataUrl || ''));
                              } catch {
                                void 0;
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {postType === 'image' && imageCropSrc && (
                    <div className="space-y-3">
                      <div className={`relative w-full ${postFormat === 'vertical' ? 'aspect-[9/16]' : 'aspect-square'} rounded-xl overflow-hidden border border-white/10 bg-black/30`}>
                        <Cropper
                          image={imageCropSrc}
                          crop={imageCrop}
                          zoom={imageZoom}
                          aspect={postFormat === 'vertical' ? 9 / 16 : 1}
                          onCropChange={setImageCrop}
                          onZoomChange={setImageZoom}
                          onCropComplete={onImageCropComplete}
                        />
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={imageZoom}
                        onChange={(e) => setImageZoom(Number(e.target.value) || 1)}
                        className="w-full"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setImageCropSrc(null);
                            setPostFile(null);
                            setPostPreviewUrl('');
                            setImageCrop({ x: 0, y: 0 });
                            setImageZoom(1);
                            setImageCroppedAreaPixels(null);
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10"
                        >
                          Cancelar recorte
                        </button>
                        <button
                          type="button"
                          onClick={confirmImageCrop}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-beatwap-gold border border-beatwap-gold text-black hover:bg-white hover:border-white"
                        >
                          Confirmar recorte
                        </button>
                      </div>
                      <div className="text-xs text-gray-400">
                        Ajuste antes de publicar. A foto será salva em {postFormat === 'vertical' ? '1080x1920' : '1080x1080'}.
                      </div>
                    </div>
                  )}
                  {postPreviewUrl && postType === 'image' && !imageCropSrc && (
                    <div className={`relative w-full ${postFormat === 'vertical' ? 'aspect-[9/16]' : 'aspect-square'} rounded-xl overflow-hidden border border-white/10 bg-black/30`}>
                      <img src={postPreviewUrl} alt="Prévia" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  )}
                  {postPreviewUrl && postType === 'video' && (
                    <div className="space-y-3">
                      <div className={`relative w-full ${postFormat === 'vertical' ? 'aspect-[9/16]' : 'aspect-square'} rounded-xl overflow-hidden border border-white/10 bg-black/30`}>
                        <video
                          src={postPreviewUrl}
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{ objectPosition: `${postObjectPos.x}% ${postObjectPos.y}%` }}
                          controls
                          playsInline
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="text-xs text-gray-400">Ajuste o enquadramento</div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-gray-400 w-10">X</div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={postObjectPos.x}
                            onChange={(e) => setPostObjectPos((prev) => ({ ...prev, x: Number(e.target.value) || 0 }))}
                            className="w-full"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-gray-400 w-10">Y</div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={postObjectPos.y}
                            onChange={(e) => setPostObjectPos((prev) => ({ ...prev, y: Number(e.target.value) || 0 }))}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        Vídeos são exibidos em {postFormat === 'vertical' ? '1080x1920' : '1080x1080'} (corte visual).
                      </div>
                    </div>
                  )}
                  {posting && (
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div className="h-2 bg-beatwap-gold rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, Number(postProgress || 0)))}%` }} />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closePostModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10"
                >
                  Cancelar
                </button>
                <AnimatedButton
                  onClick={createFeedPost}
                  disabled={
                    posting
                    || (postType === 'text' && !String(postCaption || '').trim())
                    || (postType === 'link' && !String(postLinkUrl || '').trim())
                    || (!editingPostId && ((postType === 'image' || postType === 'video') && !postFile))
                    || (!editingPostId && (postType === 'image' && imageCropSrc))
                  }
                >
                  {posting ? (editingPostId ? 'Salvando...' : 'Publicando...') : (editingPostId ? 'Salvar' : 'Publicar')}
                </AnimatedButton>
              </div>
              <div className="text-xs text-gray-400">
                Posts feitos aqui aparecem só no feed. Posts do perfil público aparecem no feed também.
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Feed;
