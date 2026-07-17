/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../widgets/Button';

interface WelcomeProps {
  onNavigate: (screen: 'LOGIN' | 'REGISTER') => void;
}

export const Welcome: React.FC<WelcomeProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-16 px-8 relative">
      <div></div>

      {/* Hero Brand Section */}
      <div className="flex flex-col items-center text-center">
        {/* Animated Minimal Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative w-20 h-20 mb-8 flex items-center justify-center"
        >
          {/* Heart 1 */}
          <svg
            className="w-12 h-12 text-[#FF8DA1] absolute -left-1 top-1 opacity-85"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>

          {/* Heart 2 */}
          <svg
            className="w-12 h-12 text-white/40 absolute -right-1 bottom-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </motion.div>

        {/* Name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-4xl font-semibold tracking-wider text-white"
        >
          Together
        </motion.h1>

        {/* Short Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-[14px] text-[#8E8E93] mt-4 max-w-[280px] leading-relaxed"
        >
          Ruang aman nan tenang untuk menyimpan setiap kenangan, berdialog, dan tumbuh bersama pasangan Anda.
        </motion.p>
      </div>

      {/* Dynamic CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="flex flex-col gap-3 w-full"
      >
        <Button
          id="welcome-btn-login"
          variant="primary"
          onClick={() => onNavigate('LOGIN')}
        >
          Masuk
        </Button>
        <Button
          id="welcome-btn-register"
          variant="secondary"
          onClick={() => onNavigate('REGISTER')}
        >
          Daftar Akun Baru
        </Button>
      </motion.div>
    </div>
  );
};
