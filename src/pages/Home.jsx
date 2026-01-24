import React, { useEffect } from 'react';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import Benefits from '../components/landing/Benefits';
import Transparency from '../components/landing/Transparency';
import Contact from '../components/landing/Contact';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';

const Home = () => {
  // Reset scroll on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="bg-beatwap-dark min-h-screen text-white font-sans selection:bg-beatwap-gold selection:text-black">
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Benefits />
        <Transparency />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
