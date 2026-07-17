/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Settings as SettingsIcon, 
  Loader2,
  RefreshCw,
  User as UserIcon,
  Lock,
  MessageSquare,
  Layout,
  Calendar,
  AlertTriangle,
  Link2,
  CalendarDays,
  Edit2,
  Info
} from 'lucide-react';
import { FirebaseAuth, FirebaseFirestore, FirestoreUserDoc } from '../services/firebase';
import { Screen } from '../models/types';

interface HomeProps {
  onNavigate: (screen: Screen) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [userDoc, setUserDoc] = useState<FirestoreUserDoc | null>(null);
  const [partnerDoc, setPartnerDoc] = useState<FirestoreUserDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState({ hour: '00', minute: '00' });

  // Date Picker and Dialog States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Custom Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const showToast = (text: string, type: 'error' | 'success' = 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Clock mechanism
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime({
        hour: String(now.getHours()).padStart(2, '0'),
        minute: String(now.getMinutes()).padStart(2, '0')
      });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data with robust background vs foreground loading
  const fetchFirestoreData = async (forceSuccess: boolean = false, isBackground: boolean = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    setError(null);
    
    const currentUser = FirebaseAuth.getCurrentUser();
    if (!currentUser) {
      onNavigate('LOGIN');
      return;
    }

    const maxRetries = 3;
    let attempt = 0;
    let doc: FirestoreUserDoc | null = null;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      try {
        const shouldForce = forceSuccess || attempt > 0;
        doc = await FirebaseFirestore.getUserDoc(currentUser.uid, shouldForce);
        break;
      } catch (err: any) {
        lastError = err;
        attempt++;
        if (attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    }

    if (!doc && lastError) {
      // Only show error screen if we are in foreground loading
      if (!isBackground) {
        setError(lastError.message || 'Gagal tersambung ke database Cloud Firestore.');
        setIsLoading(false);
      }
      return;
    }

    try {
      if (doc) {
        setUserDoc(doc);
        
        // If connected, fetch partner's public info
        if (doc.relationshipStatus === 'connected' && doc.partnerId) {
          try {
            const partner = await FirebaseFirestore.getUserDoc(doc.partnerId, true);
            setPartnerDoc(partner);
          } catch (partnerErr) {
            console.warn('Failed to load partner info silently:', partnerErr);
          }
        } else {
          setPartnerDoc(null);
        }
      } else {
        // Auto-create user document if missing
        const cleanUsername = currentUser.displayName?.toLowerCase().replace(/\s+/g, '') || `user_${currentUser.uid.substring(0, 5)}`;
        const newDoc: FirestoreUserDoc = {
          uid: currentUser.uid,
          username: cleanUsername,
          displayName: currentUser.displayName || 'Pengguna Baru',
          photoUrl: currentUser.photoURL || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          partnerId: '',
          relationshipStartDate: '',
          relationshipStatus: 'single',
        };
        await FirebaseFirestore.setUserDoc(currentUser.uid, newDoc);
        setUserDoc(newDoc);
      }
    } catch (err: any) {
      if (!isBackground) {
        setError(err.message || 'Gagal menyiapkan data akun Together.');
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchFirestoreData();
  }, []);

  // Fallback poll Firestore every 30 seconds for automatic backup sync without manual refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFirestoreData(true, true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Listen to user document updates (presence, connections, display name, etc.) in real-time
  useEffect(() => {
    const handlePresenceUpdate = (event: Event) => {
      const customEv = event as CustomEvent;
      const currentUser = FirebaseAuth.getCurrentUser();
      if (currentUser && customEv.detail && (customEv.detail.uid === currentUser.uid || customEv.detail.uid === userDoc?.partnerId)) {
        fetchFirestoreData(true, true);
      }
    };

    window.addEventListener('together_presence_updated', handlePresenceUpdate);
    return () => window.removeEventListener('together_presence_updated', handlePresenceUpdate);
  }, [userDoc?.partnerId]);

  // Sync with real-time events on start date updates
  useEffect(() => {
    const handleStartDateUpdate = () => {
      fetchFirestoreData(true, true);
    };
    window.addEventListener('together_relationship_start_date_updated', handleStartDateUpdate);
    return () => window.removeEventListener('together_relationship_start_date_updated', handleStartDateUpdate);
  }, []);

  // Accurate days calculation using device's local midnight to local midnight
  const getDaysCount = () => {
    if (!userDoc?.relationshipStartDate) return 0;
    
    // Parse start date from YYYY-MM-DD
    const parts = userDoc.relationshipStartDate.split('-');
    if (parts.length !== 3) return 0;
    
    const start = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1, // month is 0-indexed
      parseInt(parts[2], 10)
    );
    
    // Current date at midnight local time
    const today = new Date();
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    
    const diffTime = todayMidnight.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysCount = getDaysCount();

  // Format Indonesian date elegantly from YYYY-MM-DD (immune to timezone offset shifts)
  const formatIndonesianDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${day} ${months[monthIndex]} ${year}`;
  };

  // Open Date Picker and default value to today or currently saved date
  const handleOpenDatePicker = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDate(userDoc?.relationshipStartDate || todayStr);
    setShowDatePicker(true);
  };

  // Proceed to confirm after choosing date
  const handleConfirmStep = () => {
    if (!selectedDate) return;
    setShowDatePicker(false);
    setShowConfirmDialog(true);
  };

  // Cancel and go back to date picker
  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
    setShowDatePicker(true);
  };

  // Perform Firestore/Firebase save
  const handleSaveAnniversary = async () => {
    if (!userDoc) return;
    setIsSaving(true);
    try {
      await FirebaseFirestore.updateRelationshipStartDate(
        userDoc.uid,
        userDoc.partnerId || '',
        selectedDate
      );
      // Fast updates locally
      await fetchFirestoreData(true, true);
      setShowConfirmDialog(false);
      showToast('Tanggal jadian berhasil disimpan!', 'success');
    } catch (err: any) {
      showToast('Gagal menyimpan tanggal: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading view
  if (isLoading) {
    return (
      <div className="flex-1 bg-[#0B0B0B] flex flex-col items-center justify-center p-6">
        <div className="relative flex items-center justify-center mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="text-[#FF8DA1]"
          >
            <Loader2 size={28} />
          </motion.div>
        </div>
        <span className="text-[10px] text-[#8E8E93] tracking-[0.2em] uppercase font-medium">
          Sinkronisasi...
        </span>
      </div>
    );
  }

  // Error view (shows only when background/foreground fails entirely)
  if (error) {
    return (
      <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-12 px-6 sm:py-20 sm:px-12">
        <div></div>
        
        <div className="flex flex-col items-center text-center max-w-sm mx-auto">
          <div className="w-12 h-12 bg-red-950/10 rounded-full flex items-center justify-center text-red-400 border border-red-900/20 mb-5">
            <AlertTriangle size={20} />
          </div>
          
          <h3 className="text-sm font-semibold text-white tracking-tight sm:text-base">Koneksi Terputus</h3>
          <p className="text-xs text-[#8E8E93] mt-2 leading-relaxed sm:text-sm">
            {error}
          </p>
          
          <div className="mt-6 w-full">
            <button
              id="error-btn-retry"
              onClick={() => fetchFirestoreData(true)}
              className="w-full py-2.5 bg-[#FF8DA1] hover:bg-[#FF7A91] text-[#0B0B0B] font-semibold text-xs tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw size={12} />
              Coba Lagi
            </button>
          </div>
        </div>

        <div className="text-center"></div>
      </div>
    );
  }

  const isConnected = userDoc?.relationshipStatus === 'connected';
  const isStartDateSet = !!userDoc?.relationshipStartDate;
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-8 px-6 sm:py-12 sm:px-10 md:py-16 md:px-16 lg:py-20 lg:px-24 relative font-sans overflow-x-hidden">
      
      {/* 1. Header Zone - Ultra Minimal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Heart className="text-[#FF8DA1] fill-[#FF8DA1] w-3 h-3 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5" />
          <span className="font-semibold tracking-[0.25em] text-[10px] sm:text-xs md:text-sm uppercase text-white">together</span>
        </div>
        
        {/* Simple Time Indicator */}
        <span className="text-[11px] sm:text-xs md:text-sm font-mono text-[#8E8E93] tracking-wider">
          {currentTime.hour}:{currentTime.minute}
        </span>
      </div>

      {/* 2. Main Center-piece Zone */}
      <div className="my-auto py-8 sm:py-12 md:py-16 flex flex-col items-center text-center">
        
        {/* Profile Avatar Frame */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative mb-5 sm:mb-8 md:mb-10 lg:mb-12 flex items-center justify-center"
        >
          {isConnected && partnerDoc ? (
            <div className="flex items-center -space-x-4 sm:-space-x-6 md:-space-x-8 lg:-space-x-10">
              {/* User Avatar */}
              {userDoc?.photoUrl ? (
                <img 
                  src={userDoc.photoUrl} 
                  alt={userDoc.displayName} 
                  className="w-14 h-14 sm:w-20 sm:h-20 md:w-26 md:h-26 lg:w-32 lg:h-32 rounded-full object-cover border-2 border-[#0B0B0B] relative z-10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-26 md:h-26 lg:w-32 lg:h-32 rounded-full bg-[#141414] border-2 border-[#0B0B0B] flex items-center justify-center text-[#8E8E93] relative z-10">
                  <UserIcon className="w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 lg:w-11 lg:h-11" />
                </div>
              )}
              {/* Partner Avatar */}
              {partnerDoc.photoUrl ? (
                <img 
                  src={partnerDoc.photoUrl} 
                  alt={partnerDoc.displayName} 
                  className="w-14 h-14 sm:w-20 sm:h-20 md:w-26 md:h-26 lg:w-32 lg:h-32 rounded-full object-cover border-2 border-[#0B0B0B] relative z-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-26 md:h-26 lg:w-32 lg:h-32 rounded-full bg-[#141414] border-2 border-[#0B0B0B] flex items-center justify-center text-[#8E8E93] relative z-0">
                  <UserIcon className="w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 lg:w-11 lg:h-11" />
                </div>
              )}
            </div>
          ) : (
            userDoc?.photoUrl ? (
              <img 
                src={userDoc.photoUrl} 
                alt={userDoc.displayName} 
                className="w-14 h-14 sm:w-20 sm:h-20 md:w-26 md:h-26 lg:w-32 lg:h-32 rounded-full object-cover border border-[#2C2C2E]/40"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-26 md:h-26 lg:w-32 lg:h-32 rounded-full bg-[#141414] border border-[#2C2C2E]/40 flex items-center justify-center text-[#8E8E93]">
                <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12" />
              </div>
            )
          )}
        </motion.div>

        {/* Identity Section */}
        <div className="mb-6 sm:mb-8 md:mb-10 lg:mb-12">
          <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white tracking-tight">
            {isConnected && partnerDoc ? (
              <span>{userDoc?.displayName} & {partnerDoc.displayName}</span>
            ) : (
              userDoc?.displayName
            )}
          </h2>
          <span className="text-[10px] sm:text-xs md:text-sm lg:text-base font-mono text-[#8E8E93] mt-1 sm:mt-2 block">
            {isConnected && partnerDoc ? (
              <span>@{userDoc?.username} + @{partnerDoc.username}</span>
            ) : (
              `@${userDoc?.username}`
            )}
          </span>
        </div>

        {/* Dynamic Center Panel (Counter or Action Area) */}
        <div className="w-full max-w-sm mx-auto mb-8 sm:mb-12">
          {isConnected ? (
            isStartDateSet ? (
              /* ANNIVERSARY SET: Display Day Count, Label, and Anniversary Date with small edit option */
              <div className="flex flex-col items-center">
                <motion.span 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-light tracking-tighter text-[#FF8DA1] font-sans"
                >
                  {daysCount}
                </motion.span>
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#8E8E93] mt-2 sm:mt-3 font-semibold">
                  Hari Bersama
                </span>
                <span className="text-sm sm:text-base text-white/95 font-medium mt-4">
                  {formatIndonesianDate(userDoc?.relationshipStartDate)}
                </span>
                
                {/* Small menu / link to change anniversary date */}
                <button
                  id="home-btn-change-anniversary"
                  onClick={handleOpenDatePicker}
                  className="mt-4 flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] hover:bg-[#1C1C1E] text-xs font-medium text-[#FF8DA1] border border-[#2C2C2E]/50 rounded-full transition-all cursor-pointer focus:outline-none"
                >
                  <Edit2 size={10} />
                  <span>Ubah Tanggal Jadian</span>
                </button>
              </div>
            ) : (
              /* CONNECTED BUT ANNIVERSARY NOT SET YET */
              <div className="flex flex-col items-center py-4">
                <div className="w-12 h-12 bg-[#FF8DA1]/5 rounded-full flex items-center justify-center text-[#FF8DA1] mb-3">
                  <Heart size={20} className="fill-[#FF8DA1]/10" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-white tracking-tight">Tanggal jadian belum ditentukan</span>
                <span className="text-[10px] text-[#8E8E93] mt-1">Tentukan tanggal mulai hubungan Anda</span>
                <button
                  id="home-btn-set-anniversary"
                  onClick={handleOpenDatePicker}
                  className="mt-4.5 px-5 py-2.5 bg-[#FF8DA1] hover:bg-[#FF7A91] text-[#0B0B0B] font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-[#FF8DA1]/10"
                >
                  <CalendarDays size={13} />
                  <span>Tentukan Tanggal Jadian</span>
                </button>
              </div>
            )
          ) : (
            /* NOT CONNECTED YET: Cannot set anniversary */
            <div className="flex flex-col items-center py-4">
              <div className="w-11 h-11 bg-[#2C2C2E]/20 rounded-full flex items-center justify-center text-[#8E8E93] mb-3 border border-[#2C2C2E]/30">
                <Lock size={14} />
              </div>
              <span className="text-xs font-semibold text-[#8E8E93] tracking-wide px-4 py-2 bg-[#141414]/50 border border-[#2C2C2E]/15 rounded-xl">
                Hubungkan pasangan terlebih dahulu.
              </span>
            </div>
          )}
        </div>

        {/* Connection Status Indicator */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] sm:text-[11px] md:text-xs lg:text-sm uppercase tracking-[0.2em] text-[#8E8E93] font-semibold block mb-1.5 sm:mb-2.5">
            Status Koneksi
          </span>
          
          {isConnected && partnerDoc ? (
            <div className="space-y-1 sm:space-y-2 text-center">
              <div className="flex items-center gap-1.5 justify-center mb-1">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-pink-400 animate-pulse"></span>
                <span className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-white tracking-wide">
                  Terhubung
                </span>
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-[#8E8E93] leading-relaxed max-w-[200px] sm:max-w-xs md:max-w-md mx-auto">
                Menjalani komitmen bersama <span className="text-white font-medium">{partnerDoc.displayName}</span>
              </p>
              <p className="text-[10px] sm:text-[11px] md:text-xs lg:text-sm text-[#8E8E93]/60 italic font-mono mt-0.5 sm:mt-1">
                Sejak {formatIndonesianDate(userDoc?.connectedAt?.split('T')[0] || userDoc?.relationshipStartDate)}
              </p>
            </div>
          ) : (
            <div className="space-y-1 sm:space-y-2 text-center">
              <div className="flex items-center gap-1.5 justify-center mb-1">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#8E8E93]/50"></span>
                <span className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-white tracking-wide">
                  Belum Terhubung
                </span>
              </div>
              <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-[#8E8E93] leading-relaxed max-w-[200px] sm:max-w-xs md:max-w-md mx-auto">
                Anda belum memiliki pasangan.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* 3. Bottom Menu & Action Zone */}
      <div className="space-y-5 sm:space-y-8 md:space-y-10">
        
        {/* Dynamic Connect Button with scaled sizing */}
        {!isConnected && (
          <motion.button
            id="home-btn-connect-partner"
            onClick={() => onNavigate('CONNECT_PARTNER')}
            whileHover={{ scale: 1.002 }}
            whileTap={{ scale: 0.995 }}
            className="w-full py-3.5 sm:py-4 md:py-5 lg:py-6 bg-[#FF8DA1] hover:bg-[#FF7A91] text-[#0B0B0B] font-bold text-xs sm:text-sm md:text-base tracking-wide rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 sm:gap-2.5 transition-all cursor-pointer shadow-sm"
          >
            <Link2 className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 md:w-5.5 md:h-5.5" />
            <span>Hubungkan Pasangan</span>
          </motion.button>
        )}

        {/* Menu Row - Beautiful grid including Interactive and Locked features */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-2 border-t border-b border-[#2C2C2E]/20 py-4.5 sm:py-6 md:py-8 lg:py-10">
          
          {/* Chat Button (Interactive) */}
          <button
            id="home-btn-chat"
            onClick={() => onNavigate('CHAT')}
            className="flex flex-col items-center justify-center gap-1 sm:gap-2 text-center group cursor-pointer focus:outline-none"
          >
            <div className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center text-[#FF8DA1] group-hover:scale-105 transition-transform">
              <MessageSquare className="w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-medium text-white group-hover:text-[#FF8DA1] transition-colors font-sans">Chat</span>
          </button>

          {/* Timeline Kenangan Button (Interactive) */}
          <button
            id="home-btn-timeline"
            onClick={() => onNavigate('MEMORIES_TIMELINE')}
            className="flex flex-col items-center justify-center gap-1 sm:gap-2 text-center group cursor-pointer focus:outline-none"
          >
            <div className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center text-[#FF8DA1] group-hover:scale-105 transition-transform">
              <CalendarDays className="w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-medium text-white group-hover:text-[#FF8DA1] transition-colors font-sans">Timeline Kenangan</span>
          </button>

          {/* Widget Button (Locked) */}
          <div className="flex flex-col items-center justify-center gap-1 sm:gap-2 text-center opacity-30 select-none">
            <div className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center text-[#8E8E93]">
              <Layout className="w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-medium text-[#8E8E93] font-sans">Widget</span>
            <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-[#8E8E93]/70 mt-0.5" />
          </div>

          {/* Calendar Button (Locked) */}
          <div className="flex flex-col items-center justify-center gap-1 sm:gap-2 text-center opacity-30 select-none">
            <div className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center text-[#8E8E93]">
              <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs md:text-sm font-medium text-[#8E8E93] font-sans">Kalender</span>
            <Lock className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-[#8E8E93]/70 mt-0.5" />
          </div>

        </div>

        {/* Primary Settings Action Link */}
        <motion.button
          id="home-btn-settings"
          onClick={() => onNavigate('SETTINGS')}
          whileHover={{ scale: 1.002 }}
          whileTap={{ scale: 0.995 }}
          className="w-full py-2 sm:py-3.5 md:py-4 bg-[#141414] hover:bg-[#1A1A1C] border border-[#2C2C2E]/40 rounded-lg sm:rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 text-[#8E8E93] hover:text-white transition-all cursor-pointer text-[11px] sm:text-xs md:text-sm font-medium"
        >
          <SettingsIcon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          <span>Pengaturan Akun & Profil</span>
        </motion.button>
        
      </div>

      {/* ================= MODAL DIALOGS ================= */}
      <AnimatePresence>
        
        {/* 1. DATE PICKER MODAL */}
        {showDatePicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDatePicker(false)}
              className="absolute inset-0 bg-[#0B0B0B]/85 backdrop-blur-md"
            />
            
            {/* Content Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm bg-[#141414] border border-[#2C2C2E]/70 rounded-2xl p-6 shadow-2xl flex flex-col text-left overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="text-[#FF8DA1]" size={18} />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {isStartDateSet ? 'Ubah Tanggal Jadian' : 'Tentukan Tanggal Jadian'}
                </h3>
              </div>
              
              <p className="text-xs text-[#8E8E93] leading-relaxed mb-5">
                Pilih tanggal mulai hubungan Anda. Sistem hanya memperbolehkan memilih tanggal hari ini atau tanggal di masa lalu.
              </p>
              
              {/* HTML5 Native Date picker elegantly styled */}
              <div className="mb-6">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8E8E93] block mb-2 font-mono">
                  Tanggal Mulai
                </label>
                <input
                  id="anniversary-date-input"
                  type="date"
                  max={todayStr}
                  value={selectedDate}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    if (chosen > todayStr) {
                      setSelectedDate(todayStr);
                    } else {
                      setSelectedDate(chosen);
                    }
                  }}
                  className="w-full bg-[#1C1C1E] text-white border border-[#2C2C2E] hover:border-[#FF8DA1]/30 focus:border-[#FF8DA1] rounded-xl px-4 py-3 text-sm font-medium tracking-wide focus:outline-none transition-colors duration-200 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  id="datepicker-btn-cancel"
                  onClick={() => setShowDatePicker(false)}
                  className="flex-1 py-3 bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-[#2C2C2E]/50"
                >
                  Batal
                </button>
                <button
                  id="datepicker-btn-continue"
                  onClick={handleConfirmStep}
                  disabled={!selectedDate}
                  className="flex-1 py-3 bg-[#FF8DA1] hover:bg-[#FF7A91] disabled:opacity-50 text-[#0B0B0B] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Lanjut
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 2. CONFIRMATION DIALOG (STRICT INDONESIAN REQS) */}
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelConfirm}
              className="absolute inset-0 bg-[#0B0B0B]/85 backdrop-blur-md"
            />
            
            {/* Content Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm bg-[#141414] border border-[#2C2C2E]/70 rounded-2xl p-6 shadow-2xl flex flex-col text-left overflow-hidden"
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                Konfirmasi Tanggal Jadian
              </h3>
              
              <div className="bg-[#1C1C1E] border border-[#2C2C2E]/40 rounded-xl p-3.5 mb-4 mt-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8E8E93] block font-mono">
                  Pilihan Tanggal
                </span>
                <span className="text-sm font-bold text-[#FF8DA1] mt-1 block">
                  {formatIndonesianDate(selectedDate)}
                </span>
              </div>

              <p className="text-xs text-[#8E8E93] leading-relaxed mb-6">
                Apakah Anda yakin memilih tanggal ini sebagai tanggal jadian? Perubahan ini akan berlaku untuk kedua akun.
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  id="confirm-btn-cancel"
                  onClick={handleCancelConfirm}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-[#1C1C1E] hover:bg-[#2C2C2E] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-[#2C2C2E]/50"
                >
                  Batal
                </button>
                <button
                  id="confirm-btn-save"
                  onClick={handleSaveAnniversary}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-[#FF8DA1] hover:bg-[#FF7A91] disabled:opacity-50 text-[#0B0B0B] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-50 pointer-events-none flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl flex items-center gap-2 pointer-events-auto max-w-xs ${
                toastMessage.type === 'success' 
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
                  : 'bg-red-950/90 border-red-500/30 text-red-300'
              }`}
            >
              <Info size={14} className={`shrink-0 ${toastMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`} />
              <span>{toastMessage.text}</span>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
};
