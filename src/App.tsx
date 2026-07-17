/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Screen } from './models/types';
import { StorageService } from './services/storage';
import { PhoneFrame } from './widgets/PhoneFrame';
import { Splash } from './features/Splash';
import { Welcome } from './features/Welcome';
import { Login } from './features/Login';
import { Daftar } from './features/Daftar';
import { LupaPassword } from './features/LupaPassword';
import { Home } from './features/Home';
import { Pengaturan } from './features/Pengaturan';
import { LengkapiProfil } from './features/LengkapiProfil';
import { HubungkanPasangan } from './features/HubungkanPasangan';
import { WidgetSettings } from './features/WidgetSettings';
import { Chat } from './features/Chat';
import { TimelineKenangan } from './features/TimelineKenangan';
import { FirebaseAuth, FirebaseFirestore } from './services/firebase';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [screen, setScreen] = useState<Screen>('SPLASH');

  const handleSplashComplete = async () => {
    // Check if user is already logged in
    const isLoggedIn = StorageService.isLoggedIn();
    if (isLoggedIn) {
      const currentUser = FirebaseAuth.getCurrentUser();
      if (currentUser) {
        try {
          const doc = await FirebaseFirestore.getUserDoc(currentUser.uid, true); // forceSuccess=true for initial splash check
          if (doc && doc.displayName) {
            setScreen('HOME');
          } else {
            setScreen('COMPLETE_PROFILE');
          }
          return;
        } catch {
          setScreen('COMPLETE_PROFILE');
          return;
        }
      }
      setScreen('HOME');
    } else {
      setScreen('WELCOME');
    }
  };

  const renderScreen = () => {
    switch (screen) {
      case 'SPLASH':
        return (
          <motion.div
            key="splash"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Splash onComplete={handleSplashComplete} />
          </motion.div>
        );
      case 'WELCOME':
        return (
          <motion.div
            key="welcome"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Welcome onNavigate={(next) => setScreen(next)} />
          </motion.div>
        );
      case 'LOGIN':
        return (
          <motion.div
            key="login"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Login onNavigate={(next) => setScreen(next)} />
          </motion.div>
        );
      case 'REGISTER':
        return (
          <motion.div
            key="register"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Daftar onNavigate={(next) => setScreen(next)} />
          </motion.div>
        );
      case 'FORGOT_PASSWORD':
        return (
          <motion.div
            key="forgot_password"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <LupaPassword onNavigate={(next) => setScreen(next)} />
          </motion.div>
        );
      case 'HOME':
        return (
          <motion.div
            key="home"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Home onNavigate={(next) => setScreen(next)} />
          </motion.div>
        );
      case 'COMPLETE_PROFILE':
        return (
          <motion.div
            key="complete_profile"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <LengkapiProfil 
              onComplete={() => setScreen('HOME')} 
              onNavigate={(next) => setScreen(next)} 
            />
          </motion.div>
        );
      case 'SETTINGS':
        return (
          <motion.div
            key="settings"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Pengaturan onNavigate={(next) => setScreen(next)} />
          </motion.div>
        );
      case 'CONNECT_PARTNER':
        return (
          <motion.div
            key="connect_partner"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <HubungkanPasangan 
              onNavigate={(next) => setScreen(next)} 
              onConnectSuccess={() => setScreen('HOME')}
            />
          </motion.div>
        );
      case 'WIDGET_SETTINGS':
        return (
          <motion.div
            key="widget_settings"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <WidgetSettings onNavigate={(next) => setScreen(next)} />
          </motion.div>
        );
      case 'CHAT':
        return (
          <motion.div
            key="chat"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Chat onNavigate={(next) => setScreen(next)} />
          </motion.div>
        );
      case 'MEMORIES_TIMELINE':
        return (
          <motion.div
            key="memories_timeline"
            className="flex-1 flex flex-col h-full w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <TimelineKenangan onNavigate={(next) => setScreen(next)} />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <PhoneFrame>
      <AnimatePresence mode="wait">
        {renderScreen()}
      </AnimatePresence>
    </PhoneFrame>
  );
}
