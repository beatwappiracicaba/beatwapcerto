import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, ToggleLeft, ToggleRight, Save, Layout, Shield } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { mockSettings } from '../../data/mockData';
import { useToast } from '../../context/ToastContext';

export const AdminSettings = () => {
  const { addToast } = useToast();
  const [settings, setSettings] = useState(mockSettings);

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    addToast('Configurações salvas com sucesso!', 'success');
  };

  const SettingItem = ({ label, description, active, onToggle }) => (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
      <div>
        <h3 className="font-bold text-white">{label}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <button 
        onClick={onToggle}
        className={`transition-colors ${active ? 'text-beatwap-gold' : 'text-gray-600'}`}
      >
        {active ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configurações do Site</h1>
        <p className="text-gray-400">Controle global das funcionalidades da plataforma.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-beatwap-gold/20 rounded-lg text-beatwap-gold">
              <Shield size={24} />
            </div>
            <h2 className="text-xl font-bold">Controle de Acesso</h2>
          </div>
          
          <div className="space-y-4">
            <SettingItem 
              label="Modo Manutenção" 
              description="Desativa o acesso para todos os usuários, exceto admins."
              active={settings.maintenanceMode}
              onToggle={() => handleToggle('maintenanceMode')}
            />
            <SettingItem 
              label="Novos Cadastros" 
              description="Permite que novos artistas se cadastrem na plataforma."
              active={settings.registrationsOpen}
              onToggle={() => handleToggle('registrationsOpen')}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
              <Layout size={24} />
            </div>
            <h2 className="text-xl font-bold">Funcionalidades</h2>
          </div>
          
          <div className="space-y-4">
            <SettingItem 
              label="Aprovação Automática" 
              description="Aprova automaticamente uploads de artistas verificados."
              active={settings.autoApprove}
              onToggle={() => handleToggle('autoApprove')}
            />
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <AnimatedButton onClick={handleSave} className="flex items-center gap-2 px-8">
            <Save size={18} />
            Salvar Alterações
          </AnimatedButton>
        </div>
      </div>
    </div>
  );
};
