import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, FileAudio, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { Card } from './Card';
import { AnimatedButton } from './AnimatedButton';

export const AdjustmentsCenter = ({ feedback, onResubmit }) => {
  return (
    <div className="space-y-6">
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex gap-4 items-start">
        <div className="p-2 bg-red-500/20 rounded-full text-red-500 shrink-0">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Ação Necessária: Ajustes Pendentes</h3>
          <p className="text-gray-400 text-sm mb-4">
            Nossa equipe identificou alguns problemas no seu envio. Corrija os itens abaixo para prosseguir.
          </p>
          
          <div className="space-y-3 bg-black/30 p-4 rounded-lg">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comentários do Revisor</h4>
            <p className="text-white text-sm italic">"{feedback.comment}"</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-l-4 border-red-500">
          <h3 className="font-bold text-white mb-4">Itens Reprovados</h3>
          <ul className="space-y-3">
            {feedback.issues.map((issue, index) => (
              <li key={index} className="flex items-center gap-3 text-sm text-red-400">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                {issue}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="font-bold text-white mb-4">Reenviar Arquivos</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <FileAudio size={20} className="text-gray-400" />
                <span className="text-sm">Novo Áudio (Opcional)</span>
              </div>
              <button className="text-xs text-beatwap-gold hover:underline">Selecionar</button>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <ImageIcon size={20} className="text-gray-400" />
                <span className="text-sm">Nova Capa (Opcional)</span>
              </div>
              <button className="text-xs text-beatwap-gold hover:underline">Selecionar</button>
            </div>
            
            <AnimatedButton onClick={onResubmit} fullWidth className="mt-4">
              Enviar Correções
            </AnimatedButton>
          </div>
        </Card>
      </div>
    </div>
  );
};
