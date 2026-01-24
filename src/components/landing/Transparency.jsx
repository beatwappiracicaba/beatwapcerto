import React from 'react';
import { motion } from 'framer-motion';

const Transparency = () => {
  return (
    <section className="py-16 bg-black border-t border-white/5">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center justify-center p-3 mb-6 rounded-full bg-white/5 border border-white/10">
            <span className="text-sm font-bold text-gray-400 tracking-wider uppercase">Transparência</span>
          </div>
          
          <p className="text-xl md:text-2xl text-gray-300 font-light leading-relaxed">
            "A BeatWap atua como revendedora de serviços de distribuição digital, oferecendo organização, acompanhamento e clareza em todo o processo."
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Transparency;
