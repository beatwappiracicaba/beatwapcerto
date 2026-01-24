import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { User, Bell, Lock, CreditCard } from 'lucide-react';

const SettingsSection = ({ title, icon: Icon, children }) => (
  <div className="mb-8">
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
      <Icon className="text-beatwap-gold" size={20} /> {title}
    </h2>
    <Card className="p-6 space-y-6">
      {children}
    </Card>
  </div>
);

const Settings = () => {
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-2">Configurações</h1>
      <p className="text-gray-400 mb-8">Gerencie sua conta e preferências.</p>

      <SettingsSection title="Perfil" icon={User}>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Nome Artístico</label>
            <AnimatedInput defaultValue="MC Revelação" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <AnimatedInput defaultValue="artista@email.com" type="email" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-1">Bio</label>
            <textarea className="w-full bg-beatwap-darker border border-gray-700 rounded-xl p-4 text-white focus:outline-none focus:border-beatwap-gold transition-all h-24 resize-none" defaultValue="Artista independente focado em Trap e Rap." />
          </div>
        </div>
        <div className="flex justify-end">
          <AnimatedButton>Salvar Alterações</AnimatedButton>
        </div>
      </SettingsSection>

      <SettingsSection title="Notificações" icon={Bell}>
        <div className="space-y-4">
          {['Email quando música for aprovada', 'Email quando música for recusada', 'Novidades da plataforma'].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-gray-300">{item}</span>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full bg-beatwap-gold/20 cursor-pointer">
                 <span className="absolute left-0 inline-block w-6 h-6 bg-beatwap-gold rounded-full shadow transform translate-x-full transition-transform duration-200 ease-in-out"></span>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </DashboardLayout>
  );
};

export default Settings;
