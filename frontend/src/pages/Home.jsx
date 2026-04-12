import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import FeaturedUsers from '../components/landing/FeaturedUsers';
import HowItWorks from '../components/landing/HowItWorks';
import Benefits from '../components/landing/Benefits';
import Transparency from '../components/landing/Transparency';
import Pricing from '../components/landing/Pricing';
import ShowProduction from '../components/landing/ShowProduction';
import SpecialOffer from '../components/landing/SpecialOffer';
import Contact from '../components/landing/Contact';
import Footer from '../components/landing/Footer';
import { apiClient } from '../services/apiClient';
import { Play, Pause, BadgeCheck, Music, MessageCircle, ChevronLeft, ChevronRight, User, Info, X, Heart, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Instagram, Globe, Youtube, Video } from 'lucide-react';
import { decryptData } from '../utils/security';
import { useAuth } from '../context/AuthContext';
 

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [latestReleases, setLatestReleases] = useState([]);
  const [latestCompositions, setLatestCompositions] = useState([]);
  const [latestProjects, setLatestProjects] = useState([]);
  const [composers, setComposers] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [artists, setArtists] = useState([]);
  const [producers, setProducers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [featuredPlans, setFeaturedPlans] = useState(null);
  const [hitOfWeek, setHitOfWeek] = useState(null);
  const [hitWinner, setHitWinner] = useState(null);
  const [hitEntries, setHitEntries] = useState([]);
  const [hitVotingId, setHitVotingId] = useState(null);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [activeSponsorMenu, setActiveSponsorMenu] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [ipHash, setIpHash] = useState(null);
  const [playStartTS, setPlayStartTS] = useState(null);
  const [activeProjectVideo, setActiveProjectVideo] = useState(null);
  const [openDescriptionId, setOpenDescriptionId] = useState(null);
  const [highlightedHitEntryId, setHighlightedHitEntryId] = useState(null);
  const upcomingRef = useRef(null);
  const releasedRef = useRef(null);
  const compositionsRef = useRef(null);
  const composersRef = useRef(null);
  const sponsorsRef = useRef(null);
  const makeScroll = (ref, dir) => () => {
    const el = ref.current;
    if (!el) return;
    const delta = Math.max(240, Math.round(el.clientWidth * 0.8));
    el.scrollBy({ left: dir * delta, behavior: 'smooth' });
  };

  const buildWhatsAppHref = (rawPhone, title) => {
    const raw = decryptData(rawPhone);
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return null;
    const phone = digits.startsWith('55') ? digits : `55${digits}`;
    const text = encodeURIComponent(`Olá, vi sua composição "${title}" na BeatWap e gostaria de saber mais.`);
    return `https://wa.me/${phone}?text=${text}`;
  };

  const formatWhatsAppPhone = (rawPhone) => {
    const raw = decryptData(rawPhone);
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return null;
    const normalized = digits.startsWith('55') ? digits : `55${digits}`;
    const national = normalized.startsWith('55') ? normalized.slice(2) : normalized;
    const ddd = national.slice(0, 2);
    const rest = national.slice(2);
    if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    return `+${normalized}`;
  };

  const toggleCompositionLike = async (compId) => {
    try {
      const res = await apiClient.post(`/compositions/${compId}/like`, { ip_hash: ipHash || 'unknown' });
      const { liked, likes } = res || {};
      setLatestCompositions(prev => prev.map(c => c.id === compId ? { ...c, likes_count: likes, liked } : c));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const sanitizeUrl = (u) => String(u || '').trim().replace(/^[`'"]+|[`'"]+$/g, '');
  const isVideoUrl = (u) => {
    const x = (u || '').toLowerCase();
    return /\.(mp4|webm|ogg|mov)(\?.*)?$/.test(x);
  };
  const getYoutubeId = (u) => {
    const m = String(u || '').match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
  };
  const [fileVideoUrl, setFileVideoUrl] = useState(null);
  const getOtherComposerNames = (c) => {
    const main = String(c?.composer_name || '').trim().toLowerCase();
    const list = []
      .concat(c?.composer_partner_name ? [c.composer_partner_name] : [])
      .concat(Array.isArray(c?.external_composers) ? c.external_composers : [])
      .map((x) => String(x || '').trim())
      .filter((x) => x);
    const out = [];
    const seen = new Set();
    for (const name of list) {
      const key = name.toLowerCase();
      if (key === main) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
    return out;
  };
  const enrichCompositionsFromProfiles = async (comps) => {
    const missingIds = new Set();
    (comps || []).forEach((c) => {
      const authorId = c?.composer_id;
      if (authorId) {
        const hasName = !!(c?.composer_name && c.composer_name !== 'Autor');
        const hasPhone = !!formatWhatsAppPhone(c?.composer_phone);
        if (!hasName || !hasPhone) missingIds.add(String(authorId));
      }
      const partnerId = c?.composer_partner_id;
      if (partnerId && !c?.composer_partner_name) missingIds.add(String(partnerId));
    });
    const ids = Array.from(missingIds);
    if (!ids.length) return comps;

    const results = await Promise.allSettled(
      ids.map((id) => apiClient.get(`/profiles/${id}`, { cache: true, cacheTtlMs: 15000 }))
    );
    const byId = new Map();
    results.forEach((r) => {
      if (r.status !== 'fulfilled') return;
      const p = r.value;
      if (!p?.id) return;
      byId.set(String(p.id), p);
    });

    return (comps || []).map((c) => {
      const authorId = c?.composer_id;
      const p = authorId ? byId.get(String(authorId)) : null;
      const partnerId = c?.composer_partner_id;
      const pp = partnerId ? byId.get(String(partnerId)) : null;
      if (!p && !pp) return c;

      const name =
        (c?.composer_name && c.composer_name !== 'Autor')
          ? c.composer_name
          : (p ? (decryptData(p.nome) || decryptData(p.nome_completo_razao_social) || 'Autor') : (c?.composer_name || 'Autor'));

      const phone = c?.composer_phone || (p ? (p.celular || p.phone || null) : null);
      const partnerName = c?.composer_partner_name || (pp ? (decryptData(pp.nome) || decryptData(pp.nome_completo_razao_social) || null) : null);

      return { ...c, composer_name: name, composer_phone: phone, composer_partner_name: partnerName };
    });
  };

  // Reset scroll on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchHomeData();
    (async () => {
      try {
        await apiClient.post('/analytics', { type: 'page_view', page: 'home', path: '/' });
      } catch {
        void 0;
      }
    })();
    (async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const json = await res.json();
        setIpHash(json?.ip || null);
      } catch {
        setIpHash(null);
      }
    })();
  }, []);

  useEffect(() => {
    if (!location?.hash) return;
    const id = location.hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location]);

  useEffect(() => {
    const params = new URLSearchParams(location?.search || '');
    const vote = String(params.get('vote') || '').trim();
    if (!vote) return;
    setHighlightedHitEntryId(vote);
  }, [location?.search]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const groupReleasesByAlbum = (items) => {
    const groups = [];
    const albumMap = new Map();

    items.forEach(r => {
      const isAlbum = !!r.album_id;
      if (!isAlbum && !r.show_on_home) {
        return;
      }
      if (isAlbum) {
        if (!albumMap.has(r.album_id)) {
          albumMap.set(r.album_id, {
            type: 'album',
            id: r.album_id,
            title: r.album_title || r.titulo || 'Álbum',
            cover_url: r.cover_url,
            artista_id: r.artista_id,
            nome_artista: r.nome_artista,
            release_date: r.release_date,
            created_at: r.created_at,
            estilo: r.estilo,
            is_beatwap_produced: r.is_beatwap_produced,
            presave_link: r.presave_link,
            preview_url: r.preview_url,
            audio_url: r.audio_url,
            tracks: []
          });
        }
        albumMap.get(r.album_id).tracks.push(r);
      } else {
        groups.push({ ...r, type: 'single' });
      }
    });

    albumMap.forEach(group => {
      group.tracks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      groups.push(group);
    });

    return groups;
  };

  const sortProfilesOldestFirst = (items) => {
    const arr = Array.isArray(items) ? items.slice() : [];
    const toMs = (v) => {
      if (!v) return Number.POSITIVE_INFINITY;
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
    };
    return arr.sort((a, b) => toMs(a?.created_at) - toMs(b?.created_at));
  };

  const featuredWeight = (lvl) => {
    const x = String(lvl || '').toLowerCase();
    if (x === 'top') return 3;
    if (x === 'pro') return 2;
    if (x === 'basic') return 1;
    return 0;
  };
  const isFeaturedActive = (row) => {
    const f = row?.access_control?.featured && typeof row.access_control.featured === 'object' ? row.access_control.featured : null;
    if (!f) return false;
    if (f.enabled === false) return false;
    const endsAt = f.ends_at || f.until || f.end_at || null;
    if (!endsAt) return true;
    const t = new Date(endsAt).getTime();
    return Number.isFinite(t) ? t > Date.now() : false;
  };
  const sortProfilesWithFeaturedFirst = (items) => {
    const arr = Array.isArray(items) ? items.slice() : [];
    const toMs = (v) => {
      if (!v) return Number.POSITIVE_INFINITY;
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
    };
    return arr.sort((a, b) => {
      const fa = isFeaturedActive(a);
      const fb = isFeaturedActive(b);
      if (fa !== fb) return fa ? -1 : 1;
      if (fa && fb) {
        const wa = featuredWeight(a?.access_control?.featured?.level);
        const wb = featuredWeight(b?.access_control?.featured?.level);
        if (wa !== wb) return wb - wa;
        const pa = a?.access_control?.featured?.pinned === true;
        const pb = b?.access_control?.featured?.pinned === true;
        if (pa !== pb) return pb ? 1 : -1;
        const ea = new Date(a?.access_control?.featured?.ends_at || a?.access_control?.featured?.until || 0).getTime();
        const eb = new Date(b?.access_control?.featured?.ends_at || b?.access_control?.featured?.until || 0).getTime();
        if (Number.isFinite(ea) && Number.isFinite(eb) && ea !== eb) return eb - ea;
      }
      return toMs(a?.created_at) - toMs(b?.created_at);
    });
  };

  const fetchHomeData = async () => {
    try {
      const data = await apiClient.get('/home', {
        timeoutMs: 30000,
        perAttemptTimeoutMs: 25000,
        cache: true,
        cacheTtlMs: 15000
      });

      await fetchLatestReleases();
      await fetchLatestProjects();

      const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const filterNoAvulso = (arr) => (Array.isArray(arr) ? arr : []).filter(p => isFeaturedActive(p) || !normalize(p?.plano).includes('avulso'));

      const compositions = (data && Array.isArray(data.compositions)) ? data.compositions : [];
      const mapped = compositions.map(c => ({
        ...c,
        composer_id: c?.composer_id || c?.composerId || c?.user_id || c?.userId || c?.profile_id || c?.profileId,
        composer_name: decryptData(c?.composer_name || c?.author_name || c?.nome_autor || c?.nome_compositor || c?.nome || '') || 'Autor',
        composer_partner_id: c?.composer_partner_id || c?.composerPartnerId || null,
        composer_partner_name: decryptData(c?.composer_partner_name || c?.partner_composer_name || '') || null,
        external_composers: Array.isArray(c?.external_composers) ? c.external_composers : [],
        composer_phone: c?.composer_phone || c?.celular || c?.whatsapp || c?.phone || null
      })).sort((a, b) => {
        const da = new Date(a.created_at || a.createdAt || 0).getTime();
        const db = new Date(b.created_at || b.createdAt || 0).getTime();
        return db - da;
      });
      const capped = mapped.slice(0, 10);
      setLatestCompositions(capped);
      enrichCompositionsFromProfiles(capped)
        .then((enriched) => setLatestCompositions(enriched))
        .catch(() => void 0);

      setFeaturedPlans((data && data.featured_plans) ? data.featured_plans : null);
      setHitOfWeek((data && data.hit_of_week) ? data.hit_of_week : null);
      setHitWinner((data && data.hit_winner) ? data.hit_winner : null);
      fetchHitEntries().catch(() => void 0);
      setComposers(sortProfilesWithFeaturedFirst(filterNoAvulso((data && Array.isArray(data.composers)) ? data.composers : [])));
      setSponsors((data && Array.isArray(data.sponsors)) ? data.sponsors : []);
      setArtists(sortProfilesWithFeaturedFirst(filterNoAvulso((data && Array.isArray(data.artists)) ? data.artists : [])));
      setProducers(sortProfilesWithFeaturedFirst((data && Array.isArray(data.producers)) ? data.producers : []));
      setSellers(sortProfilesWithFeaturedFirst((data && Array.isArray(data.sellers)) ? data.sellers : []));
    } catch (error) {
      console.warn('Home endpoint falhou; carregando via endpoints individuais:', error);
      try {
        await Promise.allSettled([
          fetchLatestReleases(),
          fetchLatestCompositions(),
          fetchLatestProjects(),
          fetchComposers(),
        ]);
        await Promise.allSettled([
          fetchSponsors(),
          fetchArtists(),
          fetchProducers(),
          fetchSellers(),
        ]);
      } catch {
        void 0;
      }
    }
  };

  const fetchLatestReleases = async () => {
    try {
      const data = await apiClient.get('/musics');
      const approved = (data || []).filter(m => {
        const s = String(m.status || '').toLowerCase();
        return s === 'aprovado' || s === 'approved';
      });
      const parseDateOnly = (raw) => {
        const s = String(raw || '').trim();
        if (!s) return null;
        const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) {
          const y = Number(iso[1]);
          const m = Number(iso[2]);
          const d = Number(iso[3]);
          if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) return new Date(y, m - 1, d);
        }
        const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (br) {
          const d = Number(br[1]);
          const m = Number(br[2]);
          const y = Number(br[3]);
          if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) return new Date(y, m - 1, d);
        }
        const t = new Date(s).getTime();
        if (!Number.isFinite(t)) return null;
        const dt = new Date(t);
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      };
      const mapped = approved.map(m => ({
        id: m.id,
        titulo: m.titulo,
        nome_artista: m.nome_artista,
        artista_id: m.artista_id,
        cover_url: m.cover_url,
        audio_url: m.audio_url,
        preview_url: m.preview_url || m.audio_url,
        presave_link: m.presave_link || null,
        release_date: m.release_date || null,
        album_id: m.album_id || null,
        album_title: m.album_title || null,
        created_at: m.created_at,
        estilo: m.estilo,
        is_beatwap_produced: !!m.is_beatwap_produced,
        show_on_home: !!m.show_on_home
      }));
      // Ordenação semelhante ao fluxo anterior
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const parsed = mapped.map(r => {
        const rd = r.release_date ? parseDateOnly(r.release_date) : null;
        const cd = parseDateOnly(r.created_at);
        const effective = rd || cd;
        const isUpcoming = effective ? effective > today : false;
        return { ...r, _rd: effective, _isUpcoming: isUpcoming };
      });
      const upcoming = parsed.filter(r => r._isUpcoming).sort((a, b) => (a._rd - b._rd));
      const pastOrNoDate = parsed.filter(r => !r._isUpcoming).sort((a, b) => {
        if (a._rd && b._rd) return b._rd - a._rd;
        if (a._rd && !b._rd) return -1;
        if (!a._rd && b._rd) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      const combined = [...upcoming, ...pastOrNoDate].map(r => {
        const o = { ...r };
        delete o._rd;
        delete o._isUpcoming;
        return o;
      });
      setLatestReleases(combined);
    } catch (error) {
      console.error('Error fetching releases:', error);
    }
  };
 
  const fetchLatestCompositions = async () => {
    try {
      const data = await apiClient.get('/compositions');
      const mapped = (data || []).map(c => ({
        ...c,
        composer_id: c?.composer_id || c?.composerId || c?.user_id || c?.userId || c?.profile_id || c?.profileId,
        composer_name: decryptData(c?.composer_name || c?.author_name || c?.nome_autor || c?.nome_compositor || c?.nome || '') || 'Autor',
        composer_partner_id: c?.composer_partner_id || c?.composerPartnerId || null,
        composer_partner_name: decryptData(c?.composer_partner_name || c?.partner_composer_name || '') || null,
        external_composers: Array.isArray(c?.external_composers) ? c.external_composers : [],
        composer_phone: c?.composer_phone || c?.celular || c?.whatsapp || c?.phone || null
      })).sort((a, b) => {
        const da = new Date(a.created_at || a.createdAt || 0).getTime();
        const db = new Date(b.created_at || b.createdAt || 0).getTime();
        return db - da;
      });
      const capped = mapped.slice(0, 10);
      setLatestCompositions(capped);
      enrichCompositionsFromProfiles(capped)
        .then((enriched) => setLatestCompositions(enriched))
        .catch(() => void 0);
    } catch (error) {
      console.error('Error fetching compositions:', error);
    }
  };

  const toggleMusicLike = async (musicId) => {
    try {
      const res = await apiClient.post(`/musics/${musicId}/like`, { ip_hash: ipHash || 'unknown' });
      const { liked, likes } = res || {};
      setLatestReleases(prev => prev.map(r => r.id === musicId ? { ...r, likes_count: likes, liked } : r));
    } catch (error) {
      console.error('Error toggling music like:', error);
    }
  };

  const recordEvent = async (payload) => {
    try {
      // Whitelist de eventos suportados pela tabela analytics_events
      const t = String(payload?.type || '');
      const allowed =
        t === 'music_play' ||
        t === 'music_click_presave' ||
        t === 'music_click_smartlink' ||
        t === 'page_view' ||
        t.startsWith('artist_click_') ||
        t === 'sponsor_click';
      if (!allowed) {
        return;
      }
      if (t === 'page_view') {
        await apiClient.post('/analytics', { ...payload });
        return;
      }
      await apiClient.post('/analytics', { ...payload, ip_hash: ipHash || 'unknown' });
    } catch (e) { void 0; }
  };


  const fetchArtists = async () => {
    try {
      const data = await apiClient.get('/profiles?role=artist');
      const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const filtered = (data || []).filter(a => !normalize(a?.plano).includes('avulso'));
      setArtists(sortProfilesOldestFirst(filtered));
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const fetchProducers = async () => {
    try {
      const data = await apiClient.get('/profiles?role=producer');
      setProducers(sortProfilesOldestFirst(data || []));
    } catch (error) {
      console.error('Error fetching producers:', error);
    }
  };

  const fetchSellers = async () => {
    try {
      const data = await apiClient.get('/profiles?role=seller');
      setSellers(sortProfilesOldestFirst(data || []));
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchSponsors = async () => {
    try {
      const data = await apiClient.get('/sponsors');
      setSponsors(data || []);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
    }
  };

  const fetchLatestProjects = async () => {
    try {
      const data = await apiClient.get('/producer-projects');
      const mapped = (data || [])
        .filter(p => p && p.published === true)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setLatestProjects(mapped);
    } catch (error) {
      console.error('Error fetching producer projects:', error);
    }
  };

  const [previewTimer, setPreviewTimer] = useState(null);
  const togglePlay = (trackId, url, opts = {}) => {
    if (!url) return;
    const full = opts?.full === true;
    if (playingTrack === trackId && audioElement) {
      if (isPaused) {
        audioElement.play().catch(() => {});
        setIsPaused(false);
        setPlayStartTS(Date.now());
      } else {
        audioElement.pause();
        setIsPaused(true);
        if (playStartTS) {
          const duration = Math.max(0, Math.round((Date.now() - playStartTS) / 1000));
          const rel = latestReleases.find(r => r.id === trackId);
          if (rel) recordEvent({ type: 'music_play', music_id: rel.id, artist_id: rel.artista_id, duration_seconds: duration });
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
        const rel = latestReleases.find(r => r.id === trackId);
        if (rel) recordEvent({ type: 'music_play', music_id: rel.id, artist_id: rel.artista_id, duration_seconds: duration });
        setPlayStartTS(null);
      }
      setPlayingTrack(null);
      setAudioElement(null);
      setIsPaused(false);
    };
    const start = Math.max(0, Number(opts.startSeconds ?? 0));
    const endOpt = opts.endSeconds;
    let durationLimit = null;
    if (!full) {
      let segLen = 30;
      if (Number.isFinite(Number(endOpt))) {
        const diff = Number(endOpt) - start;
        if (diff > 0) segLen = diff;
      }
      durationLimit = Math.min(30, Math.max(20, segLen));
    }
    audio.addEventListener('loadedmetadata', () => {
      try { audio.currentTime = start; } catch (e) { void e; }
    }, { once: true });
    audio.play().catch(() => {});
    setPlayStartTS(Date.now());
    setAudioElement(audio);
    setPlayingTrack(trackId);
    setIsPaused(false);
    if (previewTimer) {
      clearTimeout(previewTimer);
      setPreviewTimer(null);
    }
    if (durationLimit) {
      const t = setTimeout(() => {
        try { audio.pause(); } catch (e) { void e; }
        setPlayingTrack(null);
        setAudioElement(null);
        setIsPaused(false);
        setPlayStartTS(null);
      }, durationLimit * 1000);
      setPreviewTimer(t);
    }
  };

  const fetchComposers = async () => {
    try {
      const data = await apiClient.get('/composers');
      const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const mapped = (data || []).map(s => ({ ...s, name: s.nome || s.nome_completo_razao_social || '' }));
      const filtered = mapped.filter(s => isFeaturedActive(s) || !normalize(s?.plano).includes('avulso'));
      setComposers(sortProfilesWithFeaturedFirst(filtered));
    } catch (error) {
      console.error('Error fetching composers:', error);
    }
  };

  const fetchHitEntries = async () => {
    try {
      const list = await apiClient.get('/hit-of-week/entries', { cache: true, cacheTtlMs: 8000 });
      setHitEntries(Array.isArray(list) ? list : []);
    } catch {
      setHitEntries([]);
    }
  };

  const toggleHitVote = async (entryId) => {
    const id = String(entryId || '').trim();
    if (!id) return;
    setHitVotingId(id);
    try {
      const res = await apiClient.post(`/hit-of-week/entries/${id}/vote`);
      const votes = Number(res?.votes || 0);
      setHitEntries((prev) => {
        const next = (Array.isArray(prev) ? prev : []).map((e) => {
          if (e.id === id) return { ...e, votes_count: votes, voted: true };
          return { ...e, voted: false };
        });
        next.sort((a, b) => (Number(b.votes_count || 0) - Number(a.votes_count || 0)) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
        return next;
      });
    } catch (e) {
      window.alert(e?.message || 'Erro ao votar');
    } finally {
      setHitVotingId(null);
    }
  };

  const shareHitEntry = (entry) => {
    const id = String(entry?.id || '').trim();
    if (!id) return;
    const title = String(entry?.title || 'minha composição').trim();
    const u = new URL(window.location.href);
    u.searchParams.set('vote', id);
    u.hash = 'hit-da-semana';
    const link = u.toString();
    const msg = `Vote em minha composição "${title}" para ser a ganhadora do Hit da Semana BeatWap! ${link}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(wa, '_blank');
  };

  return (
    <div className="bg-beatwap-dark min-h-screen text-white font-sans selection:bg-beatwap-gold selection:text-black">
      <Header />
      <main>
        <Hero />
        <section className="py-10 px-6 bg-black/20 border-b border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xl md:text-2xl font-bold text-white">🔥 Novo: Feed no Painel</div>
                <div className="text-gray-300 mt-1">
                  Siga perfis e acompanhe lançamentos, posts e composições em tempo real.
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AnimatedButton onClick={() => navigate(user ? '/dashboard/feed' : '/login')}>
                  {user ? 'Abrir Feed' : 'Entrar e ver Feed'}
                </AnimatedButton>
              </div>
            </div>
          </div>
        </section>
        {(() => {
          const all = []
            .concat(Array.isArray(artists) ? artists : [])
            .concat(Array.isArray(composers) ? composers : [])
            .concat(Array.isArray(producers) ? producers : [])
            .concat(Array.isArray(sellers) ? sellers : []);

          const byId = new Map();
          for (const p of all) {
            if (p?.id) byId.set(String(p.id), p);
          }

          const list = Array.from(byId.values())
            .filter(isFeaturedActive)
            .sort((a, b) => {
              const wa = featuredWeight(a?.access_control?.featured?.level);
              const wb = featuredWeight(b?.access_control?.featured?.level);
              if (wa !== wb) return wb - wa;
              const pa = a?.access_control?.featured?.pinned === true;
              const pb = b?.access_control?.featured?.pinned === true;
              if (pa !== pb) return pb ? 1 : -1;
              const ea = new Date(a?.access_control?.featured?.ends_at || a?.access_control?.featured?.until || 0).getTime();
              const eb = new Date(b?.access_control?.featured?.ends_at || b?.access_control?.featured?.until || 0).getTime();
              if (Number.isFinite(ea) && Number.isFinite(eb) && ea !== eb) return eb - ea;
              const ca = new Date(a?.created_at || a?.createdAt || 0).getTime();
              const cb = new Date(b?.created_at || b?.createdAt || 0).getTime();
              return cb - ca;
            })
            .slice(0, 12);

          if (list.length === 0) return null;

          const roleLabel = (p) => String(p?.cargo || p?.role || '').trim() || 'Perfil';
          const levelLabel = (p) => {
            const lvl = String(p?.access_control?.featured?.level || '').toLowerCase();
            if (lvl === 'top') return 'Destaque Top';
            if (lvl === 'pro') return 'Destaque Pro';
            return 'Destaque';
          };
          const tint = (p) => {
            const lvl = String(p?.access_control?.featured?.level || '').toLowerCase();
            if (lvl === 'top') return 'from-beatwap-gold/35 via-yellow-400/20 to-transparent';
            if (lvl === 'pro') return 'from-purple-500/35 via-pink-500/20 to-transparent';
            return 'from-beatwap-gold/25 via-beatwap-gold/10 to-transparent';
          };
          const border = (p) => {
            const lvl = String(p?.access_control?.featured?.level || '').toLowerCase();
            if (lvl === 'top') return 'border-beatwap-gold shadow-[0_0_0_1px_rgba(255,200,0,0.25),0_0_30px_rgba(255,200,0,0.18)]';
            if (lvl === 'pro') return 'border-purple-400/60 shadow-[0_0_0_1px_rgba(168,85,247,0.22),0_0_30px_rgba(168,85,247,0.14)]';
            return 'border-beatwap-gold/70 shadow-[0_0_0_1px_rgba(255,200,0,0.18),0_0_24px_rgba(255,200,0,0.10)]';
          };

          return (
            <section className="py-14 px-6 bg-black/10 border-b border-white/5 overflow-hidden">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Perfis Impulsionados</h2>
                    <p className="text-sm text-gray-400">Apareça no topo e seja descoberto mais rápido</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const target = document.getElementById('destaque-pago');
                      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-extrabold text-white hover:border-beatwap-gold hover:text-beatwap-gold transition-colors"
                  >
                    Ver planos de destaque
                    <Info size={14} />
                  </button>
                </div>

                <div className="relative -mx-6">
                  <div className="overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 pb-2 no-scrollbar">
                    <div className="flex gap-6 justify-start">
                      {list.map((p, idx) => (
                        <div key={p.id} className="flex-none w-[280px]">
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.06 }}
                            className={`group relative w-full text-left rounded-2xl border bg-white/5 overflow-hidden cursor-pointer ${border(p)}`}
                            onClick={() => navigate(`/profile/${p.id}`)}
                          >
                            <motion.div
                              aria-hidden="true"
                              className="absolute -inset-2 rounded-[22px] pointer-events-none"
                              animate={{ opacity: [0.35, 0.75, 0.35], scale: [1, 1.03, 1] }}
                              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              <div className={`absolute inset-0 rounded-[22px] bg-gradient-to-r ${tint(p)}`} />
                            </motion.div>
                            <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-full text-[10px] font-extrabold bg-black/70 border border-white/10 text-white">
                              {levelLabel(p)}
                            </div>

                            <div className="aspect-square bg-gray-800 relative overflow-hidden">
                              {p.avatar_url ? (
                                <img
                                  src={p.avatar_url}
                                  alt={p.nome || p.nome_completo_razao_social || 'Perfil'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                  <User size={64} className="text-white/20" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-100 transition-opacity flex items-end p-4">
                                <div className="w-full">
                                  <div className="text-white text-base font-extrabold leading-snug truncate">
                                    {decryptData(p.nome) || decryptData(p.nome_completo_razao_social) || p.nome || p.nome_completo_razao_social || 'Perfil'}
                                  </div>
                                  <div className="text-xs text-gray-300 flex items-center gap-2">
                                    <span>{roleLabel(p)}</span>
                                    <span className="flex items-center gap-1 text-beatwap-gold">
                                      <Info size={14} />
                                      <span>Ver Perfil</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}
        <section className="relative py-16 px-4 sm:px-6 bg-gradient-to-r from-beatwap-gold/10 via-black to-beatwap-gold/5 border-y border-white/5 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />
          <div className="relative max-w-6xl mx-auto grid md:grid-cols-[3fr,2fr] gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <p className="text-sm font-semibold tracking-[0.2em] uppercase text-beatwap-gold/80">
                Documentação sem dor de cabeça
              </p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
                Você cuida da música.
                <span className="text-beatwap-gold"> A BeatWap cuida da burocracia.</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-300 max-w-2xl">
                Registros de direitos autorais e ABRAMUS, documentos para shows em prefeituras, projetos culturais
                como Lei Rouanet e qualquer documentação que sua carreira musical precisar. Nossa equipe faz tudo
                por você, do papel ao protocolo final.
              </p>
              <p className="text-sm sm:text-base text-gray-200">
                Você só envia suas informações ou músicas e nós assumimos o processo do início ao fim.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <AnimatedButton
                  onClick={() =>
                    window.open(
                      'https://wa.me/5519981083497?text=' +
                        encodeURIComponent('Olá! Quero enviar minha música para a BeatWap sem complicação.'),
                      '_blank'
                    )
                  }
                >
                  Envie sua música sem complicação
                </AnimatedButton>
                <button
                  type="button"
                  onClick={() => {
                    const target = document.getElementById('contato') || document.getElementById('contact');
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-100 hover:border-beatwap-gold hover:text-beatwap-gold transition-colors"
                >
                  <MessageCircle size={16} />
                  Conte com nosso suporte completo
                </button>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="rounded-2xl bg-black/40 border border-beatwap-gold/40 p-4 flex flex-col gap-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="w-9 h-9 rounded-full bg-beatwap-gold/15 border border-beatwap-gold/60 flex items-center justify-center text-beatwap-gold">
                  <BadgeCheck size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Direitos Autorais e ABRAMUS</p>
                  <p className="text-xs text-gray-300">
                    Organização de registros e cadastros para garantir que sua obra esteja protegida.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3">
                <div className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-beatwap-gold">
                  <Music size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Shows e Projetos Culturais</p>
                  <p className="text-xs text-gray-300">
                    Documentos para prefeituras, editais e leis de incentivo tratados por especialistas.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-black/40 border border-white/15 p-4 flex flex-col gap-3 sm:col-span-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-beatwap-gold">
                  <span className="inline-flex h-2 w-2 rounded-full bg-green-400 mr-1 animate-pulse" />
                  Suporte humano e consultivo para cada etapa
                </div>
                <p className="text-xs text-gray-200">
                  Esqueça formulários confusos e protocolos intermináveis. A BeatWap traduz a burocracia para a
                  linguagem do artista e acompanha você em tudo que envolve papelada.
                </p>
              </div>
            </motion.div>
          </div>
        </section>
        
        {/* Latest Releases Section */}
        {latestReleases.length > 0 && (() => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const parseReleaseDate = (raw) => {
            const s = String(raw || '').trim();
            if (!s) return null;
            const datePartMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (datePartMatch) {
              const y = Number(datePartMatch[1]);
              const m = Number(datePartMatch[2]);
              const d = Number(datePartMatch[3]);
              if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
                return new Date(y, m - 1, d);
              }
            }
            const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (brMatch) {
              const d = Number(brMatch[1]);
              const m = Number(brMatch[2]);
              const y = Number(brMatch[3]);
              if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
                return new Date(y, m - 1, d);
              }
            }
            const t = new Date(s).getTime();
            if (!Number.isFinite(t)) return null;
            const dt = new Date(t);
            return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
          };
          const upcomingBase = latestReleases.filter(r => {
            const date = parseReleaseDate(r.release_date || r.created_at);
            if (!date) return !!r.presave_link;
            return date > today;
          });
          const releasedBase = latestReleases.filter(r => {
            const date = parseReleaseDate(r.release_date || r.created_at);
            if (!date) return !r.presave_link;
            return date <= today;
          });
          const upcoming = groupReleasesByAlbum(upcomingBase).slice(0, 10);
          const toMs = (v) => {
            const t = new Date(v || 0).getTime();
            return Number.isFinite(t) ? t : 0;
          };
          const sortTs = (item) => {
            if (!item) return 0;
            if (item.type === 'album') {
              const candidate = [];
              if (item.release_date) candidate.push(item.release_date);
              if (Array.isArray(item.tracks)) {
                item.tracks.forEach((t) => candidate.push(t?.release_date || t?.created_at || 0));
              }
              candidate.push(item.created_at || 0);
              return Math.max(...candidate.map(toMs));
            }
            return toMs(item.release_date || item.created_at || 0);
          };
          const released = groupReleasesByAlbum(releasedBase).sort((a, b) => sortTs(b) - sortTs(a)).slice(0, 10);
          return (
            <>
              {upcoming.length > 0 && (
                <section className="py-16 px-4 sm:px-6 bg-black/30">
                  <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"><span>Em Breve</span></h2>
                      <p className="text-gray-400"><span>Pré-saves e lançamentos agendados</span></p>
                    </div>
                    <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
                      Arraste para o lado e veja todos
                    </div>
                    <div className="relative">
                      <div
                        ref={upcomingRef}
                        className="overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 pb-2"
                      >
                        <div className="flex gap-6">
                        {upcoming.map((item, index) => (
                          <div key={item.type === 'album' ? `album-${item.id}` : `single-${item.id}`} className="flex-none w-[280px]">
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="h-full flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-beatwap-gold transition-colors group"
                            >
                              <div
                                className="aspect-square bg-gray-800 relative overflow-hidden"
                                onClick={() => {
                                  if (item.type === 'album') {
                                    navigate(`/album/${item.id}`);
                                  } else {
                                    const url = item.preview_url || item.audio_url;
                                    togglePlay(item.id, url);
                                  }
                                }}
                              >
                                {item.type === 'album' && item.cover_url && (
                                  <img 
                                    src={item.cover_url} 
                                    alt={item.title || 'Capa'} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                  />
                                )}
                                {item.type === 'single' && (
                                <img 
                                  src={item.cover_url} 
                                  alt={item.titulo || 'Capa'} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                />
                                )}
                                {item.release_date && (() => {
                                  const [y, m, d] = item.release_date.split('-');
                                  const rDate = new Date(y, m - 1, d);
                                  return (
                                    <div className="absolute top-2 left-2 text-black text-xs font-bold px-2 py-1 rounded bg-beatwap-gold">
                                      <span>Lança em {rDate.toLocaleDateString('pt-BR')}</span>
                                    </div>
                                  );
                                })()}
                                {item.is_beatwap_produced && (
                                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-beatwap-gold/50 z-10" title="Produzido, Mixado e Masterizado pela BeatWap">
                                    <BadgeCheck className="text-beatwap-gold w-5 h-5" />
                                  </div>
                                )}
                                {item.type === 'single' && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                      className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black transform scale-0 group-hover:scale-100 transition-transform duration-300 hover:bg-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const url = item.preview_url || item.audio_url;
                                        togglePlay(item.id, url);
                                      }}
                                    >
                                      {playingTrack === item.id && !isPaused
                                        ? <Pause fill="currentColor" className="ml-1" />
                                        : <Play fill="currentColor" className="ml-1" />}
                                    </button>
                                  </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent block sm:hidden">
                                  <div className="text-white text-sm font-bold truncate">
                                    {item.type === 'album' ? (item.title || 'Álbum') : (item.titulo || 'Lançamento')}
                                  </div>
                                  <div className="text-[11px] text-gray-300 truncate">{item.nome_artista || 'Artista'}</div>
                                  {item.presave_link && (
                                    <div className="mt-2">
                                      <AnimatedButton
                                        fullWidth
                                        className="px-3 py-2 text-xs rounded-lg"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (item.type === 'album') {
                                            const firstTrack = item.tracks?.[0];
                                            const musicId = firstTrack?.id;
                                            const artistId = firstTrack?.artista_id || item.artista_id;
                                            if (musicId) {
                                              recordEvent({ type: 'music_click_presave', music_id: musicId, artist_id: artistId });
                                            }
                                            window.open(item.presave_link, '_blank');
                                            return;
                                          }
                                          recordEvent({ type: 'music_click_presave', music_id: item.id, artist_id: item.artista_id });
                                          window.open(item.presave_link, '_blank');
                                        }}
                                      >
                                        Pré-save
                                      </AnimatedButton>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="hidden sm:flex p-4 flex-1 flex-col justify-between min-h-[120px]">
                                <div>
                                  <h3 className="font-bold text-lg text-white truncate">
                                    <span>{item.type === 'album' ? (item.title || 'Álbum') : (item.titulo || 'Lançamento')}</span>
                                  </h3>
                                  <p className="text-sm text-gray-400 truncate"><span>{item.nome_artista || 'Artista'}</span></p>
                                  <p className="text-xs text-beatwap-gold mt-1 uppercase font-bold tracking-wider">
                                    <span>{item.estilo || ''}</span>
                                  </p>
                                </div>
                                <div className="mt-2">
                                  {item.type === 'album' ? (
                                    <div className="flex flex-wrap gap-2">
                                      <AnimatedButton onClick={() => navigate(`/album/${item.id}`)}>
                                        <span>Ver Álbum</span>
                                      </AnimatedButton>
                                      {item.presave_link && (
                                        <AnimatedButton
                                          onClick={() => { 
                                            const firstTrack = item.tracks?.[0];
                                            const musicId = firstTrack?.id;
                                            const artistId = firstTrack?.artista_id || item.artista_id;
                                            if (musicId) {
                                              recordEvent({ type: 'music_click_presave', music_id: musicId, artist_id: artistId });
                                            }
                                            window.open(item.presave_link, '_blank');
                                          }}
                                        >
                                          <span>Pré-save</span>
                                        </AnimatedButton>
                                      )}
                                    </div>
                                  ) : (
                                    item.presave_link ? (
                                      <AnimatedButton onClick={() => { 
                                        recordEvent({ type: 'music_click_presave', music_id: item.id, artist_id: item.artista_id });
                                        window.open(item.presave_link, '_blank');
                                      }}>
                                        <span>Pré-save</span>
                                      </AnimatedButton>
                                    ) : (
                                      <div className="h-9" />
                                    )
                                  )}
                                  {item.type === 'single' && (
                                    <div className="mt-2">
                                      <button
                                        onClick={() => toggleMusicLike(item.id)}
                                        className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${item.liked ? 'text-red-400 bg-red-400/10 hover:bg-red-400/20' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
                                      >
                                        <Heart size={14} className={item.liked ? 'text-red-400' : 'text-gray-300'} />
                                        <span>{item.liked ? 'Curtido' : 'Curtir'}</span>
                                        <span className="ml-1">({item.likes_count || 0})</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        ))}
                        </div>
                      </div>
                      <button
                        aria-label="Anterior"
                        className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                        onClick={makeScroll(upcomingRef, -1)}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        aria-label="Próximo"
                        className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                        onClick={makeScroll(upcomingRef, 1)}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </section>
              )}
              {released.length > 0 && (
                <section className="py-14 px-4 sm:px-6 bg-black/20">
                  <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"><span>Já Lançadas</span></h2>
                      <p className="text-gray-400"><span>Ouça agora os lançamentos disponíveis</span></p>
                    </div>
                    <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
                      Arraste para o lado e veja todos
                    </div>
                    <div className="relative">
                      <div
                        ref={releasedRef}
                        className="overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 pb-2"
                      >
                        <div className="flex gap-6">
                        {released.map((item, index) => (
                          <div key={item.type === 'album' ? `album-${item.id}` : `single-${item.id}`} className="flex-none w-[280px]">
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="h-full flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-beatwap-gold transition-colors group"
                            >
                              <div
                                className="aspect-square bg-gray-800 relative overflow-hidden"
                                onClick={() => {
                                  if (item.type === 'album') {
                                    navigate(`/album/${item.id}`);
                                  } else {
                                    const url = item.preview_url || item.audio_url;
                                    togglePlay(item.id, url);
                                  }
                                }}
                              >
                                {item.type === 'album' && item.cover_url && (
                                  <img 
                                    src={item.cover_url} 
                                    alt={item.title || 'Capa'} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                  />
                                )}
                                {item.type === 'single' && (
                                <img 
                                  src={item.cover_url} 
                                  alt={item.titulo || 'Capa'} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                />
                                )}
                                {item.release_date && (() => {
                                  const [y, m, d] = item.release_date.split('-');
                                  const rDate = new Date(y, m - 1, d);
                                  return (
                                    <div className="absolute top-2 left-2 text-black text-xs font-bold px-2 py-1 rounded bg-white">
                                      <span>Lançado em {rDate.toLocaleDateString('pt-BR')}</span>
                                    </div>
                                  );
                                })()}
                                {item.is_beatwap_produced && (
                                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-beatwap-gold/50 z-10" title="Produzido, Mixado e Masterizado pela BeatWap">
                                    <BadgeCheck className="text-beatwap-gold w-5 h-5" />
                                  </div>
                                )}
                                {item.type === 'single' && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button 
                                      className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black transform scale-0 group-hover:scale-100 transition-transform duration-300 hover:bg-white"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const url = item.preview_url || item.audio_url;
                                        togglePlay(item.id, url);
                                      }}
                                    >
                                      {playingTrack === item.id && !isPaused
                                        ? <Pause fill="currentColor" className="ml-1" />
                                        : <Play fill="currentColor" className="ml-1" />}
                                    </button>
                                  </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent block sm:hidden">
                                  <div className="text-white text-sm font-bold truncate">
                                    {item.type === 'album' ? (item.title || 'Álbum') : (item.titulo || 'Lançamento')}
                                  </div>
                                  <div className="text-[11px] text-gray-300 truncate">{item.nome_artista || 'Artista'}</div>
                                  {item.presave_link && (
                                    <div className="mt-2">
                                      <AnimatedButton
                                        fullWidth
                                        className="px-3 py-2 text-xs rounded-lg"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (item.type === 'album') {
                                            const firstTrack = item.tracks?.[0];
                                            const musicId = firstTrack?.id;
                                            const artistId = firstTrack?.artista_id || item.artista_id;
                                            if (musicId) {
                                              recordEvent({ type: 'music_click_smartlink', music_id: musicId, artist_id: artistId });
                                            }
                                            window.open(item.presave_link, '_blank');
                                            return;
                                          }
                                          recordEvent({ type: 'music_click_smartlink', music_id: item.id, artist_id: item.artista_id });
                                          window.open(item.presave_link, '_blank');
                                        }}
                                      >
                                        Pré-save
                                      </AnimatedButton>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="hidden sm:flex p-4 flex-1 flex-col justify-between min-h-[120px]">
                                <div>
                                  <h3 className="font-bold text-lg text-white truncate">
                                    <span>{item.type === 'album' ? (item.title || 'Álbum') : (item.titulo || 'Lançamento')}</span>
                                  </h3>
                                  <p className="text-sm text-gray-400 truncate"><span>{item.nome_artista || 'Artista'}</span></p>
                                  <p className="text-xs text-beatwap-gold mt-1 uppercase font-bold tracking-wider"><span>{item.estilo || ''}</span></p>
                                </div>
                                <div className="mt-2">
                                  {item.type === 'album' ? (
                                    <div className="flex flex-wrap gap-2">
                                      <AnimatedButton onClick={() => navigate(`/album/${item.id}`)}>
                                        <span>Ver Álbum</span>
                                      </AnimatedButton>
                                      {item.presave_link && (
                                        <AnimatedButton
                                          onClick={() => { 
                                            const firstTrack = item.tracks?.[0];
                                            const musicId = firstTrack?.id;
                                            const artistId = firstTrack?.artista_id || item.artista_id;
                                            if (musicId) {
                                              recordEvent({ type: 'music_click_smartlink', music_id: musicId, artist_id: artistId });
                                            }
                                            window.open(item.presave_link, '_blank');
                                          }}
                                        >
                                          <span>Smartlink</span>
                                        </AnimatedButton>
                                      )}
                                    </div>
                                  ) : (
                                    <AnimatedButton onClick={() => { 
                                      if (item.presave_link) {
                                        recordEvent({ type: 'music_click_smartlink', music_id: item.id, artist_id: item.artista_id });
                                        window.open(item.presave_link, '_blank');
                                      } else {
                                        const url = item.preview_url || item.audio_url;
                                        togglePlay(item.id, url);
                                      }
                                    }}>
                                      <span>{item.presave_link ? 'Smartlink' : (playingTrack === item.id && !isPaused ? 'Pausar' : 'Reproduzir')}</span>
                                    </AnimatedButton>
                                  )}
                                  {item.type === 'single' && (
                                    <div className="mt-2">
                                      <button
                                        onClick={() => toggleMusicLike(item.id)}
                                        className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${item.liked ? 'text-red-400 bg-red-400/10 hover:bg-red-400/20' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
                                      >
                                        <Heart size={14} className={item.liked ? 'text-red-400' : 'text-gray-300'} />
                                        <span>{item.liked ? 'Curtido' : 'Curtir'}</span>
                                        <span className="ml-1">({item.likes_count || 0})</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        ))}
                        </div>
                      </div>
                      <button
                        aria-label="Anterior"
                        className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                        onClick={makeScroll(releasedRef, -1)}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        aria-label="Próximo"
                        className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                        onClick={makeScroll(releasedRef, 1)}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </>
          );
        })()}

        {/* Latest Compositions Section */}
        {latestCompositions.length > 0 && (
          <section className="py-20 px-6 bg-black/20">
            <div className="max-w-7xl mx-auto relative">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4"><span>Últimas Composições Lançadas</span></h2>
                <p className="text-gray-400"><span>Obras exclusivas de nossos compositores parceiros</span></p>
                <div className="mt-4 flex justify-center">
                  <AnimatedButton onClick={() => navigate('/composicoes')}>
                    Ver todas as composições
                  </AnimatedButton>
                </div>
              </div>

              <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
                Arraste para o lado e veja todas
              </div>

              <div ref={compositionsRef} className="flex gap-6 overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 pb-2" style={{ scrollbarWidth: 'none' }}>
                  {latestCompositions.map((comp, index) => (
                    <div key={comp.id} className="flex-none w-[280px]">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative"
                      >
                        <div 
                          className="aspect-square rounded-2xl overflow-hidden mb-4 relative shadow-lg cursor-pointer bg-gray-800"
                          onClick={() => togglePlay(comp.id, sanitizeUrl(comp.audio_url), { startSeconds: Number(comp.chorus_start_seconds ?? 0), endSeconds: Number(comp.chorus_end_seconds ?? NaN) })}
                        >
                          {comp.cover_url ? (
                            <img 
                              src={sanitizeUrl(comp.cover_url)} 
                              alt={comp.title} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                              <Music size={40} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black transform scale-0 group-hover:scale-100 transition-transform duration-300 hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlay(comp.id, sanitizeUrl(comp.audio_url), { startSeconds: Number(comp.chorus_start_seconds ?? 0), endSeconds: Number(comp.chorus_end_seconds ?? NaN) });
                              }}
                            >
                              {playingTrack === comp.id && !isPaused
                                ? <Pause fill="currentColor" className="ml-1" />
                                : <Play fill="currentColor" className="ml-1" />}
                            </button>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent block sm:hidden">
                            <div className="text-white text-sm font-bold truncate">{comp.title}</div>
                            <div className="text-[12px] text-white font-extrabold truncate">{comp.composer_name || 'Autor'}</div>
                            {getOtherComposerNames(comp).length > 0 && (
                              <div className="text-[11px] text-gray-400 truncate">{getOtherComposerNames(comp).slice(0, 3).join(' • ')}</div>
                            )}
                            {Array.isArray(comp.hashtags) && comp.hashtags.length > 0 && (
                              <div className="text-[11px] text-gray-300 truncate">{comp.hashtags.slice(0, 4).join(' ')}</div>
                            )}
                          </div>
                        </div>
                        <h3 className="font-bold text-lg truncate"><span>{comp.title}</span></h3>
                        <p className="text-base text-white font-extrabold truncate"><span>{comp.composer_name || 'Autor'}</span></p>
                        {getOtherComposerNames(comp).length > 0 && (
                          <p className="text-xs text-gray-500 truncate"><span>{getOtherComposerNames(comp).slice(0, 3).join(' • ')}</span></p>
                        )}
                        <p className="text-xs text-beatwap-gold mt-1 uppercase font-bold tracking-wider"><span>{comp.genre || 'Gênero'}</span></p>
                        {Array.isArray(comp.hashtags) && comp.hashtags.length > 0 && (
                          <p className="text-[11px] text-gray-400 mt-1 truncate"><span>{comp.hashtags.slice(0, 6).join(' ')}</span></p>
                        )}
                        {Number.isFinite(Number(comp.price)) && (
                          <div className="text-xs text-beatwap-gold mt-1 font-bold">R$ {comp.price}</div>
                        )}
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCompositionLike(comp.id); }}
                              className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-colors ${comp.liked ? 'text-red-400 bg-red-400/10 hover:bg-red-400/20' : 'text-gray-300 bg-white/5 hover:bg-white/10'}`}
                            >
                              <Heart size={14} className={comp.liked ? 'text-red-400' : 'text-gray-300'} />
                              <span>{comp.liked ? 'Curtido' : 'Curtir'}</span>
                              <span className="ml-1">({comp.likes_count || 0})</span>
                            </button>
                          </div>
                          {((comp.description && String(comp.description).trim() !== '') || (comp.lyrics && String(comp.lyrics).trim() !== '')) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenDescriptionId(comp.id); }}
                              className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-400/10 px-3 py-2 rounded-lg hover:bg-blue-400/20 transition-colors w-full justify-center"
                            >
                              <Info size={14} />
                              <span>Detalhes</span>
                            </button>
                          )}
                          {comp.composer_phone ? (
                            <>
                              <div className="text-xs text-gray-400 text-center">
                                {formatWhatsAppPhone(comp.composer_phone) || 'WhatsApp não informado'}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const href = buildWhatsAppHref(comp.composer_phone, comp.title);
                                  if (!href) return;
                                  window.open(href, '_blank');
                                }}
                                className="mt-2 flex items-center gap-2 text-xs font-bold text-green-400 bg-green-400/10 px-3 py-2 rounded-lg hover:bg-green-400/20 transition-colors w-full justify-center"
                              >
                                <MessageCircle size={14} />
                                <span>Chamar no WhatsApp</span>
                              </button>
                            </>
                          ) : (
                            <div className="text-xs text-gray-500 text-center">WhatsApp não informado</div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  ))}
              </div>
              <button
                aria-label="Anterior"
                className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 -ml-1 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                onClick={makeScroll(compositionsRef, -1)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                aria-label="Próximo"
                className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 -mr-1 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                onClick={makeScroll(compositionsRef, 1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </section>
        )}

        {openDescriptionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
            <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white font-bold">Detalhes da composição</div>
                <button
                  className="w-9 h-9 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-black"
                  onClick={() => setOpenDescriptionId(null)}
                >
                  <X size={18} />
                </button>
              </div>
              {(() => {
                const c = latestCompositions.find((x) => x.id === openDescriptionId);
                const desc = c?.description ? String(c.description).trim() : '';
                const lyr = c?.lyrics ? String(c.lyrics).trim() : '';
                return (
                  <div className="space-y-4">
                    {desc && (
                      <div>
                        <div className="text-xs font-bold text-gray-400 mb-1">Descrição</div>
                        <div className="text-gray-300 whitespace-pre-wrap text-sm">{desc}</div>
                      </div>
                    )}
                    {lyr && (
                      <div>
                        <div className="text-xs font-bold text-gray-400 mb-1">Letra</div>
                        <div className="text-gray-300 whitespace-pre-wrap text-sm max-h-[45vh] overflow-auto pr-1">{lyr}</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
        {/* Latest Producer Video Projects */}
        {latestProjects.length > 0 && (
          <section className="py-16 px-4 sm:px-6 bg-black/25">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4"><span>Últimos Projetos de Vídeos Feitos</span></h2>
                <p className="text-gray-400"><span>Conteúdos recentes publicados pela produtora</span></p>
              </div>
              <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
                Arraste para o lado e veja todos
              </div>
              <div className="overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 scroll-pl-4 scroll-pr-4 sm:scroll-pl-14 sm:scroll-pr-14 md:scroll-pl-16 md:scroll-pr-16 pb-2 no-scrollbar snap-x snap-mandatory">
                <div className="flex gap-4 sm:gap-6 justify-start">
                  {latestProjects.map((p, index) => (
                    <div key={p.id} className="flex-none w-[240px] sm:w-[280px] snap-start">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative rounded-2xl overflow-hidden border-2 border-beatwap-gold/80 bg-gradient-to-b from-beatwap-gold/10 via-white/5 to-black/30 shadow-[0_0_0_1px_rgba(245,197,66,0.35),0_0_30px_rgba(245,197,66,0.22)] hover:border-beatwap-gold hover:shadow-[0_0_0_1px_rgba(245,197,66,0.55),0_0_40px_rgba(245,197,66,0.32)] transition-shadow"
                      >
                        <div className="aspect-video bg-gray-800 relative overflow-hidden">
                          {(() => {
                            const rawUrl = sanitizeUrl(p.url || '');
                            const rawCover = sanitizeUrl(p.cover_url || '');
                            const isYT = ((p.platform || '').toLowerCase() === 'youtube') || /youtu\.be|youtube\.com/.test(rawUrl);
                            const vid = isYT ? getYoutubeId(rawUrl) : null;
                            const isFileVideo = !isYT && isVideoUrl(rawUrl);
                            const thumb = isYT && vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : (rawCover || null);
                            if (activeProjectVideo === p.id) {
                              if (isYT && vid) {
                                return (
                                  <iframe
                                    title={p.title}
                                    src={`https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                                    className="absolute inset-0 w-full h-full"
                                    allow="autoplay; encrypted-media; picture-in-picture"
                                    allowFullScreen
                                  />
                                );
                              }
                              if (isFileVideo) {
                                return (
                                  <video
                                    className="absolute inset-0 w-full h-full"
                                    src={rawUrl}
                                    poster={rawCover || undefined}
                                    controls
                                    autoPlay
                                    playsInline
                                  />
                                );
                              }
                            }
                            return thumb
                              ? <img src={thumb} alt={p.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm"><span>{p.platform || 'Projeto'}</span></div>;
                          })()}
                          {activeProjectVideo !== p.id ? (
                            <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                className="px-4 py-2 bg-beatwap-gold rounded-full text-black font-bold hover:bg-white"
                                onClick={() => {
                                  const rawUrl = sanitizeUrl(p.url || '');
                                  const isYT = ((p.platform || '').toLowerCase() === 'youtube') || /youtu\.be|youtube\.com/.test(rawUrl);
                                  const isFileVideo = !isYT && isVideoUrl(rawUrl);
                                  if (isFileVideo) {
                                    setFileVideoUrl(rawUrl);
                                  } else {
                                    setActiveProjectVideo(p.id);
                                  }
                                }}
                              >
                                <span>Assistir</span>
                              </button>
                            </div>
                          ) : (
                            <div className="absolute top-2 right-2 z-10">
                              <button
                                className="w-9 h-9 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-black"
                                onClick={() => setActiveProjectVideo(null)}
                                aria-label="Fechar"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent block sm:hidden">
                            <div className="text-white text-sm font-bold truncate">{p.title}</div>
                            <div className="text-[11px] text-gray-300 truncate">{p.platform || 'Projeto'}</div>
                          </div>
                        </div>
                        <div className="hidden sm:block p-4">
                          <h3 className="font-bold text-lg truncate"><span>{p.title}</span></h3>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {fileVideoUrl && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="relative">
              <button
                className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white hover:bg-black"
                onClick={() => setFileVideoUrl(null)}
              >
                <X size={18} />
              </button>
              <video
                src={fileVideoUrl}
                className="max-w-[90vw] max-h-[85vh] w-auto h-auto border-2 border-beatwap-gold rounded-xl"
                controls
                autoPlay
                playsInline
              />
            </div>
          </div>
        )}

        

        {/* Composers Section */}
        {composers.length > 0 && (
          <section className="py-20 px-6 bg-black/20">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4"><span>Compositores Parceiros</span></h2>
                <p className="text-gray-400"><span>Profissionais disponíveis para suas produções</span></p>
              </div>
              <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
                Arraste para o lado e veja todos
              </div>
              <div className="relative -mx-6">
                <div ref={composersRef} className="overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 scroll-pl-4 scroll-pr-4 sm:scroll-pl-14 sm:scroll-pr-14 md:scroll-pl-16 md:scroll-pr-16 pb-2 no-scrollbar snap-x snap-mandatory">
                  <div className="flex gap-6 justify-center md:justify-start">
                  {composers.map((composer, index) => {
                    const isVerified = composer?.verified === true || composer?.access_control?.verified === true;
                    const featured = composer?.access_control?.featured && typeof composer.access_control.featured === 'object' ? composer.access_control.featured : null;
                    const isFeatured = isFeaturedActive(composer);
                    const featuredLevel = String(featured?.level || '').toLowerCase();
                    const featuredLabel = featuredLevel === 'top' ? 'Destaque Top' : featuredLevel === 'pro' ? 'Destaque Pro' : featuredLevel === 'basic' ? 'Destaque' : 'Destaque';
                    const featuredTint =
                      featuredLevel === 'top'
                        ? 'from-beatwap-gold/30 via-yellow-400/20 to-transparent'
                        : featuredLevel === 'pro'
                          ? 'from-purple-500/30 via-pink-500/20 to-transparent'
                          : 'from-beatwap-gold/20 via-beatwap-gold/10 to-transparent';
                    const featuredBorder =
                      featuredLevel === 'top'
                        ? 'border-beatwap-gold shadow-[0_0_0_1px_rgba(255,200,0,0.25),0_0_30px_rgba(255,200,0,0.18)]'
                        : featuredLevel === 'pro'
                          ? 'border-purple-400/60 shadow-[0_0_0_1px_rgba(168,85,247,0.22),0_0_30px_rgba(168,85,247,0.14)]'
                          : 'border-beatwap-gold/70 shadow-[0_0_0_1px_rgba(255,200,0,0.18),0_0_24px_rgba(255,200,0,0.10)]';

                    return (
                      <div key={composer.id} className="flex-none w-[280px] snap-center">
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`group bg-white/5 border rounded-xl overflow-hidden cursor-pointer transition-colors relative ${
                            isFeatured ? featuredBorder : (isVerified ? 'border-beatwap-gold' : 'border-white/10 hover:border-beatwap-gold')
                          }`}
                          onClick={() => navigate(`/profile/${composer.id}`)}
                        >
                          {isFeatured && (
                            <>
                              <motion.div
                                aria-hidden="true"
                                className="absolute -inset-2 rounded-[18px] pointer-events-none"
                                style={{ background: 'transparent' }}
                                animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.02, 1] }}
                                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                              >
                                <div className={`absolute inset-0 rounded-[18px] bg-gradient-to-r ${featuredTint}`} />
                              </motion.div>
                              <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-full text-[10px] font-extrabold bg-black/70 border border-white/10 text-white">
                                {featuredLabel}
                              </div>
                            </>
                          )}
                        <div className="aspect-square bg-gray-800 relative overflow-hidden">
                          {composer.avatar_url ? (
                            <img 
                              src={composer.avatar_url} 
                              alt={composer.nome || composer.name || 'Compositor'} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                              <User size={64} className="text-white/20" />
                            </div>
                          )}
                          {isVerified && (
                            <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 border border-beatwap-gold flex items-center justify-center">
                              <BadgeCheck size={18} className="text-beatwap-gold" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 sm:p-4">
                            <div className="w-full">
                              <div className="text-white text-base sm:text-sm font-bold leading-snug">{composer.nome || composer.name || 'Compositor'}</div>
                              <div className="text-xs sm:text-[11px] text-gray-300 flex items-center gap-2">
                                <span>Compositor</span>
                                <span className="hidden sm:flex items-center gap-1 text-beatwap-gold">
                                  <Info size={14} /> <span>Ver Perfil</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        </motion.div>
                      </div>
                    );
                  })}
                  </div>
                </div>
                <button
                  aria-label="Anterior"
                  className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                  onClick={makeScroll(composersRef, -1)}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  aria-label="Próximo"
                  className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                  onClick={makeScroll(composersRef, 1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Duplicate removed */}

        {/* Sellers Section moved to FeaturedUsers */}

        {/* Sponsors CTA */}
        <section className="py-12 px-6 bg-black/20">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <AnimatedButton onClick={() => window.open('https://wa.me/?text=Quero%20ser%20patrocinador%20BeatWap', '_blank')}>
              Seja nosso patrocinador
            </AnimatedButton>
          </div>
        </section>

        {/* Sponsors Section */}
        {sponsors.length > 0 && (
          <section className="py-20 px-6 bg-black/25">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-words leading-snug">Patrocinadores/Parcerias</h2>
                <p className="text-gray-400">Marcas que apoiam nossos artistas e projetos</p>
              </div>
              <div className="text-xs text-gray-400 mb-2 px-4 md:hidden text-center">
                Arraste para o lado e veja todas as marcas
              </div>
              <div className="relative -mx-6">
                <div ref={sponsorsRef} className="overflow-x-auto scroll-smooth whitespace-nowrap px-6 pb-2">
                  <div className="flex gap-6 justify-center md:justify-start">
                    {sponsors.map((s, index) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex-none w-[280px]"
                      >
                        <div
                          className="group relative w-full aspect-square rounded-xl overflow-hidden bg-gray-800 border-2 border-black flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-lg"
                          onClick={() => setActiveSponsorMenu(activeSponsorMenu === s.id ? null : s.id)}
                        >
                          {s.logo_url ? (
                            <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-sm">Sem logo</div>
                          )}
                          <div className={`absolute inset-0 rounded-xl bg-black/40 opacity-0 transition-opacity flex items-center justify-center ${activeSponsorMenu === s.id ? 'opacity-100' : 'group-hover:opacity-100'}`}>
                            <div className="flex items-center gap-4">
                              {s.instagram_url && (
                                <button
                                  className="p-2 rounded-full bg-beatwap-gold text-black hover:bg-white transition-colors"
                                  onClick={(e) => { e.stopPropagation(); recordEvent({ type: 'sponsor_click', sponsor_id: s.id }); window.open(s.instagram_url, '_blank'); }}
                                  aria-label="Instagram"
                                >
                                  <Instagram size={18} />
                                </button>
                              )}
                              {s.site_url && (
                                <button
                                  className="p-2 rounded-full bg-beatwap-gold text-black hover:bg-white transition-colors"
                                  onClick={(e) => { e.stopPropagation(); recordEvent({ type: 'sponsor_click', sponsor_id: s.id }); window.open(s.site_url, '_blank'); }}
                                  aria-label="Site"
                                >
                                  <Globe size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <button
                  aria-label="Anterior"
                  className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                  onClick={makeScroll(sponsorsRef, -1)}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  aria-label="Próximo"
                  className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                  onClick={makeScroll(sponsorsRef, 1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </section>
        )}

        <FeaturedUsers artists={artists} producers={producers} sellers={sellers} />

        {(() => {
          const fp = featuredPlans && typeof featuredPlans === 'object' ? featuredPlans : null;
          const plans = fp?.plans && typeof fp.plans === 'object' ? fp.plans : {
            basic: { level: 'basic', label: 'Destaque Básico', price: 10, duration_hours: 24 },
            pro: { level: 'pro', label: 'Destaque Pro', price: 25, duration_hours: 72 },
            top: { level: 'top', label: 'Destaque Top', price: 50, duration_hours: 168 }
          };
          const cta = String(fp?.cta || 'Apareça primeiro e aumente suas chances de ser descoberto');
          const order = ['basic', 'pro', 'top'];
          return (
            <section id="destaque-pago" className="py-16 px-6 bg-black/25 border-y border-white/5">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                    <span>💰 Destaque Pago</span>
                  </h2>
                  <p className="text-gray-300 max-w-3xl mx-auto">
                    <span>{cta}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {order.map((key) => {
                    const p = plans?.[key] || {};
                    const level = String(p.level || key);
                    const label = String(p.label || key);
                    const price = Number(p.price) || 0;
                    const hours = Number(p.duration_hours) || 0;
                    const days = hours >= 24 ? Math.round(hours / 24) : 0;
                    const durationText = hours === 24 ? '24 horas' : (days ? `${days} dias` : `${hours} horas`);
                    const accent =
                      level === 'top'
                        ? 'border-beatwap-gold/60 hover:border-beatwap-gold'
                        : level === 'pro'
                          ? 'border-purple-400/40 hover:border-purple-400/70'
                          : 'border-white/10 hover:border-beatwap-gold/50';
                    const badge =
                      level === 'top'
                        ? 'MÁXIMA EXPOSIÇÃO'
                        : level === 'pro'
                          ? 'MAIS VISIBILIDADE'
                          : 'APAREÇA ACIMA';

                    return (
                      <div key={key} className={`bg-white/5 border ${accent} rounded-2xl p-6 transition-colors`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-extrabold text-white">{label}</div>
                          <div className="text-[10px] font-bold text-black bg-beatwap-gold px-2 py-1 rounded-full">{badge}</div>
                        </div>
                        <div className="text-3xl font-extrabold text-white mb-2">R$ {price}</div>
                        <div className="text-xs text-gray-400 mb-4">Duração: {durationText}</div>
                        <ul className="space-y-2 text-sm text-gray-300 mb-6">
                          <li>Aparece primeiro</li>
                          <li>Mais visualizações</li>
                          <li>Mais chances de clique</li>
                        </ul>
                        <AnimatedButton
                          className="w-full bg-beatwap-gold text-black hover:bg-white"
                          onClick={() => {
                            const email = user?.email ? ` Email: ${user.email}` : '';
                            const msg = `Olá! Quero impulsionar meu perfil com ${label} (R$ ${price}).${email}`;
                            window.open(`https://wa.me/5519981083497?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                        >
                          Impulsionar Perfil
                        </AnimatedButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })()}

        {hitWinner ? (
          <section id="hit-ganhador-da-semana" className="py-16 px-6 bg-black/30 border-b border-white/5">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                  <span>🏆 Hit Ganhador da Semana</span>
                </h2>
                <p className="text-gray-300 max-w-3xl mx-auto">
                  <span>O ganhador fica em evidência até o próximo vencer.</span>
                </p>
              </div>

              <div className="max-w-3xl mx-auto rounded-2xl border border-beatwap-gold/30 bg-white/5 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/30 border border-white/10 shrink-0">
                    {hitWinner?.cover_url ? (
                      <img src={hitWinner.cover_url} alt={hitWinner.title || 'Capa'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <Music size={20} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-300 mb-1">
                      Tema: <span className="text-white font-bold">{hitOfWeek?.theme || 'Hit da Semana BeatWap'}</span>
                    </div>
                    <div className="text-xl font-extrabold text-white truncate">{hitWinner?.title || 'Música vencedora'}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {hitWinner?.composer_name ? `por ${hitWinner.composer_name}` : 'por Compositor'}
                    </div>
                    <div className="mt-2 text-xs text-gray-300">
                      <span className="text-beatwap-gold font-extrabold">{Number(hitWinner?.votes_count || 0)}</span> votos
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => togglePlay(hitWinner?.entry_id || 'hit_winner', sanitizeUrl(hitWinner?.audio_url || hitWinner?.url), { full: true })}
                        className="px-4 py-2 rounded-xl bg-beatwap-gold text-black hover:bg-white transition-colors text-sm font-bold flex items-center gap-2"
                        disabled={!sanitizeUrl(hitWinner?.audio_url || hitWinner?.url)}
                      >
                        <Play size={16} />
                        Ouvir completo
                      </button>
                      <a
                        href={sanitizeUrl(hitWinner?.audio_url || hitWinner?.url) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm ${sanitizeUrl(hitWinner?.audio_url || hitWinner?.url) ? 'text-gray-300 hover:text-white' : 'text-gray-600'} underline-offset-2 hover:underline`}
                        onClick={(ev) => { if (!sanitizeUrl(hitWinner?.audio_url || hitWinner?.url)) ev.preventDefault(); }}
                      >
                        Abrir link
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section id="hit-da-semana" className="py-16 px-6 bg-gradient-to-b from-black/10 to-black/40 border-b border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
                <span>🔥 Hit da Semana BeatWap</span>
              </h2>
              <p className="text-gray-300 max-w-3xl mx-auto">
                <span>{hitOfWeek?.home_subtitle || 'Sua música pode ser a próxima a estourar'}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-sm text-gray-300 mb-2">
                  Tema da semana: <span className="text-white font-bold">{hitOfWeek?.theme || 'Hit da Semana BeatWap'}</span>
                </div>
                <div className="text-sm text-gray-300 mb-4">
                  Taxa: <span className="text-beatwap-gold font-extrabold">R$ {Number(hitOfWeek?.entry_fee) || 10}</span> por participação
                </div>
                <ul className="space-y-2 text-sm text-gray-300 mb-6">
                  <li>🏆 Música destaque da semana</li>
                  <li>🎧 Divulgação na plataforma</li>
                  <li>🎤 Chance de produção</li>
                  <li>📲 Divulgação no Instagram</li>
                </ul>

                <div className="space-y-3">
                  <div className="text-xs text-gray-400">
                    Inscrições aprovadas para votação: {Array.isArray(hitEntries) ? hitEntries.length : 0}
                  </div>
                  <AnimatedButton
                    className="w-full bg-beatwap-gold text-black hover:bg-white"
                    onClick={() => navigate(user ? '/dashboard/compositions' : '/login')}
                  >
                    {user ? 'Participar pelo Painel' : 'Entrar para Participar'}
                  </AnimatedButton>
                  <div className="text-xs text-gray-400">
                    {hitOfWeek?.home_helper_text || 'Para participar, envie uma nova composição no seu painel e marque "Participar do Hit da Semana".'}
                  </div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                <div className="text-sm font-extrabold text-white mb-3">Como funciona</div>
                <ul className="space-y-2 text-sm text-gray-300 mb-6">
                  <li>Toda semana um novo tema</li>
                  <li>Você envia pelo painel (precisa de conta e 1 crédito de Hit da Semana)</li>
                  <li>O produtor aprova a inscrição</li>
                  <li>Depois, a música aparece na Home para votação</li>
                  <li>A mais votada vence o concurso</li>
                </ul>

                <div className="text-sm font-extrabold text-white mb-3">Ideias de tema</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {(Array.isArray(hitOfWeek?.theme_ideas) && hitOfWeek.theme_ideas.length
                    ? hitOfWeek.theme_ideas
                    : ['Sofrência que dói', 'Música de bar', 'Pisadinha apaixonada', 'Refrão chiclete', 'História de traição']
                  ).map((t) => (
                    <span key={t} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="text-lg sm:text-xl font-extrabold text-white">Composições do Hit da Semana</div>
                <button
                  type="button"
                  onClick={fetchHitEntries}
                  className="text-xs text-gray-300 hover:text-white px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  Atualizar
                </button>
              </div>

              {(() => {
                const endsMs = hitOfWeek?.ends_at ? new Date(String(hitOfWeek.ends_at)).getTime() : null;
                const ended = Number.isFinite(endsMs) && endsMs && Date.now() > endsMs;
                if (ended && hitWinner) {
                  return (
                    <div className="p-6 rounded-2xl border border-white/10 bg-black/20 text-gray-300">
                      Votação encerrada. Veja o ganhador na seção &quot;Hit Ganhador da Semana&quot;.
                    </div>
                  );
                }
                if (!Array.isArray(hitEntries) || hitEntries.length === 0) {
                  return (
                    <div className="p-6 rounded-2xl border border-white/10 bg-black/20 text-gray-400">
                      Nenhuma composição aprovada para votação ainda. Aguarde a aprovação do produtor.
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {hitEntries.slice(0, 10).map((e, idx) => {
                      const url = sanitizeUrl(e?.audio_url || e?.url);
                      const isPlaying = playingTrack === e.id && !isPaused;
                      const voted = e?.voted === true;
                      const highlighted = highlightedHitEntryId && String(highlightedHitEntryId) === String(e.id);
                      const cardBorder = highlighted ? 'border-beatwap-gold/60 shadow-[0_0_0_1px_rgba(245,197,66,0.25)]' : 'border-white/10';
                      return (
                        <div key={e.id} className={`rounded-2xl border ${cardBorder} bg-white/5 p-4 flex flex-col sm:flex-row gap-4`}>
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/30 border border-white/10 shrink-0">
                            {e?.cover_url ? (
                              <img src={e.cover_url} alt={e.title || 'Capa'} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <Music size={18} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold text-white truncate">
                                  {idx + 1}º • {e?.title || 'Música'}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                  {e?.composer_name ? `por ${e.composer_name}` : 'por Compositor'}
                                </div>
                              </div>
                              <div className="text-xs text-gray-300">
                                <span className="text-beatwap-gold font-extrabold">{Number(e?.votes_count || 0)}</span> votos
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => togglePlay(e.id, url, { full: true })}
                                className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 hover:bg-black/40 transition-colors text-sm font-bold flex items-center gap-2 flex-1 sm:flex-none justify-center"
                                disabled={!url}
                              >
                                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                {isPlaying ? 'Pausar' : 'Ouvir'}
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleHitVote(e.id)}
                                disabled={hitVotingId === e.id || voted}
                                className={`px-3 py-2 rounded-xl border transition-colors text-sm font-bold flex items-center gap-2 flex-1 sm:flex-none justify-center ${
                                  voted ? 'bg-beatwap-gold text-black border-beatwap-gold' : 'bg-black/30 border-white/10 hover:bg-black/40 text-gray-200'
                                }`}
                              >
                                <Heart size={16} />
                                {voted ? 'Votado' : (hitVotingId === e.id ? 'Votando...' : 'Votar')}
                              </button>

                              <button
                                type="button"
                                onClick={() => shareHitEntry(e)}
                                className="px-3 py-2 rounded-xl bg-black/30 border border-white/10 hover:bg-black/40 transition-colors text-sm font-bold flex items-center gap-2 text-gray-200 flex-1 sm:flex-none justify-center"
                              >
                                <Share2 size={16} />
                                Compartilhar
                              </button>

                              <a
                                href={url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full sm:w-auto sm:ml-auto text-xs ${url ? 'text-gray-300 hover:text-white' : 'text-gray-600'} underline-offset-2 hover:underline`}
                                onClick={(ev) => { if (!url) ev.preventDefault(); }}
                              >
                                Abrir link
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
        <HowItWorks />
        <Benefits />
        <ShowProduction />
        <Transparency />
        <Pricing />
        <SpecialOffer />
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h4 className="text-beatwap-gold font-extrabold text-3xl md:text-4xl mb-8 text-center animate-gold-fade">Redes Sociais</h4>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://www.instagram.com/beatwap?igsh=eDZ4a3lvN3ZqOWNy"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-beatwap-gold hover:text-black transition-all"
                title="Instagram"
                aria-label="Instagram BeatWap"
              >
                <Instagram size={22} />
              </a>
              <a
                href="https://www.youtube.com/@beatwap019"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-all"
                title="YouTube"
                aria-label="YouTube BeatWap"
              >
                <Youtube size={22} />
              </a>
              <a
                href="https://www.tiktok.com/@beatmusichits?_r=1&_t=ZS-92pn4DAMEw1"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#00f2ea] hover:text-black transition-all"
                title="TikTok"
                aria-label="TikTok BeatWap"
              >
                <Video size={22} />
              </a>
            </div>
          </div>
        </section>
        <Contact />
        {sponsors.length > 0 && (
          <section className="bg-black border-t border-white/10 py-4">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {sponsors.map((s) => (
                  <div
                    key={s.id}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden"
                    title={s.name}
                  >
                    {s.logo_url ? (
                      <img
                        src={s.logo_url}
                        alt={s.name}
                        className="max-w-[80%] max-h-[80%] object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400">Marca</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Home;
