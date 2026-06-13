import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/Card';
import { apiClient } from '../services/apiClient';
import { ArrowUpRight, BadgeCheck, Sparkles } from 'lucide-react';

export const BoostedProfilesStories = ({
  limit = 16,
  className = '',
  title = 'Impulsionados',
  description = 'Perfis em destaque visiveis para toda a plataforma'
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const loadingRef = useRef(false);

  const sanitizeUrl = useCallback((raw) => {
    const v = String(raw || '').trim();
    if (!v) return '';
    if (v.startsWith('data:')) return v;
    if (/^https?:\/\//i.test(v)) return v;
    return v;
  }, []);

  const roleLabel = useCallback((cargo) => {
    const x = String(cargo || '').trim().toLowerCase();
    if (x === 'artista') return 'Artista';
    if (x === 'compositor') return 'Compositor';
    if (x === 'produtor') return 'Produtor';
    if (x === 'vendedor') return 'Vendedor';
    return 'Perfil';
  }, []);

  const featuredLabel = useCallback((row) => {
    const level = String(row?.access_control?.featured?.level || '').toLowerCase();
    if (level === 'top') return 'Destaque Top';
    if (level === 'pro') return 'Destaque Pro';
    if (level === 'basic') return 'Destaque';
    return 'Impulsionado';
  }, []);

  const featuredTone = useCallback((row) => {
    const level = String(row?.access_control?.featured?.level || '').toLowerCase();
    if (level === 'top') return 'border-beatwap-gold/40 bg-beatwap-gold/10 text-beatwap-gold';
    if (level === 'pro') return 'border-purple-400/30 bg-purple-500/10 text-purple-200';
    return 'border-white/10 bg-white/5 text-white';
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

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get('/boosted-profiles', { cache: true, cacheTtlMs: 15000 });
        const list = Array.isArray(data) ? data : [];
        const cleaned = list
          .map((p) => ({
            id: String(p?.id || '').trim(),
            nome: p?.nome || p?.nome_completo_razao_social || p?.email || 'Usuário',
            avatar_url: p?.avatar_url || null,
            cargo: p?.cargo || '',
            verified: p?.verified === true || p?.access_control?.verified === true,
            access_control: p?.access_control || null,
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

        if (!cancelled) setItems(cleaned.slice(0, Math.max(0, Number(limit) || 0)));
      } catch {
        if (!cancelled) {
          setItems([]);
          setError('Falha ao carregar perfis impulsionados');
        }
      } finally {
        if (!cancelled) setLoading(false);
        loadingRef.current = false;
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [featuredWeight, isFeaturedActive, isVisibleOnHome, limit]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <Card className={`p-4 ${className}`}>
          <div className="text-sm text-gray-400">Carregando impulsionados...</div>
        </Card>
      );
    }
    if (error) {
      return (
        <Card className={`p-4 ${className}`}>
          <div className="text-sm text-red-400">{error}</div>
        </Card>
      );
    }
    if (!items || items.length === 0) return null;
    return (
      <Card className={`p-4 md:p-5 border border-beatwap-gold/15 bg-[linear-gradient(135deg,rgba(245,197,66,0.12),rgba(255,255,255,0.03),rgba(0,0,0,0.24))] shadow-[0_0_30px_rgba(245,197,66,0.08)] ${className}`}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-beatwap-gold/25 bg-beatwap-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.26em] text-beatwap-gold">
              <Sparkles size={12} />
              Impulsionamento
            </div>
            <div className="text-lg md:text-xl font-extrabold text-white mt-3">{title}</div>
            <div className="text-sm text-gray-300 mt-1">{description}</div>
          </div>
          <div className="text-xs text-gray-400">{items.length} perfis em vitrine</div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 bw-stories-scroll">
          {items.map((p) => {
            const name = String(p?.nome || 'Usuário');
            const initial = name.trim() ? name.trim()[0].toUpperCase() : 'U';
            return (
              <div key={p.id} className="shrink-0 w-[220px] sm:w-[236px]">
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${p.id}`)}
                  className="h-full w-full rounded-3xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-beatwap-gold/40 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  aria-label={`Ver perfil de ${name}`}
                >
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="bw-story-ring shrink-0">
                        <div className="bw-story-avatar bw-protect">
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-bold leading-tight text-white break-words">{name}</div>
                            <div className="text-[11px] text-gray-400 mt-1">{roleLabel(p.cargo)}</div>
                          </div>
                          <ArrowUpRight size={14} className="text-gray-500 shrink-0 mt-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${featuredTone(p)}`}>
                        {featuredLabel(p)}
                      </span>
                      {p.verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                          <BadgeCheck size={10} className="text-beatwap-gold" />
                          Verificado
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }, [className, description, error, featuredLabel, featuredTone, items, loading, navigate, roleLabel, sanitizeUrl, title]);

  return content;
};
