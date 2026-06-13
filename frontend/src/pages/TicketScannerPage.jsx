import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, CheckCircle2, QrCode, RefreshCw, ScanLine, XCircle } from 'lucide-react';
import { apiClient } from '../services/apiClient';

function parseToken(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  if (raw.startsWith('beatwap-ticket:')) return raw.slice('beatwap-ticket:'.length).trim();
  try {
    const url = new URL(raw);
    const bits = String(url.pathname || '').split('/').filter(Boolean);
    return bits[bits.length - 1] || raw;
  } catch {
    return raw;
  }
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return String(value || '');
  }
}

export default function TicketScannerPage() {
  const location = useLocation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const detectorRef = useRef(null);
  const processingRef = useRef(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [cameraRunning, setCameraRunning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [working, setWorking] = useState(false);

  const eventLabel = new URLSearchParams(String(location.search || '')).get('evento') || '';

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraRunning(false);
  }, []);

  const handleCheckIn = useCallback(async (rawValue) => {
    const token = parseToken(rawValue);
    if (!token || processingRef.current) return;

    processingRef.current = true;
    setWorking(true);
    setErrorText('');
    try {
      const payload = await apiClient.post(`/ticketing/check-in/${encodeURIComponent(token)}`, {});
      setResult(payload || null);
    } catch (error) {
      setResult(null);
      setErrorText(error?.message || 'Falha ao validar ingresso.');
    } finally {
      processingRef.current = false;
      setWorking(false);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setErrorText('');
      const detectorCtor = window.BarcodeDetector;
      if (!detectorCtor) {
        setCameraSupported(false);
        setErrorText('Este navegador nao suporta leitura automatica. Use a validacao manual abaixo.');
        return;
      }

      detectorRef.current = new detectorCtor({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => null);
      }
      setCameraSupported(true);
      setCameraRunning(true);

      intervalRef.current = window.setInterval(async () => {
        if (!detectorRef.current || !videoRef.current || processingRef.current) return;
        if (videoRef.current.readyState < 2) return;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          const first = Array.isArray(codes) ? codes[0] : null;
          const value = first?.rawValue ? String(first.rawValue) : '';
          if (value) {
            await handleCheckIn(value);
          }
        } catch {
          void 0;
        }
      }, 900);
    } catch (error) {
      stopCamera();
      setErrorText(error?.message || 'Nao foi possivel acessar a camera.');
    }
  }, [handleCheckIn, stopCamera]);

  useEffect(() => {
    setCameraSupported(!!window.BarcodeDetector);
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const ticket = result?.ticket || null;
  const status = String(result?.result || '').trim();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,197,66,0.12),transparent_34%),linear-gradient(180deg,#050505,#0d0d0d)] text-white px-4 py-10 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <section className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-beatwap-gold">Portaria mobile</div>
              <h1 className="text-3xl md:text-4xl font-extrabold mt-2">Leitor de ingressos</h1>
              <p className="text-sm text-gray-400 mt-3 max-w-2xl">
                Escaneie o QR do convite ou valide pelo codigo manual. {eventLabel ? `Evento atual: ${eventLabel}.` : 'Funciona com qualquer evento que voce administra.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5"
              >
                <RefreshCw size={16} />
                Reiniciar camera
              </button>
              <Link to="/admin/eventos" className="inline-flex items-center gap-2 rounded-full bg-beatwap-gold px-5 py-3 text-sm font-bold text-black">
                Voltar aos eventos
              </Link>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-6">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 space-y-4">
            <div className="flex items-center gap-2 text-lg font-extrabold">
              <Camera size={18} className="text-beatwap-gold" />
              Leitura por camera
            </div>
            <div className="rounded-[28px] overflow-hidden border border-white/10 bg-black/35 aspect-[4/5] flex items-center justify-center relative">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {!cameraRunning ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-400 bg-black/45">
                  <ScanLine size={36} />
                  <div className="text-sm text-center max-w-xs">
                    {cameraSupported
                      ? 'A camera esta parada. Use o botao para iniciar novamente.'
                      : 'Leitura automatica nao suportada neste navegador.'}
                  </div>
                </div>
              ) : null}
              <div className="absolute inset-[12%] border-2 border-dashed border-beatwap-gold/70 rounded-[32px] pointer-events-none" />
            </div>
            <div className="text-xs text-gray-500">
              Aponte para o QR Code do convite. Quando a leitura acontecer, o check-in e registrado automaticamente.
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 space-y-5">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-beatwap-gold">Fallback manual</div>
              <h2 className="text-2xl font-extrabold mt-2">Validar por codigo</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Cole o codigo do convite ou QR token"
                className="flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none"
              />
              <button
                type="button"
                onClick={() => handleCheckIn(manualCode)}
                disabled={working || !manualCode.trim()}
                className="rounded-full bg-beatwap-gold px-5 py-3 text-sm font-bold text-black disabled:opacity-60"
              >
                {working ? 'Validando...' : 'Validar ingresso'}
              </button>
            </div>

            {errorText ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorText}
              </div>
            ) : null}

            <div className="rounded-3xl border border-white/10 bg-black/30 p-5 min-h-[240px]">
              {!ticket ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-gray-400">
                  <QrCode size={34} className="text-beatwap-gold" />
                  <div className="text-lg font-bold text-white">Aguardando leitura</div>
                  <div className="text-sm max-w-md">
                    Depois da validacao, os dados do ingresso aparecem aqui com nome, lote e status da entrada.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Resultado</div>
                      <div className="text-2xl font-extrabold mt-2">{ticket.buyer_name}</div>
                      <div className="text-sm text-gray-400 mt-1">{ticket.buyer_email}</div>
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${status === 'checked_in' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-yellow-500/15 text-yellow-200'}`}>
                      {status === 'checked_in' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {status === 'checked_in' ? 'Check-in realizado' : 'Ja utilizado'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-gray-400">Evento</div>
                      <div className="mt-2 font-bold">{ticket.event?.title}</div>
                      <div className="text-sm text-gray-400 mt-1">{ticket.event?.venue_name}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-gray-400">Lote</div>
                      <div className="mt-2 font-bold">{ticket.ticket_type_name}</div>
                      <div className="text-sm text-gray-400 mt-1">Codigo: {ticket.invite_code}</div>
                    </div>
                  </div>

                  {ticket.checked_in_at ? (
                    <div className="text-sm text-gray-400">
                      Ultima leitura: {formatDate(ticket.checked_in_at)}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
