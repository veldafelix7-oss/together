/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Copy, 
  Share2, 
  RefreshCw, 
  Heart, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2,
  Check,
  Smartphone,
  MessageCircle,
  Send,
  Instagram,
  MessageSquare,
  Info
} from 'lucide-react';
import { FirebaseAuth, FirebaseFirestore, InvitationCode, FirestoreUserDoc } from '../services/firebase';

interface HubungkanPasanganProps {
  onNavigate: (screen: 'HOME' | 'SETTINGS') => void;
  onConnectSuccess: () => void;
}

export const HubungkanPasangan: React.FC<HubungkanPasanganProps> = ({ onNavigate, onConnectSuccess }) => {
  const [currentUserUid, setCurrentUserUid] = useState<string>('');
  const [invitation, setInvitation] = useState<InvitationCode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  
  // Input for partner's code
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [isExpired, setIsExpired] = useState(false);

  // Copy feedback state
  const [copied, setCopied] = useState(false);

  // Share menu state
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Confirmation dialog state
  const [pendingPartner, setPendingPartner] = useState<FirestoreUserDoc | null>(null);

  // Custom Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Load current user & active code if any
  useEffect(() => {
    const user = FirebaseAuth.getCurrentUser();
    if (user) {
      setCurrentUserUid(user.uid);
      
      // Check if user has an active code
      FirebaseFirestore.getInvitationCodeForUser(user.uid).then((activeInv) => {
        if (activeInv) {
          setInvitation(activeInv);
          calculateTimeLeft(activeInv.expiresAt);
        }
      });
    }
  }, []);

  // Timer countdown hook
  useEffect(() => {
    if (!invitation || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [invitation, timeLeft]);

  // Helper to calculate seconds left
  const calculateTimeLeft = (expiresAtStr: string) => {
    const expiresAt = new Date(expiresAtStr).getTime();
    const now = new Date().getTime();
    const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
    setTimeLeft(diff);
    setIsExpired(diff <= 0);
  };

  // Generate a new code
  const handleGenerateCode = async () => {
    if (!currentUserUid) return;
    setIsGenerating(true);
    setInputError(null);
    try {
      const newInv = await FirebaseFirestore.generateInvitationCode(currentUserUid);
      setInvitation(newInv);
      calculateTimeLeft(newInv.expiresAt);
    } catch (err: any) {
      setInputError('Gagal membuat kode undangan.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!invitation) return;
    navigator.clipboard.writeText(invitation.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Share Code Trigger
  const handleShareCode = async () => {
    if (!invitation) return;
    const shareText = `Halo! Yuk terhubung di aplikasi Together denganku menggunakan kode undangan ini: ${invitation.code} (Berlaku selama 10 menit).`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Undangan Together',
          text: shareText,
        });
      } catch {
        // Fallback to overlay
        setShowShareMenu(true);
      }
    } else {
      setShowShareMenu(true);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Validate entered code & check partner details
  const handleConnectRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const code = partnerCodeInput.trim().toUpperCase();
    if (!code) {
      setInputError('Kode pasangan tidak boleh kosong.');
      return;
    }

    setIsCheckingCode(true);
    try {
      const partnerDoc = await FirebaseFirestore.validateAndGetPartnerForCode(code, currentUserUid);
      setPendingPartner(partnerDoc);
    } catch (err: any) {
      setInputError(err.message || 'Kode tidak valid.');
    } finally {
      setIsCheckingCode(false);
    }
  };

  // Final Connection Approval
  const handleConfirmConnect = async () => {
    if (!pendingPartner) return;
    setIsConnecting(true);
    setInputError(null);
    try {
      await FirebaseFirestore.connectPartners(currentUserUid, pendingPartner.uid);
      setPendingPartner(null);
      onConnectSuccess();
    } catch (err: any) {
      setInputError(err.message || 'Gagal menghubungkan pasangan.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-8 px-6 font-sans relative">
      
      {/* App Header Bar */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <button
            id="connect-btn-back"
            onClick={() => onNavigate('HOME')}
            className="w-9 h-9 rounded-xl border border-[#2C2C2E]/60 flex items-center justify-center text-[#8E8E93] hover:text-white hover:border-[#FF8DA1]/30 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-[10px] uppercase text-[#8E8E93] tracking-[0.2em] font-semibold">Hubungkan Pasangan</span>
          <div className="w-9"></div> {/* spacer */}
        </div>

        {/* Introduction Panel */}
        <div className="text-center max-w-sm mx-auto mb-8">
          <div className="w-10 h-10 bg-[#FF8DA1]/5 text-[#FF8DA1] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#FF8DA1]/10">
            <Heart size={18} className="fill-[#FF8DA1]/20" />
          </div>
          <h2 className="text-base font-semibold text-white tracking-tight">Hubungkan Pasangan</h2>
          <p className="text-xs text-[#8E8E93] mt-2 leading-relaxed px-4">
            Hubungkan akun Anda dengan pasangan agar dapat menggunakan seluruh fitur Together secara langsung dan sinkron.
          </p>
        </div>
      </div>

      {/* Main Connection Workspace */}
      <div className="my-auto space-y-8 max-w-md mx-auto w-full">
        
        {/* SECTION 1: CREATE CODE */}
        <div className="space-y-3">
          <span className="text-[10px] font-semibold text-[#8E8E93] tracking-[0.15em] uppercase px-1">
            Bagian 1: Buat Kode Anda
          </span>

          {!invitation ? (
            <button
              id="connect-btn-generate"
              onClick={handleGenerateCode}
              disabled={isGenerating}
              className="w-full py-3 bg-[#141414] hover:bg-[#1C1C1E] text-white border border-[#2C2C2E]/60 hover:border-[#FF8DA1]/30 transition-all rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin text-[#FF8DA1]" />
              ) : (
                <RefreshCw size={14} className="text-[#FF8DA1]" />
              )}
              {isGenerating ? 'Membuat Kode...' : 'Buat Kode Undangan'}
            </button>
          ) : (
            <div className="bg-[#141414] border border-[#2C2C2E]/60 rounded-xl p-4.5 space-y-4">
              <div className="flex flex-col items-center text-center">
                <span className="text-[9px] uppercase tracking-wider text-[#8E8E93] mb-1">Kode Undangan Anda</span>
                <span className="text-2xl font-mono font-bold text-[#FF8DA1] tracking-widest select-all">
                  {invitation.code}
                </span>
                
                {/* Countdown display */}
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#8E8E93]">
                  <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
                  <span>
                    {isExpired ? 'Kode kadaluarsa.' : `Berlaku selama ${formatTime(timeLeft)}`}
                  </span>
                </div>
              </div>

              {/* Code actions row */}
              <div className="grid grid-cols-3 gap-2 border-t border-[#2C2C2E]/30 pt-3">
                <button
                  id="connect-btn-copy"
                  onClick={handleCopyCode}
                  className="py-2 px-1 bg-[#1A1A1C] hover:bg-[#222] text-xs font-medium text-white rounded-lg flex flex-col items-center justify-center gap-1 border border-[#2C2C2E]/40 cursor-pointer transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-[#8E8E93]" />}
                  <span className="text-[9px]">{copied ? 'Tersalin' : 'Salin'}</span>
                </button>

                <button
                  id="connect-btn-share"
                  onClick={handleShareCode}
                  className="py-2 px-1 bg-[#1A1A1C] hover:bg-[#222] text-xs font-medium text-white rounded-lg flex flex-col items-center justify-center gap-1 border border-[#2C2C2E]/40 cursor-pointer transition-colors"
                >
                  <Share2 size={14} className="text-[#8E8E93]" />
                  <span className="text-[9px]">Bagikan</span>
                </button>

                <button
                  id="connect-btn-refresh"
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                  className="py-2 px-1 bg-[#1A1A1C] hover:bg-[#222] text-xs font-medium text-white rounded-lg flex flex-col items-center justify-center gap-1 border border-[#2C2C2E]/40 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={14} className="animate-spin text-[#FF8DA1]" /> : <RefreshCw size={14} className="text-[#FF8DA1]" />}
                  <span className="text-[9px]">Perbarui</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: INPUT PARTNER'S CODE */}
        <div className="space-y-3">
          <span className="text-[10px] font-semibold text-[#8E8E93] tracking-[0.15em] uppercase px-1">
            Bagian 2: Masukkan Kode Pasangan
          </span>

          <form onSubmit={handleConnectRequest} className="space-y-3.5">
            <div className="relative">
              <input
                id="connect-input-partner-code"
                type="text"
                value={partnerCodeInput}
                onChange={(e) => {
                  setPartnerCodeInput(e.target.value.toUpperCase());
                  setInputError(null);
                }}
                placeholder="Contoh: TG-8K4M2P"
                className="w-full bg-[#141414] border border-[#2C2C2E]/60 rounded-xl px-4 py-3 text-sm text-white placeholder-[#8E8E93]/40 focus:outline-none focus:border-[#FF8DA1]/80 transition-colors tracking-widest text-center uppercase font-mono"
              />
            </div>

            {inputError && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 text-red-400 text-[11px] px-1"
              >
                <AlertCircle size={12} className="shrink-0" />
                <span>{inputError}</span>
              </motion.div>
            )}

            <button
              id="connect-btn-submit"
              type="submit"
              disabled={isCheckingCode}
              className="w-full py-3 bg-[#FF8DA1] hover:bg-[#FF7A91] text-[#0B0B0B] rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {isCheckingCode ? (
                <Loader2 size={14} className="animate-spin text-[#0B0B0B]" />
              ) : null}
              {isCheckingCode ? 'Memvalidasi...' : 'Hubungkan'}
            </button>
          </form>
        </div>

      </div>

      <div className="h-6"></div> {/* spacer at bottom */}

      {/* CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {pendingPartner && (
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
              
              <h4 className="text-sm font-semibold text-white tracking-tight">Konfirmasi Pasangan</h4>
              
              {/* Partner Details Card */}
              <div className="my-4 flex flex-col items-center">
                {pendingPartner.photoUrl ? (
                  <img 
                    src={pendingPartner.photoUrl} 
                    alt={pendingPartner.displayName} 
                    className="w-12 h-12 rounded-full object-cover border border-[#FF8DA1]/30 mb-2"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#1A1A1C] border border-[#2C2C2E]/50 flex items-center justify-center text-[#8E8E93] mb-2">
                    <CheckCircle2 size={18} />
                  </div>
                )}
                <span className="text-sm font-semibold text-white block">{pendingPartner.displayName || 'Nama Pasangan'}</span>
                <span className="text-[10px] font-mono text-[#8E8E93]">@{pendingPartner.username}</span>
              </div>

              <p className="text-[11px] text-[#8E8E93] leading-relaxed mb-5">
                Apakah Anda yakin ingin menghubungkan akun dengan pengguna ini?
              </p>

              <div className="w-full flex flex-col gap-2">
                <button
                  id="connect-confirm-yes"
                  onClick={handleConfirmConnect}
                  disabled={isConnecting}
                  className="w-full py-2.5 bg-[#FF8DA1] hover:bg-[#FF7A91] text-[#0B0B0B] font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isConnecting ? <Loader2 size={12} className="animate-spin" /> : null}
                  {isConnecting ? 'Menghubungkan...' : 'Ya, Hubungkan'}
                </button>
                <button
                  id="connect-confirm-no"
                  onClick={() => setPendingPartner(null)}
                  disabled={isConnecting}
                  className="w-full py-2 bg-transparent hover:text-white text-[#8E8E93] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHARE OPTIONS BOTTOM SHEET MODAL (Fallback) */}
      <AnimatePresence>
        {showShareMenu && invitation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareMenu(false)}
            className="absolute inset-0 bg-black/80 z-50 flex items-end justify-center"
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border-t border-[#2C2C2E]/60 rounded-t-2xl w-full p-6 pb-8 space-y-4 text-center max-w-sm mx-auto"
            >
              <div className="flex items-center justify-between border-b border-[#2C2C2E]/30 pb-3">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">Bagikan Kode Undangan</span>
                <button 
                  onClick={() => setShowShareMenu(false)}
                  className="text-xs text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-4 py-2">
                <button
                  onClick={() => {
                    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Yuk connect di Together! Kode: ${invitation.code}`)}`;
                    window.open(url, '_blank');
                    setShowShareMenu(false);
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer text-[#8E8E93] hover:text-white"
                >
                  <div className="w-10 h-10 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center">
                    <MessageCircle size={18} />
                  </div>
                  <span className="text-[9px]">WhatsApp</span>
                </button>

                <button
                  onClick={() => {
                    const url = `https://t.me/share/url?url=${encodeURIComponent('https://together-app.com')}&text=${encodeURIComponent(`Connect di Together yuk! Kode: ${invitation.code}`)}`;
                    window.open(url, '_blank');
                    setShowShareMenu(false);
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer text-[#8E8E93] hover:text-white"
                >
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center">
                    <Send size={18} />
                  </div>
                  <span className="text-[9px]">Telegram</span>
                </button>

                <button
                  onClick={() => {
                    // Instagram fallback
                    showToast(`Kode Anda: ${invitation.code}\nKode disalin! Kirimkan via DM Instagram pasangan Anda.`, 'success');
                    navigator.clipboard.writeText(invitation.code);
                    setShowShareMenu(false);
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer text-[#8E8E93] hover:text-white"
                >
                  <div className="w-10 h-10 bg-[#FF8DA1]/10 text-[#FF8DA1] rounded-full flex items-center justify-center">
                    <Instagram size={18} />
                  </div>
                  <span className="text-[9px]">Instagram</span>
                </button>

                <button
                  onClick={() => {
                    const url = `sms:?body=${encodeURIComponent(`Connect di Together yuk! Kode: ${invitation.code}`)}`;
                    window.open(url, '_blank');
                    setShowShareMenu(false);
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer text-[#8E8E93] hover:text-white"
                >
                  <div className="w-10 h-10 bg-orange-500/10 text-orange-400 rounded-full flex items-center justify-center">
                    <MessageSquare size={18} />
                  </div>
                  <span className="text-[9px]">SMS</span>
                </button>
              </div>

              <div className="text-[10px] text-[#8E8E93] italic">
                Pilih aplikasi untuk mengirimkan kode undangan {invitation.code}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Custom Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-[60] pointer-events-none flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl flex items-center gap-2 pointer-events-auto max-w-xs whitespace-pre-line ${
                toastMessage.type === 'success' 
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
                  : 'bg-zinc-900/95 border-[#FF8DA1]/30 text-[#FF8DA1]'
              }`}
            >
              <Info size={14} className={`shrink-0 ${toastMessage.type === 'success' ? 'text-emerald-400' : 'text-[#FF8DA1]'}`} />
              <span>{toastMessage.text}</span>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

    </div>
  );
};
