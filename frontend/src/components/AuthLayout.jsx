import { Outlet } from 'react-router-dom';
import { MotivationalPanel } from './MotivationalPanel';
import { motion } from 'framer-motion';

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen w-full bg-beatwap-black">
      <MotivationalPanel />
      
      <motion.div 
        className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="w-full max-w-md">
           <Outlet />
        </div>
        
        <div className="absolute bottom-6 text-xs text-gray-600">
          © 2024 BeatWap. All rights reserved.
        </div>
      </motion.div>
    </div>
  );
};
