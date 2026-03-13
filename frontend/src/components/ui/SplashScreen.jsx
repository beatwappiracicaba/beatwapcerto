import { motion } from 'framer-motion';
import logo from '../../assets/images/beatwap-logo.png';

export const SplashScreen = ({ active = true, onComplete }) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (!active) onComplete?.();
      }}
    >
      <div className="relative flex flex-col items-center justify-center">
        <motion.div
          className="absolute inset-0 bg-beatwap-gold/20 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full border border-beatwap-gold/40"
              animate={{ rotate: 360, opacity: [0.35, 0.8, 0.35] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-2 rounded-full border border-white/10"
              animate={{ rotate: -360, opacity: [0.15, 0.45, 0.15] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "linear" }}
            />
            <img src={logo} alt="BeatWap Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(245,197,66,0.5)]" />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-sm text-beatwap-gold/80 tracking-widest uppercase"
          >
            Preparando sua experiência musical...
          </motion.p>

          <div className="mt-5 flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-beatwap-gold/80"
                animate={{ y: [0, -8, 0], opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
