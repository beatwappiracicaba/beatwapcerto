import { useEffect, useState } from 'react';
import { X, Search, Loader } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

/**
 * Nova conversa: busca usuarios reais do sistema e abre a conversa direta.
 * Nao cria usuario nem dado ficticio: a lista vem de /profiles.
 */
export const NewConversationModal = ({ open, onClose, onPick, meId }) => {
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!open) { setBusca(''); setLista([]); setErro(''); return; }
    let vivo = true;
    setCarregando(true);
    apiClient.get('/profiles', { cache: false })
      .then((r) => {
        if (!vivo) return;
        const arr = Array.isArray(r) ? r : (r?.profiles || []);
        setLista(arr.filter((p) => p?.id && String(p.id) !== String(meId)));
      })
      .catch((e) => { if (vivo) setErro(e?.message || 'Falha ao carregar contatos'); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [open, meId]);

  const termo = busca.trim().toLowerCase();
  const filtrados = termo
    ? lista.filter((p) => {
      const nome = String(p?.nome || '').toLowerCase();
      const social = String(p?.social_username || '').toLowerCase();
      const email = String(p?.email || '').toLowerCase();
      return nome.includes(termo) || social.includes(termo) || email.includes(termo) || String(p?.id) === termo;
    })
    : lista;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Fechar" className="absolute inset-0 h-full w-full cursor-default bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nova conversa"
        className="relative flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#101010] sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-bold text-white">Nova conversa</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/5 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="shrink-0 px-4 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar pessoa"
              aria-label="Pesquisar pessoa"
              className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-beatwap-gold/50"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader size={15} className="animate-spin" /> Carregando contatos...
            </div>
          ) : erro ? (
            <div className="py-10 text-center text-sm text-red-400">{erro}</div>
          ) : filtrados.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Não encontramos ninguém.
            </div>
          ) : (
            filtrados.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onPick(String(p.id)); onClose(); }}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-white/5"
              >
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/30">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                      {String(p.nome || 'U').trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{p.nome}</span>
                  {p.social_username && (
                    <span className="block truncate text-xs text-beatwap-gold">@{p.social_username}</span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
