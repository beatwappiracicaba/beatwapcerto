import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const AccordionItem = ({ question, answer, isOpen, onClick }) => {
  return (
    <motion.div 
      initial={false}
      className="border-b border-white/10 last:border-0"
    >
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between py-6 text-left group"
      >
        <span className={`text-lg font-medium transition-colors ${isOpen ? 'text-beatwap-gold' : 'text-white group-hover:text-beatwap-gold'}`}>
          {question}
        </span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-beatwap-gold text-black' : 'bg-white/5 text-gray-400 group-hover:bg-white/10'}`}>
          {isOpen ? <Minus size={16} /> : <Plus size={16} />}
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-gray-400 leading-relaxed">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: "A BeatWap é uma distribuidora?",
      answer: "A BeatWap atua como uma plataforma revendedora de serviços de distribuição digital. Nós facilitamos o processo para você, garantindo que sua música chegue às principais lojas (Spotify, Apple Music, Deezer, etc.) através de nossos parceiros globais, mas com um atendimento e interface pensados para o mercado brasileiro."
    },
    {
      question: "Quanto tempo leva para minha música ser analisada?",
      answer: "Nosso prazo médio de análise é de 24 a 48 horas úteis. Após a aprovação, o tempo para aparecer nas lojas varia de acordo com cada plataforma (geralmente de 2 a 5 dias)."
    },
    {
      question: "Posso acompanhar o status do envio?",
      answer: "Sim! Nossa plataforma oferece um sistema de status detalhado. Você saberá exatamente quando sua música foi recebida, quando está em análise, se precisa de ajustes ou quando foi aprovada e enviada para as lojas."
    },
    {
      question: "Quanto custa para usar a BeatWap?",
      answer: "O cadastro na plataforma é gratuito. Cobramos apenas por lançamento (single ou álbum), sem taxas anuais recorrentes para manter a música no ar. Consulte nossa tabela de preços na área do artista."
    },
    {
      question: "Como recebo meus royalties?",
      answer: "Os pagamentos são processados mensalmente. Assim que as lojas nos repassam os valores, atualizamos seu saldo na plataforma e você pode solicitar o saque diretamente para sua conta bancária."
    }
  ];

  return (
    <section className="py-24 bg-beatwap-dark">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Perguntas Frequentes</h2>
          <p className="text-gray-400">Tudo o que você precisa saber para começar.</p>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 md:p-10 border border-white/5 shadow-xl">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
