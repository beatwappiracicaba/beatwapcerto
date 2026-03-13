import { motion } from 'framer-motion';
import { AnimatedButton } from '../ui/AnimatedButton';
import { Check, Info, Music } from 'lucide-react';

const SpecialOffer = () => {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-black/40 to-black/20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-beatwap-gold/30 to-transparent"></div>
      
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1 rounded-full bg-beatwap-gold/10 border border-beatwap-gold/30 text-beatwap-gold text-sm font-bold mb-4"
          >
            PROMOÇÃO ESPECIAL
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-6"
          >
            Produção Musical + Audiovisual
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="text-gray-400 text-lg max-w-2xl mx-auto"
          >
            Pacote completo para alavancar sua carreira com qualidade profissional de áudio e vídeo.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Detailed Pricing Card */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 hover:border-beatwap-gold/30 transition-colors"
          >
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Music className="text-beatwap-gold" />
              Tabela de Preços
            </h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-beatwap-gold mb-3 text-lg">INSTRUMENTOS (cada)</h4>
                <ul className="space-y-3">
                  {['Baixo', 'Sanfona', 'Cajón', 'Violão'].map((inst) => (
                    <li key={inst} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                      <span className="text-gray-300">{inst}</span>
                      <div className="text-right">
                        <div className="text-white font-bold">Gravação: R$ 300,00</div>
                        <div className="text-gray-500 text-xs">Vídeo: R$ 300,00</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-beatwap-gold mb-3 text-lg">PRODUÇÃO MUSICAL</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Produção</span>
                    <span className="text-white font-bold">R$ 300,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Mix, Master, 2ª Voz, Edição</span>
                    <span className="text-white font-bold">R$ 700,00</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-beatwap-gold mb-3 text-lg">VÍDEO</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Gravação (3 iPhones)</span>
                    <span className="text-white font-bold">R$ 600,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Edição de vídeo</span>
                    <span className="text-white font-bold">R$ 700,00</span>
                  </div>
                  <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/5">
                    <div className="text-beatwap-gold font-bold mb-1 text-xs uppercase">Opção sem iPhones</div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Videomaker</span>
                      <span className="text-white font-bold">R$ 400,00</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">+ Aluguel de equipamentos (valor sob consulta)</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Package & Total Card */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            {/* Gravação em Bloco */}
            <div className="bg-gradient-to-br from-beatwap-gold/10 to-transparent border border-beatwap-gold/20 rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Info className="text-beatwap-gold" size={20} />
                Gravação em Bloco
              </h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <Check className="text-green-500 flex-shrink-0 mt-1" size={16} />
                  <span className="text-gray-300">O projeto será dividido em 5 blocos</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-green-500 flex-shrink-0 mt-1" size={16} />
                  <span className="text-gray-300">2 músicas por bloco (Total: 10 músicas)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Info className="text-blue-500 flex-shrink-0 mt-1" size={16} />
                  <span className="text-gray-400 text-sm">Músicas adicionais (blocos extras): R$ 50,00 por música (por músico)</span>
                </li>
              </ul>
            </div>

            {/* Total Investment */}
            <div className="bg-beatwap-gold rounded-2xl p-1">
              <div className="bg-black/90 rounded-xl p-6 md:p-8 h-full">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">TOTAL DO INVESTIMENTO</h3>
                
                <ul className="space-y-3 mb-8">
                  {[
                    { label: '5 blocos completos com gravações', value: 'R$ 1.500,00' },
                    { label: 'Produção musical completa', value: 'R$ 1.000,00' },
                    { label: 'Gravação de vídeo com iPhones', value: 'R$ 600,00' },
                    { label: 'Edição de vídeo', value: 'R$ 700,00' },
                  ].map((item, i) => (
                    <li key={i} className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                      <span className="text-gray-300 flex items-center gap-2">
                        <Check size={14} className="text-beatwap-gold" /> {item.label}
                      </span>
                      <span className="text-white font-bold">{item.value}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-center mb-8">
                  <div className="text-gray-400 text-sm uppercase tracking-wider mb-1">Valor Total do Pacote</div>
                  <div className="text-5xl font-extrabold text-beatwap-gold">R$ 3.800,00</div>
                </div>

                <div className="space-y-4 mb-8 bg-white/5 p-4 rounded-lg">
                  <h4 className="font-bold text-white text-sm mb-2">FORMA DE PAGAMENTO</h4>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>📌 50% antes do início do projeto</p>
                    <p>📌 Restante na entrega final</p>
                    <p>📌 Parcelamento em até 10x no cartão (c/ juros)</p>
                  </div>
                </div>

                <AnimatedButton 
                  onClick={() => window.open('https://wa.me/5519981083497?text=Olá,%20tenho%20interesse%20no%20pacote%20de%20Produção%20Musical%20e%20Audiovisual%20de%20R$%203.800,00', '_blank')}
                  className="w-full justify-center py-4 text-lg"
                >
                  Contatar Agora
                </AnimatedButton>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SpecialOffer;
