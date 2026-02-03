import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AdminLayout } from '../components/AdminLayout';
import { useToast } from '../context/ToastContext';
import { Mail, User, Settings } from 'lucide-react';

export const AdminSettings = () => {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Artista',
    p_chat: true,
    p_musics: true,
    p_reports: false
  });
  const [inviteLink, setInviteLink] = useState('');
  const validEmail = String(form.email).trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

  const generateLink = () => {
    if (!form.name.trim() || !validEmail) {
      addToast('Preencha nome e um email válido.', 'error');
      return;
    }
    const params = new URLSearchParams();
    params.set('name', form.name.trim());
    params.set('email', form.email.trim());
    params.set('role', form.role === 'Produtor' ? 'Produtor' : 'Artista');
    params.set('p_chat', form.p_chat ? '1' : '0');
    params.set('p_musics', form.p_musics ? '1' : '0');
    params.set('p_reports', form.p_reports ? '1' : '0');
    const url = `${window.location.origin}/register?${params.toString()}`;
    setInviteLink(url);
    navigator.clipboard.writeText(url).then(() => {
      addToast('Link de convite copiado.', 'success');
    }).catch(() => {
      addToast('Não foi possível copiar o link.', 'error');
    });
  };

  const sendEmail = () => {
    if (!inviteLink) {
      addToast('Gere o link primeiro.', 'error');
      return;
    }
    const subject = encodeURIComponent('Convite BeatWap');
    const body = encodeURIComponent(`Olá,\n\nUse este link para criar sua conta:\n${inviteLink}\n\nSelecione seu cargo e conclua o cadastro.`);
    window.location.href = `mailto:${form.email}?subject=${subject}&body=${body}`;
  };

  return (
    <AdminLayout>
      <Card className="space-y-6">
        <div className="flex items-center gap-2 text-xl font-bold">
          <Settings size={20} className="text-beatwap-gold" />
          Configurações
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="space-y-4">
            <div className="text-lg font-bold">Criar novo usuário</div>
            <AnimatedInput
              label="Nome"
              icon={User}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: MC Future"
            />
            <AnimatedInput
              label="Email"
              type="email"
              icon={Mail}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="seu@email.com"
            />
            <div className="space-y-2">
              <div className="text-sm text-gray-300">Cargo</div>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="Artista" className="bg-[#121212] text-white">Artista</option>
                <option value="Produtor" className="bg-[#121212] text-white">Produtor</option>
              </select>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-gray-300">Permissões</div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-sm">Acesso ao Chat</div>
                <input
                  type="checkbox"
                  checked={form.p_chat}
                  onChange={(e) => setForm({ ...form, p_chat: e.target.checked })}
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-sm">Gerenciar Músicas</div>
                <input
                  type="checkbox"
                  checked={form.p_musics}
                  onChange={(e) => setForm({ ...form, p_musics: e.target.checked })}
                />
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-sm">Visualizar Relatórios</div>
                <input
                  type="checkbox"
                  checked={form.p_reports}
                  onChange={(e) => setForm({ ...form, p_reports: e.target.checked })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AnimatedButton onClick={generateLink}>Gerar link de convite</AnimatedButton>
              <AnimatedButton onClick={sendEmail}>Enviar por email</AnimatedButton>
            </div>
            {inviteLink && (
              <div className="text-xs text-gray-400 break-all">{inviteLink}</div>
            )}
          </Card>
          <Card className="space-y-4">
            <div className="text-lg font-bold">Como funciona</div>
            <div className="text-sm text-gray-400">
              Gere um link de convite com o cargo e permissões. O convidado acessa o link e finaliza o cadastro na página de registro.
            </div>
          </Card>
        </div>
      </Card>
    </AdminLayout>
  );
};

