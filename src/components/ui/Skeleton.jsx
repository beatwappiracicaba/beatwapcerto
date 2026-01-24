import React from 'react';
import { motion } from 'framer-motion';

export const Skeleton = ({ className, width, height, rounded = "rounded-md" }) => {
  return (
    <motion.div
      className={`bg-white/5 overflow-hidden relative ${rounded} ${className}`}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </motion.div>
  );
};

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="w-full">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 border-b border-white/5">
        <Skeleton width={40} height={40} rounded="rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
        <Skeleton width={80} height={24} rounded="rounded-full" />
        <Skeleton width={100} height={16} />
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
    <div className="p-4 flex items-center justify-between border border-white/5 rounded-xl bg-beatwap-card mb-4">
    <div className="flex items-center gap-4 w-full">
      <Skeleton width={20} height={20} rounded="rounded" />
      <Skeleton width={48} height={48} rounded="rounded-lg" />
      <div className="flex-1">
        <Skeleton width="40%" height={20} className="mb-2" />
        <Skeleton width="30%" height={14} />
      </div>
      <Skeleton width={80} height={24} rounded="rounded-full" />
    </div>
  </div>
)
