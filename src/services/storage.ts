/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, AppSettings } from '../models/types';
import { DateUtils } from '../utils/date';
import { FirebaseAuth } from './firebase';

const STORAGE_KEYS = {
  USER: 'together_user_profile',
  SETTINGS: 'together_app_settings',
  IS_LOGGED_IN: 'together_is_logged_in',
};

// Default profile for high-fidelity demonstration
const DEFAULT_PROFILE: UserProfile = {
  username: 'User',
  partnerName: 'Belum Terhubung',
  anniversaryDate: '', // Set empty or some default
};

const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  theme: 'dark',
  widgetEnabled: true,
};

export const StorageService = {
  getUserProfile(): UserProfile {
    try {
      const firebaseUser = FirebaseAuth.getCurrentUser();
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      let profile = DEFAULT_PROFILE;
      if (stored) {
        profile = JSON.parse(stored);
      }
      if (firebaseUser) {
        return {
          ...profile,
          username: firebaseUser.displayName,
        };
      }
      return profile;
    } catch (e) {
      console.error('Error reading user profile', e);
    }
    return DEFAULT_PROFILE;
  },

  saveUserProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(profile));
    } catch (e) {
      console.error('Error saving user profile', e);
    }
  },

  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading settings', e);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings', e);
    }
  },

  isLoggedIn(): boolean {
    return FirebaseAuth.getCurrentUser() !== null;
  },

  setLoggedIn(status: boolean): void {
    if (!status) {
      FirebaseAuth.signOut();
    }
  },

  // Helper to calculate days between anniversary and today
  calculateDays(anniversaryDateStr: string, currentLocalTime?: string): number {
    return DateUtils.calculateDaysPassed(anniversaryDateStr, currentLocalTime);
  }
};
