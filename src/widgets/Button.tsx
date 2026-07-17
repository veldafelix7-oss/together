/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface ButtonProps {
  id: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'google';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  id,
  onClick,
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#FF8DA1] text-[#0B0B0B] font-medium hover:bg-[#FF7A91] shadow-sm shadow-[#FF8DA1]/5';
      case 'secondary':
        return 'bg-[#141414] text-white font-medium hover:bg-[#1C1C1E] border border-[#2C2C2E]';
      case 'outline':
        return 'bg-transparent text-white font-medium border border-[#FF8DA1] hover:bg-[#FF8DA1]/5';
      case 'text':
        return 'bg-transparent text-[#8E8E93] hover:text-white font-medium';
      case 'google':
        return 'bg-[#141414] text-white hover:bg-[#1C1C1E] border border-[#2C2C2E] flex items-center justify-center gap-3 font-medium';
      default:
        return 'bg-[#FF8DA1] text-[#0B0B0B]';
    }
  };

  return (
    <motion.button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`w-full py-3 px-5 rounded-xl text-center text-[14px] cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#FF8DA1]/30 disabled:opacity-50 disabled:cursor-not-allowed ${getVariantStyles()} ${className}`}
    >
      {children}
    </motion.button>
  );
};
