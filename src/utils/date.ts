/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility functions for date calculations and Indonesian localized formatting
 */

export const DateUtils = {
  /**
   * Calculates the number of calendar days between an anniversary and today.
   */
  calculateDaysPassed(anniversaryDateStr: string, currentLocalTime?: string): number {
    try {
      if (!anniversaryDateStr) return 0;
      const today = currentLocalTime ? new Date(currentLocalTime) : new Date();
      const anniversary = new Date(anniversaryDateStr);
      if (isNaN(anniversary.getTime())) return 0;
      
      // Reset times to midnight to ensure accurate day differences
      today.setHours(0, 0, 0, 0);
      anniversary.setHours(0, 0, 0, 0);
      
      const diffTime = Math.abs(today.getTime() - anniversary.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      console.error('Error calculating days passed', e);
      return 0;
    }
  },

  /**
   * Formats an ISO string (YYYY-MM-DD) into Indonesian readable format.
   * Example: "2025-02-14" -> "14 Februari 2025"
   */
  formatIndonesianDate(dateStr: string): string {
    try {
      if (!dateStr) return 'Belum diatur';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Belum diatur';
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  }
};
