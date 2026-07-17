/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Heart, 
  Check, 
  Loader2, 
  Info, 
  RefreshCw, 
  Layout, 
  Smartphone, 
  User as UserIcon,
  HelpCircle,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { FirebaseAuth, FirebaseFirestore, FirestoreUserDoc } from '../services/firebase';
import { StorageService } from '../services/storage';
import { Screen } from '../models/types';

interface WidgetSettingsProps {
  onNavigate: (screen: Screen) => void;
}

export const WidgetSettings: React.FC<WidgetSettingsProps> = ({ onNavigate }) => {
  const [userDoc, setUserDoc] = useState<FirestoreUserDoc | null>(null);
  const [partnerDoc, setPartnerDoc] = useState<FirestoreUserDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [widgetEnabled, setWidgetEnabled] = useState(() => {
    return StorageService.getSettings().widgetEnabled;
  });

  // State to track simulation action
  const [simulationToast, setSimulationToast] = useState<string | null>(null);

  // Load user data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const currentUser = FirebaseAuth.getCurrentUser();
      if (!currentUser) {
        onNavigate('LOGIN');
        return;
      }

      try {
        const doc = await FirebaseFirestore.getUserDoc(currentUser.uid, true);
        if (doc) {
          setUserDoc(doc);
          if (doc.relationshipStatus === 'connected' && doc.partnerId) {
            const partner = await FirebaseFirestore.getUserDoc(doc.partnerId, true);
            setPartnerDoc(partner);
          }
        }
      } catch (err) {
        console.error('Failed to load user info in Widget settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [onNavigate]);

  // Sync settings helper
  const handleToggleWidget = () => {
    const nextVal = !widgetEnabled;
    setWidgetEnabled(nextVal);
    const currentSettings = StorageService.getSettings();
    StorageService.saveSettings({
      ...currentSettings,
      widgetEnabled: nextVal
    });

    // Fire custom event
    window.dispatchEvent(new CustomEvent('together_widget_status_changed', { detail: nextVal }));
    
    // Show quick status feedback
    setSimulationToast(nextVal ? "Widget Berhasil Diaktifkan!" : "Widget Dimatikan.");
    setTimeout(() => setSimulationToast(null), 2500);
  };

  // Perform widget update action
  const handleUpdateWidget = async () => {
    setIsUpdating(true);
    setUpdateMessage(null);
    
    // Simulate updating widget cache / Firestore synchronization
    await new Promise((resolve) => setTimeout(resolve, 1200));
    
    // Reload user data to make sure we have latest state
    const currentUser = FirebaseAuth.getCurrentUser();
    if (currentUser) {
      try {
        const doc = await FirebaseFirestore.getUserDoc(currentUser.uid, true);
        if (doc) {
          setUserDoc(doc);
          if (doc.relationshipStatus === 'connected' && doc.partnerId) {
            const partner = await FirebaseFirestore.getUserDoc(doc.partnerId, true);
            setPartnerDoc(partner);
          }
        }
      } catch (err) {
        console.warn('Silent data reload failed:', err);
      }
    }

    setIsUpdating(false);
    setUpdateMessage("Sinkronisasi Berhasil!");
    setTimeout(() => setUpdateMessage(null), 3000);
  };

  // Click on a widget simulation
  const handleWidgetClick = (size: string) => {
    setSimulationToast(`Widget ${size} ditekan! Mengalihkan langsung ke Beranda...`);
    setTimeout(() => {
      setSimulationToast(null);
      onNavigate('HOME');
    }, 1800);
  };

  // Calculate days together
  const getDaysCount = () => {
    if (!userDoc?.relationshipStartDate) return 0;
    
    const parts = userDoc.relationshipStartDate.split('-');
    if (parts.length !== 3) return 0;
    
    const start = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
    
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

  // Format date Indonenesian
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

  const isConnected = userDoc?.relationshipStatus === 'connected';
  const isStartDateSet = !!userDoc?.relationshipStartDate;
  const daysCount = getDaysCount();

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#0B0B0B] flex flex-col items-center justify-center p-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="text-[#FF8DA1] mb-3"
        >
          <Loader2 size={24} />
        </motion.div>
        <span className="text-[10px] text-[#8E8E93] tracking-[0.2em] uppercase font-medium">Memuat data widget...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-8 px-6 relative font-sans overflow-y-auto max-h-full scrollbar-none">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <button
            id="widget-btn-back"
            onClick={() => onNavigate('SETTINGS')}
            className="w-9 h-9 rounded-xl border border-[#2C2C2E]/60 flex items-center justify-center text-[#8E8E93] hover:text-white hover:border-[#FF8DA1]/30 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-[10px] uppercase text-[#8E8E93] tracking-[0.2em] font-semibold">Widget Android</span>
          <div className="w-9"></div>
        </div>

        {/* Title Info */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white tracking-tight">Widget Home Screen</h2>
          <p className="text-xs text-[#8E8E93] mt-1.5 leading-relaxed">
            Pasang widget Together langsung di layar utama ponsel Android Anda untuk memantau hari jadian secara real-time.
          </p>
        </div>

        {/* Menu Row Controls */}
        <div className="bg-[#141414] border border-[#2C2C2E]/60 rounded-xl divide-y divide-[#1F1F21] overflow-hidden mb-8">
          
          {/* Toggle Widget */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#FF8DA1]/10 text-[#FF8DA1] rounded-lg flex items-center justify-center">
                <Layout size={16} />
              </div>
              <div>
                <span className="text-sm font-medium text-white block">Aktifkan Widget</span>
                <span className="text-[10px] text-[#8E8E93] block">Sinkronisasi data background</span>
              </div>
            </div>
            
            <button
              id="widget-toggle-activate"
              onClick={handleToggleWidget}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${widgetEnabled ? 'bg-[#FF8DA1]' : 'bg-[#2C2C2E]'}`}
            >
              <div className={`w-4.5 h-4.5 bg-[#0B0B0B] rounded-full transform duration-200 ${widgetEnabled ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
            </button>
          </div>

          {/* Refresh Widget Trigger */}
          <button
            id="widget-btn-update"
            onClick={handleUpdateWidget}
            disabled={isUpdating}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-[#1C1C1E] transition-colors focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#FF8DA1]/10 text-[#FF8DA1] rounded-lg flex items-center justify-center">
                {isUpdating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
              </div>
              <div>
                <span className="text-sm font-medium text-white block">Perbarui Widget</span>
                <span className="text-[10px] text-[#8E8E93] block">Kirim pembaruan paksa ke sistem widget</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 text-[#8E8E93]">
              {updateMessage && <span className="text-[10px] text-[#FF8DA1] font-medium">{updateMessage}</span>}
              <ChevronRight size={14} />
            </div>
          </button>
        </div>

        {/* Live Simulator View */}
        <div className="space-y-6 mb-8">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8E8E93]">Tinjauan Desain & Simulasi</h3>
            <span className="text-[9px] text-[#FF8DA1]/80 italic">Sentuh untuk buka aplikasi</span>
          </div>

          {/* 1. WIDGET KECIL */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#8E8E93] font-mono block px-1">1. Widget Kecil (2 x 2)</span>
            <div 
              id="widget-simulation-small"
              onClick={() => handleWidgetClick('Kecil')}
              className="bg-[#0B0B0B] border border-[#2C2C2E]/60 rounded-2xl p-4 flex flex-col justify-between aspect-square w-32 h-32 mx-auto cursor-pointer hover:border-[#FF8DA1]/40 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98] select-none"
            >
              {/* Header */}
              <div className="flex items-center gap-1.5">
                <Heart size={10} className="text-[#FF8DA1] fill-[#FF8DA1]" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-white">Together</span>
              </div>
              
              {/* Body */}
              <div className="my-auto flex flex-col justify-center py-1">
                {!isConnected ? (
                  <span className="text-[10px] font-medium text-white leading-tight">Belum Terhubung</span>
                ) : !isStartDateSet ? (
                  <span className="text-[10px] font-medium text-[#FF8DA1] leading-tight">Tentukan Tanggal</span>
                ) : (
                  <>
                    <span className="text-2xl font-light text-[#FF8DA1] tracking-tight">{daysCount}</span>
                    <span className="text-[8px] uppercase tracking-widest text-[#8E8E93] mt-0.5">Hari Bersama</span>
                  </>
                )}
              </div>

              {/* Status footer */}
              <div className="flex items-center gap-1">
                <span className={`w-1 h-1 rounded-full ${isConnected ? 'bg-pink-400 animate-pulse' : 'bg-gray-600'}`}></span>
                <span className="text-[7px] uppercase font-semibold text-[#8E8E93]">
                  {isConnected ? 'Terhubung' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. WIDGET SEDANG */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#8E8E93] font-mono block px-1">2. Widget Sedang (4 x 2)</span>
            <div 
              id="widget-simulation-medium"
              onClick={() => handleWidgetClick('Sedang')}
              className="bg-[#0B0B0B] border border-[#2C2C2E]/60 rounded-2xl p-4 flex flex-col justify-between w-full h-28 cursor-pointer hover:border-[#FF8DA1]/40 hover:scale-[1.01] transition-all duration-200 active:scale-[0.99] select-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Heart size={10} className="text-[#FF8DA1] fill-[#FF8DA1]" />
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-white">Together</span>
                </div>
                <span className="text-[8px] text-[#8E8E93] font-mono">Home Widget</span>
              </div>

              {/* Body */}
              <div className="grid grid-cols-2 gap-4 items-center my-auto">
                <div className="flex flex-col">
                  {!isConnected ? (
                    <span className="text-xs font-semibold text-white">Belum Terhubung</span>
                  ) : !isStartDateSet ? (
                    <span className="text-xs font-semibold text-[#FF8DA1]">Tanggal Belum Set</span>
                  ) : (
                    <>
                      <span className="text-3xl font-light text-[#FF8DA1] tracking-tighter leading-none">{daysCount}</span>
                      <span className="text-[8px] uppercase tracking-wider text-[#8E8E93] mt-1">Hari Bersama</span>
                    </>
                  )}
                </div>

                <div className="text-right border-l border-[#2C2C2E]/50 pl-4 flex flex-col justify-center">
                  {isConnected ? (
                    <>
                      <span className="text-[10px] font-semibold text-white truncate">
                        {partnerDoc?.displayName || 'Pasangan'}
                      </span>
                      <span className="text-[8px] text-[#8E8E93] mt-1 block">
                        {isStartDateSet ? formatIndonesianDate(userDoc?.relationshipStartDate) : 'Menunggu input tanggal'}
                      </span>
                    </>
                  ) : (
                    <span className="text-[8px] text-[#8E8E93] leading-relaxed">
                      Hubungkan pasangan melalui aplikasi Together.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. WIDGET BESAR */}
          <div className="space-y-2">
            <span className="text-[10px] text-[#8E8E93] font-mono block px-1">3. Widget Besar (4 x 4)</span>
            <div 
              id="widget-simulation-large"
              onClick={() => handleWidgetClick('Besar')}
              className="bg-[#0B0B0B] border border-[#2C2C2E]/60 rounded-2xl p-5 flex flex-col justify-between w-full h-56 cursor-pointer hover:border-[#FF8DA1]/40 hover:scale-[1.01] transition-all duration-200 active:scale-[0.99] select-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Heart size={11} className="text-[#FF8DA1] fill-[#FF8DA1]" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white">Together</span>
                </div>
                <span className="text-[8px] text-[#8E8E93] font-mono">Interactive Frame</span>
              </div>

              {/* Avatar Zone with high quality overlay layout */}
              <div className="flex items-center justify-center my-3">
                {isConnected ? (
                  <div className="flex items-center -space-x-5">
                    {userDoc?.photoUrl ? (
                      <img 
                        src={userDoc.photoUrl} 
                        alt="Me" 
                        className="w-12 h-12 rounded-full object-cover border border-[#0B0B0B] relative z-10"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#2C2C2E]/60 flex items-center justify-center text-[#8E8E93] relative z-10">
                        <UserIcon size={14} />
                      </div>
                    )}
                    {partnerDoc?.photoUrl ? (
                      <img 
                        src={partnerDoc.photoUrl} 
                        alt="Partner" 
                        className="w-12 h-12 rounded-full object-cover border border-[#0B0B0B] relative z-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#2C2C2E]/60 flex items-center justify-center text-[#8E8E93] relative z-0">
                        <UserIcon size={14} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#141414] border border-[#2C2C2E]/40 flex items-center justify-center text-[#8E8E93]">
                    <UserIcon size={16} />
                  </div>
                )}
              </div>

              {/* Center Metrics */}
              <div className="text-center">
                {!isConnected ? (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-white block">Belum Terhubung</span>
                    <span className="text-[9px] text-[#8E8E93] block">Hubungkan pasangan Anda melalui aplikasi Together.</span>
                  </div>
                ) : !isStartDateSet ? (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-white block">Tanggal jadian belum ditentukan.</span>
                    <span className="text-[9px] text-[#8E8E93] block">Lakukan pengaturan tanggal jadian di aplikasi.</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-4xl font-extralight text-[#FF8DA1] tracking-tight leading-none block">{daysCount}</span>
                    <span className="text-[9px] uppercase tracking-widest text-[#8E8E93] block mt-1">Hari Bersama</span>
                  </div>
                )}
              </div>

              {/* Footer details info */}
              <div className="border-t border-[#2C2C2E]/30 pt-3 flex items-center justify-between text-[9px] text-[#8E8E93]">
                {isConnected && isStartDateSet ? (
                  <>
                    <span className="font-medium text-white truncate max-w-[120px]">
                      {userDoc?.displayName} & {partnerDoc?.displayName}
                    </span>
                    <span className="font-mono">
                      Sejak {formatIndonesianDate(userDoc?.relationshipStartDate)}
                    </span>
                  </>
                ) : (
                  <>
                    <span>TIDAK AKTIF</span>
                    <span>Together Widget v1.0</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step by step installation guide */}
        <div className="bg-[#141414] border border-[#2C2C2E]/50 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle size={15} className="text-[#FF8DA1]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Panduan Memasang Widget</h4>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-3">
              <span className="text-xs font-mono font-bold text-[#FF8DA1] bg-[#FF8DA1]/10 w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <span className="text-xs font-medium text-white block">Tahan Layar Utama</span>
                <span className="text-[10px] text-[#8E8E93] leading-relaxed block mt-0.5">
                  Pada layar utama handphone Android Anda, tekan dan tahan area kosong selama 2-3 detik.
                </span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <span className="text-xs font-mono font-bold text-[#FF8DA1] bg-[#FF8DA1]/10 w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <span className="text-xs font-medium text-white block">Pilih Opsi Widget</span>
                <span className="text-[10px] text-[#8E8E93] leading-relaxed block mt-0.5">
                  Ketuk ikon atau menu bertuliskan <span className="text-white font-medium">Widget</span> yang muncul di bagian bawah layar.
                </span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <span className="text-xs font-mono font-bold text-[#FF8DA1] bg-[#FF8DA1]/10 w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <span className="text-xs font-medium text-white block">Cari Aplikasi Together</span>
                <span className="text-[10px] text-[#8E8E93] leading-relaxed block mt-0.5">
                  Gulir daftar widget atau gunakan bilah pencarian lalu ketuk folder aplikasi <span className="text-white font-medium">Together</span>.
                </span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3">
              <span className="text-xs font-mono font-bold text-[#FF8DA1] bg-[#FF8DA1]/10 w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div>
                <span className="text-xs font-medium text-white block">Seret Ke Layar Utama</span>
                <span className="text-[10px] text-[#8E8E93] leading-relaxed block mt-0.5">
                  Pilih ukuran widget yang Anda inginkan (Kecil, Sedang, atau Besar), tekan lama, lalu seret ke tempat yang diinginkan.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lock Screen support description */}
        <div className="p-4 border border-dashed border-[#2C2C2E]/60 rounded-xl bg-transparent flex gap-3">
          <Smartphone size={16} className="text-[#FF8DA1] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white">Dukungan Lock Screen Widget</span>
            <p className="text-[9px] text-[#8E8E93] leading-relaxed">
              Jika perangkat Android Anda menggunakan Android 15+ atau memiliki launcher khusus yang mendukung Widget Layar Kunci, widget Together otomatis kompatibel dan siap dipasang langsung tanpa konfigurasi tambahan.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Interactive Toast Container */}
      <AnimatePresence>
        {simulationToast && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#FF8DA1] text-[#0B0B0B] font-bold text-[11px] uppercase tracking-wide px-4 py-2.5 rounded-full shadow-lg z-50 flex items-center gap-2 whitespace-nowrap"
          >
            <Sparkles size={11} />
            <span>{simulationToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
