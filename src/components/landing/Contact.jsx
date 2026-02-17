import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, Send } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { useToast } from '../../context/ToastContext';

const Contact = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate sending
    setTimeout(() => {
      setLoading(false);
      addToast('Mensagem enviada com sucesso! Entraremos em contato em breve.', 'success');
      e.target.reset();
    }, 1500);
  };

  return (
    <section id="contact" className="py-24 bg-black relative">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Fale com a <span className="text-beatwap-gold">Gente</span>
            </h2>
            <p className="text-gray-400 mb-10 text-lg leading-relaxed">
              Tem alguma dúvida sobre distribuição, pagamentos ou como funciona a plataforma? 
              Nossa equipe está pronta para te ajudar.
            </p>

            <div className="space-y-6">
              <a href="mailto:contato@beatwap.com" className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                <div className="w-12 h-12 bg-beatwap-gold/10 rounded-full flex items-center justify-center text-beatwap-gold group-hover:scale-110 transition-transform">
                  <Mail size={24} />
                </div>
                <div>
                  <h4 className="text-white font-bold">E-mail</h4>
                  <p className="text-gray-400">contato@beatwap.com</p>
                </div>
              </a>

              <a href="https://wa.me/5519981083497" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <h4 className="text-white font-bold">WhatsApp</h4>
                  <p className="text-gray-400">(19) 98108-3497</p>
                </div>
              </a>
            </div>

            
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-beatwap-card p-8 rounded-2xl border border-white/5 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Envie uma mensagem</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
                <AnimatedInput placeholder="Seu nome artístico ou real" required />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">E-mail</label>
                <AnimatedInput type="email" placeholder="seu@email.com" required />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Mensagem</label>
                <textarea 
                  className="w-full bg-beatwap-darker border border-gray-700 rounded-xl p-4 text-white focus:outline-none focus:border-beatwap-gold focus:ring-1 focus:ring-beatwap-gold transition-all resize-none h-32"
                  placeholder="Como podemos ajudar?"
                  required
                ></textarea>
              </div>
              
              <AnimatedButton 
                type="submit" 
                className="w-full justify-center py-3"
                disabled={loading}
              >
                {loading ? 'Enviando...' : (
                  <>Enviar Mensagem <Send size={18} className="ml-2" /></>
                )}
              </AnimatedButton>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
