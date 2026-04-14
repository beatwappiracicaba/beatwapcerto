import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/Card';
import { apiClient } from '../services/apiClient';

export const BoostedProfilesStories = ({ limit = 16, className = '' }) => {
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
      <Card className={`p-3 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="text-sm font-bold text-white">Impulsionados</div>
          <div className="text-xs text-gray-400">Perfis em destaque</div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 bw-stories-scroll">
          {items.map((p) => {
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
  }, [className, error, items, loading, navigate, sanitizeUrl]);

  return content;
};
