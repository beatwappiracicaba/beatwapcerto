import React, { useState } from 'react';
import { Send, Bell } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useNotification } from '../../context/NotificationContext';

export const AdminNotifications = () => {
  const { addToast } = useToast();
  const { addNotification } = useNotification();
  const { artists } = useData();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    recipient: 'all'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      addToast('Preencha todos os campos.', 'error');
      return;
    }

    // Simulate sending notification
    addNotification({
      recipientId: formData.recipient,
      title: formData.title,
      message: formData.message,
      type: 'info',
      date: new Date().toISOString()
    });

    addToast(`Notificação enviada para ${formData.recipient === 'all' ? 'todos os artistas' : 'artista selecionado'}!`, 'success');
    setFormData({ title: '', message: '', recipient: 'all' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Notificações</h1>
        <p className="text-gray-400">Envie alertas e comunicados para os artistas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Destinatário</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, recipient: 'all' })}
                    className={`p-4 rounded-xl border flex items-center gap-3 transition-all
                      ${formData.recipient === 'all' 
                        ? 'border-beatwap-gold bg-beatwap-gold/10 text-white' 
                        : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'}`}
                  >
                    <div className="p-2 bg-current rounded-full bg-opacity-20">
                      <Bell size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Todos os Artistas</div>
                      <div className="text-xs opacity-70">Enviar comunicado geral</div>
                    </div>
                  </button>

                  <select
                    value={formData.recipient === 'all' ? '' : formData.recipient}
                    onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                    className={`p-4 rounded-xl border appearance-none bg-black focus:outline-none transition-all cursor-pointer
                      ${formData.recipient !== 'all' 
                        ? 'border-beatwap-gold text-white' 
                        : 'border-white/10 text-gray-400'}`}
                  >
                    <option value="" disabled>Selecionar Artista Específico</option>
                    {artists.map(artist => (
                      <option key={artist.id} value={artist.id}>{artist.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Título da Notificação</label>
                <AnimatedInput 
                  placeholder="Ex: Manutenção Programada"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Mensagem</label>
                <textarea
                  placeholder="Digite sua mensagem aqui..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors h-40 resize-none"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <div className="flex justify-end">
                <AnimatedButton type="submit" className="flex items-center gap-2 px-8">
                  <Send size={18} />
                  Enviar Notificação
                </AnimatedButton>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-beatwap-gold/20 to-transparent p-6 rounded-2xl border border-beatwap-gold/20">
            <h3 className="font-bold text-lg mb-2 text-beatwap-gold">Dicas</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-beatwap-gold mt-1.5" />
                Seja claro e objetivo no título.
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-beatwap-gold mt-1.5" />
                Use notificações gerais para avisos de sistema.
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-beatwap-gold mt-1.5" />
                Notificações individuais são ótimas para feedback sobre lançamentos.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
