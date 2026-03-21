import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { useToast } from '../context/ToastContext';
import { apiClient, authApi } from '../services/apiClient';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

export default function RegisterInvite() {
  const nav = useNavigate();
  const { search } = useLocation();
  const { addToast } = useToast();
  const { refreshProfile } = useAuth();
  const params = new URLSearchParams(search);
  const token = String(params.get('token') || '').trim();
  const tipoParam = String(params.get('tipo') || '').trim();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [step, setStep] = useState('register');
  const [formStep, setFormStep] = useState(0);
  const [agreeLegal, setAgreeLegal] = useState(false);
  const [nome, setNome] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [celular, setCelular] = useState('');
  const [telefone, setTelefone] = useState('');
  const [generoMusical, setGeneroMusical] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [cargo, setCargo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!token) { nav('/register/invite-invalid', { replace: true }); return; }
      try {
        const data = await apiClient.get(`/auth/invite/${token}`);
        setEmail(String(data?.email || ''));
        setExpiresAt(data?.expires_at || null);
        const fromInvite = String(data?.role || '').trim();
        const tipo = String(tipoParam || '').trim();
        const finalRole = (tipo || fromInvite || '').trim();
        setCargo(finalRole);
        const name = String(data?.name || '').trim();
        if (name) setNome(name);
      } catch {
        nav('/register/invite-invalid', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  const submit = async () => {
    try {
      setSubmitting(true);
      if (step === 'register') {
        const requiredMissingByFormStep = () => {
          if (formStep === 0) {
            if (!String(nomeCompleto || '').trim()) return true;
            return false;
          }
          if (formStep === 1) {
            if (!String(password || '').trim()) return true;
            return false;
          }
          if (formStep === 2) {
            if (!String(celular || '').trim()) return true;
            if (!String(generoMusical || '').trim()) return true;
            return false;
          }
          if (formStep === 3) {
            if (!String(cidade || '').trim()) return true;
            if (!String(estado || '').trim()) return true;
            if (!agreeLegal) return true;
            return false;
          }
          return false;
        };

        if (requiredMissingByFormStep()) {
          addToast('Preencha os campos obrigatórios', 'error');
          return;
        }

        if (formStep < 3) {
          setFormStep((s) => Math.min(3, s + 1));
          return;
        }

        if (!email || !password || !nomeCompleto || !celular || !generoMusical || !cidade || !estado || !agreeLegal) {
          addToast('Preencha os campos obrigatórios', 'error');
          return;
        }

        await authApi.requestRegisterCode(email);
        addToast('Enviamos um código de verificação para seu email.', 'success');
        setStep('verify');
        return;
      }

      if (!agreeLegal) {
        addToast('Você precisa aceitar os Termos, Privacidade e Direitos Autorais.', 'error');
        return;
      }
      if (!email || !password || !nomeCompleto || !celular || !generoMusical || !cidade || !estado) {
        addToast('Preencha os campos obrigatórios', 'error');
        return;
      }
      if (!String(code || '').trim()) {
        addToast('Digite o código enviado por email.', 'error');
        return;
      }

      const res = await apiClient.post('/auth/register-with-invite', {
        token,
        tipo: cargo,
        email,
        password,
        code,
        nome,
        nome_completo: nomeCompleto,
        razao_social: razaoSocial,
        cpf,
        cnpj,
        celular,
        telefone,
        genero_musical: generoMusical,
        cep,
        logradouro,
        complemento,
        bairro,
        cidade,
        estado,
        agreeLegal: true
      });
      if (res?.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user || null));
      }
      addToast('Conta criada com sucesso!', 'success');
      await refreshProfile();
      nav(res?.redirect || '/dashboard/painel', { replace: true });
    } catch (e) {
      addToast(e?.message || 'Falha ao criar conta', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <AuthLayout><div className="min-h-[60vh] flex items-center justify-center text-gray-400">Validando convite...</div></AuthLayout>;

  return (
    <AuthLayout>
      <div className="max-w-md mx-auto">
        <Card className="space-y-5">
          <div className="text-center space-y-1">
            <div className="text-xl font-extrabold text-white">Criar conta por convite</div>
            {expiresAt && <div className="text-xs text-gray-400">Convite válido até {new Date(expiresAt).toLocaleString()}</div>}
          </div>
          <AnimatedInput
            label="Email"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled
          />
          {step === 'verify' ? (
            <>
              <AnimatedInput
                label="Código"
                type="text"
                icon={CheckCircle}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
              />
              <AnimatedButton onClick={submit} isLoading={submitting} className="w-full justify-center">
                Concluir cadastro
              </AnimatedButton>
              <button
                type="button"
                onClick={() => { setStep('register'); setFormStep(3); }}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors"
              >
                Voltar
              </button>
            </>
          ) : (
            <>
              {formStep === 0 && (
                <>
                  <AnimatedInput
                    label="Nome"
                    icon={User}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: MC Future"
                  />
                  <AnimatedInput
                    label="Nome completo"
                    icon={User}
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                  <AnimatedInput
                    label="Razão social"
                    icon={User}
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    placeholder="(opcional)"
                  />
                </>
              )}

              {formStep === 1 && (
                <AnimatedInput
                  label="Senha"
                  type="password"
                  icon={Lock}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              )}

              {formStep === 2 && (
                <>
                  <AnimatedInput
                    label="CPF"
                    icon={User}
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="(opcional)"
                  />
                  <AnimatedInput
                    label="CNPJ"
                    icon={User}
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="(opcional)"
                  />
                  <AnimatedInput
                    label="Celular"
                    icon={User}
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    placeholder="(WhatsApp)"
                  />
                  <AnimatedInput
                    label="Telefone"
                    icon={User}
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(opcional)"
                  />
                  <AnimatedInput
                    label="Gênero Musical"
                    icon={User}
                    value={generoMusical}
                    onChange={(e) => setGeneroMusical(e.target.value)}
                    placeholder="Ex: Trap"
                  />
                </>
              )}

              {formStep === 3 && (
                <>
                  <AnimatedInput
                    label="CEP"
                    icon={User}
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="(opcional)"
                  />
                  <AnimatedInput
                    label="Logradouro"
                    icon={User}
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    placeholder="(opcional)"
                  />
                  <AnimatedInput
                    label="Complemento"
                    icon={User}
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="(opcional)"
                  />
                  <AnimatedInput
                    label="Bairro"
                    icon={User}
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    placeholder="(opcional)"
                  />
                  <AnimatedInput
                    label="Cidade"
                    icon={User}
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Sua cidade"
                  />
                  <AnimatedInput
                    label="Estado"
                    icon={User}
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    placeholder="UF"
                  />
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreeLegal}
                        onChange={(e) => setAgreeLegal(e.target.checked)}
                        className="mt-1 accent-beatwap-gold"
                      />
                      <span className="text-sm text-gray-300">
                        Declaro que li e concordo com os{' '}
                        <Link to="/legal/termos" className="text-beatwap-gold hover:underline">Termos de Uso</Link>,{' '}
                        <Link to="/legal/privacidade" className="text-beatwap-gold hover:underline">Política de Privacidade</Link>{' '}
                        e{' '}
                        <Link to="/legal/direitos" className="text-beatwap-gold hover:underline">Direitos Autorais</Link>.{' '}
                        <Link to="/legal/todos" className="text-gray-400 hover:text-beatwap-gold underline ml-1">Ver tudo</Link>
                      </span>
                    </label>
                  </div>
                </>
              )}

              <AnimatedButton onClick={submit} isLoading={submitting} className="w-full justify-center">
                {formStep === 3 ? 'Enviar código' : 'Continuar'}
              </AnimatedButton>
              {formStep > 0 && (
                <button
                  type="button"
                  onClick={() => setFormStep((s) => Math.max(0, s - 1))}
                  className="w-full text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Voltar
                </button>
              )}
            </>
          )}

          <div className="text-xs text-center text-gray-500">
            Convite inválido? <Link className="text-beatwap-gold hover:underline" to="/register/invite-invalid">Ver ajuda</Link>
          </div>
        </Card>
      </div>
    </AuthLayout>
  );
}
