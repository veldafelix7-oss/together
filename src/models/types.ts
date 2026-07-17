/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Screen = 'SPLASH' | 'WELCOME' | 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'HOME' | 'SETTINGS' | 'COMPLETE_PROFILE' | 'CONNECT_PARTNER' | 'WIDGET_SETTINGS' | 'CHAT' | 'MEMORIES_TIMELINE';

export interface UserProfile {
  username: string;
  partnerName: string;
  anniversaryDate: string; // ISO string or YYYY-MM-DD
  profilePic?: string; // Data URL or placeholder
  partnerPic?: string; // Data URL or placeholder
}

export interface AppSettings {
  notifications: boolean;
  theme: 'dark';
  widgetEnabled: boolean;
}

export interface NavigationState {
  currentScreen: Screen;
  history: Screen[];
}
