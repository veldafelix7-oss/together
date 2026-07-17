/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface TogetherLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

export const TogetherLogo: React.FC<TogetherLogoProps> = ({
  className = '',
  size = 120,
  showText = false,
  textClassName = '',
}) => {
  // Vibrant pink color matching the official logo
  const logoColor = '#FF5A82';

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Sharp, beautiful SVG of the official Together Double-T Heart logo with transparent mask cutouts */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <mask id={`together-logo-mask-${size}`}>
            {/* Everything white is kept */}
            <rect x="0" y="0" width="200" height="200" fill="#FFFFFF" />
            
            {/* Inner Heart Cutout - black means transparent */}
            <path
              d="M 100 92
                 C 108 81, 126 81, 126 99
                 C 126 114, 112 129, 100 141
                 C 88 129, 74 114, 74 99
                 C 74 81, 92 81, 100 92 Z"
              fill="#000000"
            />

            {/* Dynamic arch cutouts - black means transparent */}
            <path
              d="M 100 76
                 C 112 76, 124 81, 128 85
                 C 128 85, 120 89, 112 89
                 C 100 89, 100 83, 100 76 Z"
              fill="#000000"
            />
            <path
              d="M 100 76
                 C 88 76, 76 81, 72 85
                 C 72 85, 80 89, 88 89
                 C 100 89, 100 83, 100 76 Z"
              fill="#000000"
            />
          </mask>
        </defs>

        {/* Main Double-T Heart Silhouette with Mask applied */}
        <path
          d="M 100 64 
             C 107 54, 117 44, 134 44 
             L 156 44 
             C 161 44, 165 48, 165 53 
             C 165 58, 161 62, 156 62 
             L 136 62 
             C 124 62, 114 72, 114 84 
             L 114 96 
             C 126 96, 137 106, 137 118 
             C 137 134, 120 151, 100 168 
             C 80 151, 63 134, 63 118 
             C 63 106, 74 96, 86 96 
             L 86 84 
             C 86 72, 76 62, 64 62 
             L 44 62 
             C 39 62, 35 58, 35 53 
             C 35 48, 39 44, 44 44 
             L 66 44 
             C 83 44, 93 54, 100 64 Z"
          fill={logoColor}
          mask={`url(#together-logo-mask-${size})`}
        />
      </svg>

      {showText && (
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`text-3xl font-semibold tracking-wider mt-4 font-sans text-white ${textClassName}`}
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Together
        </motion.span>
      )}
    </div>
  );
};
