import React, { useEffect, useState } from 'react';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import FeaturedUsers from '../components/landing/FeaturedUsers';
import HowItWorks from '../components/landing/HowItWorks';
import Benefits from '../components/landing/Benefits';
import Transparency from '../components/landing/Transparency';
import Pricing from '../components/landing/Pricing';
import Contact from '../components/landing/Contact';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';
import { supabase } from '../services/supabaseClient';
import { Card } from '../components/ui/Card';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const [latestReleases, setLatestReleases] = useState([]);
  const [sellers, setSellers] = useState([]);

  // Reset scroll on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchLatestReleases();
    fetchSellers();
  }, []);

  const fetchLatestReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('musics')
        .select('*')
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      setLatestReleases(data || []);
    } catch (error) {
      console.error('Error fetching releases:', error);
    }
  };

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url')
        .eq('cargo', 'Vendedor')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      const mapped = (data || []).map(s => ({ ...s, name: s.nome }));
      setSellers(mapped);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  return (
    <div className="bg-beatwap-dark min-h-screen text-white font-sans selection:bg-beatwap-gold selection:text-black">
      <Header />
      <main>
        <Hero />
        
        {/* Latest Releases Section */}
        {latestReleases.length > 0 && (
          <section className="py-20 px-6 bg-black/30">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Lançamentos Recentes</h2>
                <p className="text-gray-400">Ouça o que os nossos artistas estão produzindo</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {latestReleases.map((release, index) => (
                  <motion.div 
                    key={release.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden mb-4 relative shadow-lg">
                      <img 
                        src={release.cover_url} 
                        alt={release.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black transform scale-0 group-hover:scale-100 transition-transform duration-300 hover:bg-white">
                          <Play fill="currentColor" className="ml-1" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg truncate">{release.title}</h3>
                    <p className="text-sm text-gray-400 truncate">{release.artist_name}</p>
                    <p className="text-xs text-beatwap-gold mt-1 uppercase font-bold tracking-wider">{release.genre}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Sellers Section */}
        {sellers.length > 0 && (
          <section className="py-20 px-6 bg-black/20">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Vendedores de Shows</h2>
                <p className="text-gray-400">Profissionais disponíveis para fechar shows</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {sellers.map((seller, index) => (
                  <motion.div
                    key={seller.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group p-4 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 bg-gray-700 border-2 border-black">
                      {seller.avatar_url ? (
                        <img src={seller.avatar_url} alt={seller.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl text-white font-bold">
                          {seller.name?.charAt(0) || 'V'}
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-center">{seller.name || 'Vendedor'}</h3>
                    <p className="text-sm text-gray-400 text-center line-clamp-2 mt-1">{seller.bio || 'Vendedor de shows'}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        <FeaturedUsers />
        <HowItWorks />
        <Benefits />
        <Transparency />
        <Pricing />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
