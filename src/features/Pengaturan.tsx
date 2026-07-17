/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  ChevronRight, 
  Moon, 
  Bell, 
  Layout, 
  Info, 
  LogOut, 
  Check, 
  X,
  Heart,
  User as UserIcon,
  Smartphone
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { FirebaseAuth, FirebaseFirestore } from '../services/firebase';
import { Button } from '../widgets/Button';
import { Screen } from '../models/types';

interface PengaturanProps {
  onNavigate: (screen: Screen) => void;
}

export const Pengaturan: React.FC<PengaturanProps> = ({ onNavigate }) => {
  const [settings, setSettings] = useState(() => StorageService.getSettings());
  const [showTentangModal, setShowTentangModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState(() => {
    return localStorage.getItem('together_phone_frame_enabled') !== 'false';
  });
  
  // Relationship info states
  const [partnerName, setPartnerName] = useState<string>('');
  const [connectedAt, setConnectedAt] = useState<string>('');
  const [status, setStatus] = useState<string>('Belum Terhubung');
  const [showDisconnectPlaceholder, setShowDisconnectPlaceholder] = useState(false);

  useEffect(() => {
    const user = FirebaseAuth.getCurrentUser();
    if (user) {
      FirebaseFirestore.getUserDoc(user.uid, true).then((doc) => {
        if (doc) {
          if (doc.relationshipStatus === 'connected') {
            setStatus('Terhubung');
            setPartnerName(doc.partnerName || 'Pasangan Anda');
            setConnectedAt(doc.connectedAt || doc.relationshipStartDate || '');
          } else {
            setStatus('Belum Terhubung');
          }
        }
      }).catch((err) => {
        console.error('Failed to load user info in Settings:', err);
      });
    }
  }, []);

  const handleToggleNotification = () => {
    const updated = { ...settings, notifications: !settings.notifications };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  const handleToggleWidget = () => {
    const updated = { ...settings, widgetEnabled: !settings.widgetEnabled };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  const handleTogglePhoneFrame = () => {
    const nextVal = !isPhoneFrame;
    setIsPhoneFrame(nextVal);
    localStorage.setItem('together_phone_frame_enabled', String(nextVal));
    window.dispatchEvent(new CustomEvent('together_toggle_phone_frame', { detail: nextVal }));
  };

  const handleLogout = async () => {
    await FirebaseAuth.signOut();
    StorageService.setLoggedIn(false);
    onNavigate('LOGIN');
  };

  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-8 px-6 relative font-sans">
      
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <button
            id="settings-btn-back"
            onClick={() => onNavigate('HOME')}
            className="w-9 h-9 rounded-xl border border-[#2C2C2E]/60 flex items-center justify-center text-[#8E8E93] hover:text-white hover:border-[#FF8DA1]/30 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-[10px] uppercase text-[#8E8E93] tracking-[0.2em] font-semibold">Pengaturan</span>
          <div className="w-9"></div> {/* spacer */}
        </div>
      </div>

      {/* Settings Options List */}
      <div className="my-auto py-6 space-y-5">
        
        {/* Settings Group 0: Profile */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8E8E93] px-1">Profil Saya</h3>
          
          <div className="bg-[#141414] border border-[#2C2C2E]/60 rounded-xl overflow-hidden">
            <button
              id="settings-btn-edit-profile"
              onClick={() => onNavigate('COMPLETE_PROFILE')}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-[#1C1C1E] transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FF8DA1]/10 text-[#FF8DA1] rounded-lg flex items-center justify-center">
                  <UserIcon size={16} />
                </div>
                <div>
                  <span className="text-sm font-medium text-white block">Perbarui Data Profil</span>
                  <span className="text-[10px] text-[#8E8E93] block">Nama panggilan, tanggal lahir, dll</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-[#8E8E93]" />
            </button>
          </div>
        </div>

        {/* Settings Group: Hubungan */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8E8E93] px-1">Hubungan Saya</h3>
          
          <div className="bg-[#141414] border border-[#2C2C2E]/60 rounded-xl divide-y divide-[#1F1F21] overflow-hidden">
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#FF8DA1]/10 text-[#FF8DA1] rounded-lg flex items-center justify-center">
                    <Heart size={16} className="fill-[#FF8DA1]/20" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white block">Status Hubungan</span>
                    <span className="text-[10px] text-[#8E8E93] block">Status sinkronisasi pasangan</span>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  status === 'Terhubung' 
                    ? 'text-[#FF8DA1] bg-[#FF8DA1]/10 border-[#FF8DA1]/20' 
                    : 'text-[#8E8E93] bg-[#2C2C2E]/30 border-[#2C2C2E]/50'
                }`}>
                  {status}
                </span>
              </div>

              {status === 'Terhubung' ? (
                <div className="border-t border-[#2C2C2E]/20 pt-3.5 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8E8E93]">Nama Pasangan</span>
                    <span className="text-white font-medium">{partnerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8E8E93]">Tanggal Terhubung</span>
                    <span className="text-white font-mono">
                      {connectedAt ? new Date(connectedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                    </span>
                  </div>
                  
                  {/* Putuskan Hubungan Placeholder */}
                  <div className="border-t border-[#2C2C2E]/10 pt-3 mt-1 text-center">
                    <button
                      id="settings-btn-disconnect-placeholder"
                      onClick={() => setShowDisconnectPlaceholder(true)}
                      className="text-xs text-red-500 hover:text-red-400 font-medium cursor-pointer transition-colors"
                    >
                      Putuskan Hubungan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-[#2C2C2E]/20 pt-3 text-xs text-[#8E8E93] italic">
                  Belum ada pasangan terhubung.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Group 1: General */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8E8E93] px-1">Tampilan & Sistem</h3>
          
          <div className="bg-[#141414] border border-[#2C2C2E]/60 rounded-xl divide-y divide-[#1F1F21] overflow-hidden">
            {/* Tema (Dark mode only lock) */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FF8DA1]/10 text-[#FF8DA1] rounded-lg flex items-center justify-center">
                  <Moon size={16} />
                </div>
                <div>
                  <span className="text-sm font-medium text-white block">Tema</span>
                  <span className="text-[10px] text-[#8E8E93] block">Default Gelap Premium</span>
                </div>
              </div>
              <span className="text-[10px] text-[#FF8DA1] font-medium bg-[#FF8DA1]/10 px-2 py-0.5 rounded border border-[#FF8DA1]/20">Aktif</span>
            </div>

            {/* Notifikasi Toggle */}
            <button
              id="settings-toggle-notif"
              onClick={handleToggleNotification}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-[#1C1C1E] transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FF8DA1]/10 text-[#FF8DA1] rounded-lg flex items-center justify-center">
                  <Bell size={16} />
                </div>
                <div>
                  <span className="text-sm font-medium text-white block">Notifikasi</span>
                  <span className="text-[10px] text-[#8E8E93] block">Hari spesial & pesan baru</span>
                </div>
              </div>
              
              {/* iOS style beautiful toggle */}
              <div className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ${settings.notifications ? 'bg-[#FF8DA1]' : 'bg-[#2C2C2E]'}`}>
                <div className={`w-4.5 h-4.5 bg-[#0B0B0B] rounded-full transform duration-200 ${settings.notifications ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
              </div>
            </button>

            {/* Widget Menu */}
            <button
              id="settings-btn-widget"
              onClick={() => onNavigate('WIDGET_SETTINGS')}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-[#1C1C1E] transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FF8DA1]/10 text-[#FF8DA1] rounded-lg flex items-center justify-center">
                  <Layout size={16} />
                </div>
                <div>
                  <span className="text-sm font-medium text-white block">Widget</span>
                  <span className="text-[10px] text-[#8E8E93] block">Aktifkan, perbarui, & panduan widget</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-[#8E8E93]" />
            </button>

            {/* Phone Frame Toggle */}
            <button
              id="settings-toggle-phoneframe"
              onClick={handleTogglePhoneFrame}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-[#1C1C1E] transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FF8DA1]/10 text-[#FF8DA1] rounded-lg flex items-center justify-center">
                  <Smartphone size={16} />
                </div>
                <div>
                  <span className="text-sm font-medium text-white block">Bingkai HP (Simulasi)</span>
                  <span className="text-[10px] text-[#8E8E93] block">Aktifkan bingkai handphone di desktop</span>
                </div>
              </div>
              
              <div className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 ${isPhoneFrame ? 'bg-[#FF8DA1]' : 'bg-[#2C2C2E]'}`}>
                <div className={`w-4.5 h-4.5 bg-[#0B0B0B] rounded-full transform duration-200 ${isPhoneFrame ? 'translate-x-4.5' : 'translate-x-0'}`}></div>
              </div>
            </button>
          </div>
        </div>

        {/* Settings Group 2: App Info */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8E8E93] px-1">Lainnya</h3>
          
          <div className="bg-[#141414] border border-[#2C2C2E]/60 rounded-xl divide-y divide-[#1F1F21] overflow-hidden">
            {/* Tentang */}
            <button
              id="settings-btn-about"
              onClick={() => setShowTentangModal(true)}
              className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-[#1C1C1E] transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FF8DA1]/10 text-[#FF8DA1] rounded-lg flex items-center justify-center">
                  <Info size={16} />
                </div>
                <div>
                  <span className="text-sm font-medium text-white block">Tentang Together</span>
                  <span className="text-[10px] text-[#8E8E93] block">Informasi & versi aplikasi</span>
                </div>
              </div>
              <ChevronRight size={16} className="text-[#8E8E93]" />
            </button>
          </div>
        </div>

        {/* Logout Trigger button */}
        <button
          id="settings-btn-logout-trigger"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-3 bg-[#141414] hover:bg-red-500/5 text-red-400 hover:text-red-300 font-medium rounded-xl border border-[#2C2C2E]/60 hover:border-red-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs"
        >
          <LogOut size={15} />
          <span>Keluar dari Akun</span>
        </button>
      </div>

      <div className="text-center pb-2">
        <span className="text-[10px] uppercase text-[#333336] tracking-[0.25em]">Together v1.0.0</span>
      </div>

      {/* MODAL OVERLAYS */}
      <AnimatePresence>
        
        {/* 1. TENTANG MODAL */}
        {showTentangModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-[#141414] border border-[#2C2C2E]/60 p-6 rounded-xl w-full max-w-[280px] text-center flex flex-col items-center"
            >
              <div className="w-10 h-10 bg-[#FF8DA1]/10 rounded-full flex items-center justify-center text-[#FF8DA1] mb-3">
                <Heart size={20} className="fill-[#FF8DA1]" />
              </div>
              <h4 className="text-base font-semibold text-white">Together</h4>
              <span className="text-[9px] text-[#8E8E93] uppercase tracking-widest mt-0.5">Satu Ruang, Dua Hati</span>
              
              <p className="text-[11px] text-[#8E8E93] mt-3.5 leading-relaxed">
                Together adalah ruang khusus Anda dan pasangan untuk melacak usia cinta, menyimpan dialog hangat, dan mendokumentasikan agenda penting bersama.
              </p>

              <div className="w-full h-[1px] bg-[#2C2C2E]/40 my-3.5"></div>

              <div className="space-y-1 w-full text-left">
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#8E8E93]">Versi</span>
                  <span className="text-white font-mono">1.0.0 (Stable)</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#8E8E93]">Lisensi</span>
                  <span className="text-white">Apache-2.0</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-[#8E8E93]">Kerangka Kerja</span>
                  <span className="text-white">React Core</span>
                </div>
              </div>

              <div className="mt-5 w-full">
                <Button id="about-btn-close" variant="primary" onClick={() => setShowTentangModal(false)}>
                  Tutup
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 2. LOGOUT CONFIRMATION */}
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-[#141414] border border-[#2C2C2E]/60 p-6 rounded-xl w-full max-w-[260px] text-center"
            >
              <h4 className="text-base font-semibold text-white">Konfirmasi Keluar</h4>
              <p className="text-xs text-[#8E8E93] mt-2 leading-relaxed">
                Apakah Anda yakin ingin keluar? Sesi Anda akan berakhir.
              </p>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  id="settings-logout-confirm"
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Ya, Keluar
                </button>
                <button
                  id="settings-logout-cancel"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-2.5 bg-transparent text-[#8E8E93] hover:text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 3. DISCONNECT PLACEHOLDER MODAL */}
        {showDisconnectPlaceholder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-[#141414] border border-[#2C2C2E]/60 p-6 rounded-xl w-full max-w-[260px] text-center"
            >
              <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 mx-auto mb-3">
                <Heart size={20} className="stroke-2" />
              </div>
              <h4 className="text-sm font-semibold text-white">Putuskan Hubungan</h4>
              <p className="text-xs text-[#8E8E93] mt-2 leading-relaxed">
                Fitur pemutusan hubungan saat ini belum tersedia (Placeholder Tahap 5). Fitur ini akan hadir pada tahap selanjutnya.
              </p>
              
              <div className="mt-5">
                <button
                  id="disconnect-placeholder-close"
                  onClick={() => setShowDisconnectPlaceholder(false)}
                  className="w-full py-2 bg-[#FF8DA1] hover:bg-[#FF7A91] text-[#0B0B0B] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Dimengerti
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
};
