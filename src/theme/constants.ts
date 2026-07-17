/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const THEME = {
  colors: {
    background: '#0B0B0B',     // Black
    backgroundCard: '#141414', // Very dark grey card
    backgroundCardHover: '#1C1C1E',
    primaryPink: '#FF8DA1',    // Soft pink
    primaryPinkHover: '#FF7A91',
    textPrimary: '#FFFFFF',    // White
    textSecondary: '#8E8E93',  // Slate grey
    border: '#2C2C2E',         // Premium soft border
  },
  animations: {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.4, ease: 'easeInOut' }
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } // Custom swift easeOut
    },
    scaleUp: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: 0.3, ease: 'easeOut' }
    }
  }
};
