import { useEffect, useRef, useState } from 'react';
import { AtSign, Check, AlertCircle, X, Info, Image as ImageIcon, User as UserIcon, Briefcase } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

/**
 * Edicao do Perfil Social do Feed.
 *
 * Edita apenas o que pertence ao ambiente social: @username e bio social.
 * Foto, nome e cargo aparecem somente para leitura, com aviso de que sao
 * gerenciados no perfil principal do BeatWap.
 */
export const FeedSocialEditModal = ({ open, onClose, profile, onSaved }) => {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [check, setCheck] = useState({ state: 'idle', message: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setUsername(profile?.social_username || '');
    setBio(profile?.social_bio || '');
    setCheck({ state: 'idle', message: '' });
    setError('');
  }, [open, profile?.social_username, profile?.social_bio]);

  // Verificacao com debounce: nao consulta a cada tecla.
  useEffect(() => {
    if (!open) return undefined;
    clearTimeout(debounceRef.current);

    const bruto = String(username || '').trim();
    if (!bruto) {
      setCheck({ state: 'idle', message: 'Deixe vazio para remover o seu @.' });
      return undefined;
    }
    if (/\s/.test(bruto)) {
      setCheck({ state: 'erro', message: 'O @ não pode conter espaços.' });
      return undefined;
    }
    if (bruto.length < 3) {
      setCheck({ state: 'erro', message: 'Mínimo de 3 caracteres.' });
      return undefined;
    }
    if (bruto.length > 24) {
      setCheck({ state: 'erro', message: 'Máximo de 24 caracteres.' });
      return undefined;
    }
    if (!/^[a-z0-9._]+$/i.test(bruto)) {
      setCheck({ state: 'erro', message: 'Use apenas letras, números, ponto e underscore.' });
      return undefined;
    }

    setCheck({ state: 'verificando', message: 'Verificando...' });
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await apiClient.get(`/feed/social/username-available?username=${encodeURIComponent(bruto)}`);
        if (r?.available) setCheck({ state: 'ok', message: 'Username disponível' });
        else setCheck({ state: 'erro', message: r?.error || 'Este @ já está em uso.' });
      } catch {
        setCheck({ state: 'erro', message: 'Não foi possível verificar agora.' });
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [username, open]);

  if (!open) return null;

  const salvar = async () => {
    if (check.state === 'verificando' || check.state === 'erro') return;
    setSaving(true);
    setError('');
    try {
      const r = await apiClient.put('/feed/social/profile', {
        social_username: username,
        social_bio: bio
      });
      onSaved?.(r);
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  const nome = profile?.nome || 'Usuário';
  const cargo = String(profile?.cargo || '').trim();

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/80" onClick={onClose} aria-label="Fechar" />

      <div className="relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121212]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <h3 className="text-base font-bold text-white">Editar perfil</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Identidade global: somente leitura. */}
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/40">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={nome} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon size={18} className="text-gray-500" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <UserIcon size={12} className="shrink-0 text-gray-500" />
                <span className="truncate text-sm font-bold text-white">{nome}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Briefcase size={12} className="shrink-0 text-gray-500" />
                <span className="truncate text-xs text-gray-400">{cargo || 'Sem cargo'}</span>
              </div>
            </div>
          </div>

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-500">
            <Info size={12} className="mt-0.5 shrink-0" />
            <span>
              Foto e nome são gerenciados no perfil principal do BeatWap. Aqui você edita apenas o
              que pertence ao Feed.
            </span>
          </p>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-300">
              <AtSign size={13} className="text-beatwap-gold" />
              Usuário
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                placeholder="seuusuario"
                maxLength={24}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 pr-9 text-sm text-white outline-none focus:border-beatwap-gold/60"
                aria-label="Username do Feed"
              />
              {check.state === 'ok' && (
                <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />
              )}
              {(check.state === 'erro' || check.state === 'verificando') && (
                <AlertCircle
                  size={15}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    check.state === 'erro' ? 'text-red-400' : 'animate-pulse text-gray-500'
                  }`}
                />
              )}
            </div>
            {check.message && (
              <p
                className={`mt-1.5 text-[11px] ${
                  check.state === 'ok' ? 'text-green-400' : check.state === 'erro' ? 'text-red-400' : 'text-gray-500'
                }`}
              >
                {check.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-300">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Produzindo música e novos projetos..."
              className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-beatwap-gold/60"
              aria-label="Bio social"
            />
            <p className="mt-1 text-right text-[11px] text-gray-500">{bio.length}/300</p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={saving || check.state === 'verificando' || check.state === 'erro'}
            className="flex-1 rounded-xl bg-beatwap-gold px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-95 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedSocialEditModal;
