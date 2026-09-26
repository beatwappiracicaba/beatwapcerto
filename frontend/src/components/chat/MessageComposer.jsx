import { useEffect, useRef, useState } from 'react';
import { X, Send, Plus, Smile, Loader, RefreshCw } from 'lucide-react';
import { uploadApi } from '../../services/apiClient';

const EMOJIS = ['😀', '😂', '❤️', '👍', '🔥', '🎵', '🙌', '😍', '😎', '🤝', '💜', '🚀'];

/**
 * Campo de envio da conversa.
 *
 * Enter envia e Shift+Enter quebra linha no desktop. O campo fica preso no
 * rodape do painel e tem padding de safe-area, para o teclado do celular nao
 * cobrir os controles.
 */
export const MessageComposer = ({ onSend, sending, disabled }) => {
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [emojis, setEmojis] = useState(false);
  const [upload, setUpload] = useState(0);
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  const podeEnviar = text.trim().length > 0 && !sending && !disabled;

  const enviar = async () => {
    if (!podeEnviar) return;
    const valor = text;
    setText('');
    const ok = await onSend(valor);
    if (!ok) setText(valor); // devolve o texto se falhar
  };

  const enviarMidia = async (e, kind) => {
    const file = e.target?.files?.[0];
    e.target.value = '';
    setMenu(false);
    if (!file) return;
    setUpload(1);
    try {
      const mime = String(file.type || '').toLowerCase();
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp'
        : mime.includes('mp4') ? 'mp4' : mime.includes('webm') ? 'webm' : 'jpg';
      const up = await uploadApi.uploadWithMeta(file, {
        bucket: 'chat_media',
        fileName: `chat/${Date.now()}.${ext}`,
        onProgress: (p) => setUpload(Math.round(Number(p) || 0))
      });
      await onSend('', { url: up?.url, type: kind });
    } catch {
      setUpload(0);
    }
    setUpload(0);
  };

  return (
    <div className="shrink-0 border-t border-white/10 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      {upload > 0 && (
        <div className="mb-1.5 px-1 text-[11px] font-semibold text-beatwap-gold">
          Enviando {upload}%
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setMenu((v) => !v); setEmojis(false); }}
            disabled={sending}
            aria-label="Anexos"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <Plus size={19} />
          </button>
          {menu && (
            <>
              <button type="button" aria-label="Fechar" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(false)} />
              <div className="absolute bottom-11 left-0 z-20 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#151515] py-1 shadow-2xl">
                {[
                  { label: 'Foto', icon: '📷', run: () => fileRef.current?.click() },
                  { label: 'Vídeo', icon: '🎥', run: () => videoRef.current?.click() }
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    onClick={o.run}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-gray-200 transition hover:bg-white/5"
                  >
                    <span>{o.icon}</span>{o.label}
                  </button>
                ))}
                <div className="border-t border-white/10 px-3 py-2 text-[11px] text-gray-600">
                  Arquivo e localização ainda não disponíveis
                </div>
              </div>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => enviarMidia(e, 'image')} />
          <input ref={videoRef} type="file" accept="video/*" className="sr-only" onChange={(e) => enviarMidia(e, 'video')} />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // No celular o Enter deve inserir linha: quem envia e o botao.
            const mobile = window.matchMedia?.('(max-width: 767px)')?.matches;
            if (e.key === 'Enter' && !e.shiftKey && !mobile) {
              e.preventDefault();
              enviar();
            }
          }}
          rows={1}
          placeholder="Digite uma mensagem..."
          aria-label="Mensagem"
          className="max-h-28 min-h-[38px] flex-1 resize-none rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-beatwap-gold/50"
        />

        <button
          type="button"
          onClick={() => { setEmojis((v) => !v); setMenu(false); }}
          disabled={sending}
          aria-label="Emojis"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
        >
          <Smile size={18} />
        </button>

        <button
          type="button"
          onClick={enviar}
          disabled={!podeEnviar}
          aria-label="Enviar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-beatwap-gold text-black transition disabled:opacity-40"
        >
          {sending ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {emojis && (
        <>
          <button type="button" aria-label="Fechar" className="fixed inset-0 z-10 cursor-default" onClick={() => setEmojis(false)} />
          <div className="absolute bottom-20 right-2 z-20 grid w-52 grid-cols-6 gap-1 rounded-2xl border border-white/10 bg-[#151515] p-2 shadow-2xl">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { setText((v) => v + e); setEmojis(false); }}
                className="rounded-lg p-1 text-lg transition hover:bg-white/10"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
