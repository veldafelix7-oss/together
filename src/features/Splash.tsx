/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { TogetherLogo } from '../components/TogetherLogo';

interface SplashProps {
  onComplete: () => void;
}

export const Splash: React.FC<SplashProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2800); // 2.8 seconds splash duration for optimal premium pacing
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col items-center justify-between py-24 px-8 relative">
      <div></div>

      {/* Official Together Logo and Text with elegant Fade-in */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <TogetherLogo size={110} />

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-4xl font-semibold tracking-widest text-white font-sans uppercase mt-6"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Together
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-xs text-white uppercase tracking-[0.25em] mt-3"
        >
          Satu Ruang, Dua Hati
        </motion.p>
      </motion.div>

      {/* Premium minimal loader */}
      <div className="flex flex-col items-center gap-4 w-full max-w-[140px]">
        <div className="w-full h-[1px] bg-[#1C1C1E] rounded-full overflow-hidden relative">
          <motion.div
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-0 bottom-0 w-1/3 bg-[#FF8DA1]"
          />
        </div>
        <span className="text-[10px] uppercase text-[#8E8E93] tracking-[0.3em] font-light animate-pulse">
          memuat...
        </span>
      </div>
    </div>
  );
};
