/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Loader2, Camera, Calendar, User as UserIcon, X, Info } from 'lucide-react';
import { Button } from '../widgets/Button';
import { InputField } from '../widgets/InputField';
import { FirebaseAuth, FirebaseFirestore, FirebaseStorage, FirestoreUserDoc } from '../services/firebase';

interface LengkapiProfilProps {
  onComplete: () => void;
  onNavigate: (screen: 'WELCOME' | 'LOGIN') => void;
}

export const LengkapiProfil: React.FC<LengkapiProfilProps> = ({ onComplete, onNavigate }) => {
  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [gender, setGender] = useState<'pria' | 'wanita' | 'lainnya' | ''>('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUser, setIsFetchingUser] = useState(true);
  const [currentUid, setCurrentUid] = useState('');

  // Image upload and permission states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showDeniedModal, setShowDeniedModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch existing Firestore doc if any, to prefill values
  useEffect(() => {
    const fetchUserData = async () => {
      const user = FirebaseAuth.getCurrentUser();
      if (!user) {
        onNavigate('LOGIN');
        return;
      }
      
      setCurrentUid(user.uid);
      try {
        // Force success here during initial auth load check
        const doc = await FirebaseFirestore.getUserDoc(user.uid, true);
        if (doc) {
          if (doc.displayName) setDisplayName(doc.displayName);
          if (doc.birthDate) setBirthDate(doc.birthDate);
          if (doc.photoUrl) setPhotoUrl(doc.photoUrl);
          if (doc.gender) setGender(doc.gender as any);
        }
      } catch (err) {
        console.error('Error fetching profile in CompleteProfile:', err);
      } finally {
        setIsFetchingUser(false);
      }
    };

    fetchUserData();
  }, [onNavigate]);

  // Handle click on avatar/camera button
  const handlePhotoClick = () => {
    const permission = localStorage.getItem('together_gallery_permission') || 'prompt';
    if (permission === 'prompt') {
      setShowPermissionModal(true);
    } else if (permission === 'denied') {
      setShowDeniedModal(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleGrantPermission = () => {
    localStorage.setItem('together_gallery_permission', 'granted');
    setShowPermissionModal(false);
    setShowDeniedModal(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 150);
  };

  const handleDenyPermission = () => {
    localStorage.setItem('together_gallery_permission', 'denied');
    setShowPermissionModal(false);
    setShowDeniedModal(true);
  };

  const handleResetPermission = () => {
    localStorage.setItem('together_gallery_permission', 'prompt');
    setShowDeniedModal(false);
    setShowPermissionModal(true);
  };

  // Compress image to JPEG and upload
  const compressAndUploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    setSelectedFile(file);

    try {
      // Compress image client-side using Canvas
      const compressedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              // Compress to JPEG with 85% quality
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              resolve(dataUrl);
            } else {
              reject(new Error('Gagal memproses gambar.'));
            }
          };
          img.onerror = () => reject(new Error('Format file gambar tidak didukung.'));
          img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
        reader.readAsDataURL(file);
      });

      // Upload to Firebase Storage (simulation)
      const uploadedUrl = await FirebaseStorage.uploadFile(`profile_photos/${currentUid}_${Date.now()}`, compressedDataUrl);
      
      // Immediately set local state
      setPhotoUrl(uploadedUrl);

      // Immediately save to Firestore
      await FirebaseFirestore.setUserDoc(currentUid, {
        photoUrl: uploadedUrl
      });

      // Dispatch real-time presence/profile update event to update the entire app instantly
      window.dispatchEvent(new CustomEvent('together_presence_updated', {
        detail: { uid: currentUid }
      }));

    } catch (err: any) {
      console.error('Photo upload failed:', err);
      setUploadError(err.message || 'Gagal mengunggah foto profil.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndUploadFile(file);
    }
  };

  const handleRetryUpload = () => {
    if (selectedFile) {
      compressAndUploadFile(selectedFile);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Nama Panggilan tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Save details to the Firebase Firestore "users" collection
      await FirebaseFirestore.setUserDoc(currentUid, {
        displayName: displayName.trim(),
        birthDate: birthDate || undefined,
        photoUrl: photoUrl || undefined,
        gender: gender || undefined,
      });
      
      setIsLoading(false);
      onComplete(); // Successfully completed, transition to Home
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Gagal menyimpan profil. Silakan coba lagi.');
    }
  };

  if (isFetchingUser) {
    return (
      <div className="flex-1 bg-[#0B0B0B] flex flex-col items-center justify-center py-12 px-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-[#FF8DA1] mb-4"
        >
          <Loader2 size={32} />
        </motion.div>
        <span className="text-xs text-[#8E8E93] tracking-[0.2em] uppercase font-light">Memuat Profil...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-8 px-6 overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          id="profile-btn-back"
          onClick={() => {
            FirebaseAuth.signOut();
            onNavigate('LOGIN');
          }}
          className="text-xs font-mono tracking-wider text-[#8E8E93] hover:text-[#FF8DA1] transition-colors cursor-pointer"
        >
          Batal & Keluar
        </button>
        <span className="text-xs uppercase text-[#8E8E93] tracking-[0.2em] font-medium">Lengkapi Profil</span>
        <div className="w-16"></div>
      </div>

      {/* Form Container */}
      <div className="my-auto max-w-md mx-auto w-full py-4">
        <div className="mb-8 text-center sm:text-left">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Profil Anda</h2>
          <p className="text-sm text-[#8E8E93] mt-2 leading-relaxed">
            Lengkapi data diri Anda untuk memulai ruang personal Together yang elegan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Avatar / Photo Picker */}
          <div className="flex flex-col items-center justify-center gap-3 mb-4">
            <span className="text-[10px] font-semibold text-[#8E8E93] tracking-[0.15em] uppercase mb-1">
              Foto Profil (Ketuk Untuk Mengubah)
            </span>

            <div className="relative">
              {/* Clickable Profile Circle */}
              <button
                type="button"
                id="profile-avatar-trigger"
                onClick={handlePhotoClick}
                disabled={isUploading}
                className="w-24 h-24 rounded-full bg-[#141414] border-2 border-[#2C2C2E]/60 flex items-center justify-center overflow-hidden relative group hover:border-[#FF8DA1]/50 focus:outline-none transition-all duration-300 shadow-xl cursor-pointer"
              >
                {isUploading ? (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1">
                    <Loader2 size={24} className="animate-spin text-[#FF8DA1]" />
                    <span className="text-[9px] text-[#FF8DA1] font-mono">Uploading...</span>
                  </div>
                ) : photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Foto Profil"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon size={36} className="text-[#8E8E93] group-hover:text-[#FF8DA1] transition-colors" />
                )}

                {/* Subtle Hover Overlay */}
                {!isUploading && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                    <Camera size={18} className="text-white" />
                  </div>
                )}
              </button>

              {/* Overlaid Camera Icon Badge (Also Clickable) */}
              <button
                type="button"
                id="profile-camera-badge"
                onClick={handlePhotoClick}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FF8DA1] text-black border-2 border-[#0B0B0B] flex items-center justify-center hover:bg-[#ff7b92] active:scale-95 transition-all duration-200 shadow-md cursor-pointer focus:outline-none"
              >
                <Camera size={14} />
              </button>
            </div>

            {/* Hidden native input file */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Action Buttons: Coba Lagi / Hapus Foto */}
            <div className="flex flex-col items-center gap-2 mt-1 min-h-[24px]">
              {uploadError ? (
                <div className="flex items-center gap-2 bg-red-950/20 px-3 py-1.5 rounded-full border border-red-500/10">
                  <span className="text-[10px] text-red-400 font-medium">Gagal mengunggah foto.</span>
                  <button
                    type="button"
                    onClick={handleRetryUpload}
                    className="text-[10px] font-semibold text-[#FF8DA1] hover:underline focus:outline-none"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : photoUrl ? (
                <button
                  type="button"
                  id="profile-remove-photo"
                  onClick={async () => {
                    setPhotoUrl('');
                    await FirebaseFirestore.setUserDoc(currentUid, { photoUrl: '' });
                    window.dispatchEvent(new CustomEvent('together_presence_updated', {
                      detail: { uid: currentUid }
                    }));
                  }}
                  className="text-[10px] font-semibold text-red-400/80 hover:text-red-400 hover:underline transition-colors cursor-pointer focus:outline-none"
                >
                  Hapus Foto Profil
                </button>
              ) : (
                <span className="text-[10px] text-[#8E8E93]/80 font-light">
                  Ketuk foto atau ikon kamera untuk memilih
                </span>
              )}
            </div>
          </div>

          {/* Nama Panggilan (Required) */}
          <InputField
            id="profile-input-name"
            label="Nama Panggilan"
            value={displayName}
            disabled={isLoading}
            onChange={(val) => {
              setDisplayName(val);
              if (error) setError('');
            }}
            placeholder="Masukkan nama panggilan Anda"
          />

          {/* Tanggal Lahir (Optional) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold text-[#8E8E93] tracking-[0.15em] uppercase flex items-center gap-1.5">
              <Calendar size={12} />
              Tanggal Lahir (Opsional)
            </label>
            <input
              id="profile-input-birthdate"
              type="date"
              value={birthDate}
              disabled={isLoading}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-[#141414] border border-[#2C2C2E]/60 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#FF8DA1]/80 transition-colors font-mono"
            />
          </div>

          {/* Jenis Kelamin (Optional) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-[#8E8E93] tracking-[0.15em] uppercase flex items-center gap-1.5">
              <UserIcon size={12} />
              Jenis Kelamin (Opsional)
            </span>
            <div className="grid grid-cols-3 gap-3">
              {(['pria', 'wanita', 'lainnya'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setGender(gender === g ? '' : g)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border capitalize transition-all duration-200 cursor-pointer ${
                    gender === g
                      ? 'bg-[#FF8DA1]/5 border-[#FF8DA1] text-[#FF8DA1]'
                      : 'bg-[#141414] border-[#2C2C2E]/60 text-[#8E8E93] hover:border-[#8E8E93]'
                  }`}
                >
                  {g === 'pria' ? 'Pria' : g === 'wanita' ? 'Wanita' : 'Lainnya'}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-red-400 text-xs mt-1 bg-red-950/20 p-3 rounded-xl border border-red-900/30"
            >
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Submit Button */}
          <div className="mt-4">
            <Button
              id="profile-btn-submit"
              type="submit"
              variant="primary"
              disabled={isLoading || isUploading}
              className="relative flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  <span>Menyimpan Profil...</span>
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </div>

        </form>
      </div>

      {/* Footer spacing */}
      <div className="h-8"></div>

      {/* Custom Permission Modals with Framer Motion animations */}
      <AnimatePresence>
        {/* Custom Permission Request Modal */}
        {showPermissionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={handleDenyPermission}
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#141414] border border-[#2C2C2E]/60 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 z-10"
            >
              <div className="w-12 h-12 rounded-full bg-[#FF8DA1]/10 text-[#FF8DA1] flex items-center justify-center">
                <Camera size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Izin Akses Galeri</h3>
                <p className="text-xs text-[#8E8E93] leading-relaxed">
                  Together memerlukan akses ke galeri foto Anda untuk dapat memilih dan mengunggah foto profil.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={handleDenyPermission}
                  className="py-2.5 px-4 rounded-xl border border-[#2C2C2E]/60 text-xs font-semibold text-[#8E8E93] hover:text-white transition-colors cursor-pointer focus:outline-none"
                >
                  Tolak
                </button>
                <button
                  type="button"
                  onClick={handleGrantPermission}
                  className="py-2.5 px-4 rounded-xl bg-[#FF8DA1] text-black text-xs font-semibold hover:bg-[#ff7b92] transition-colors cursor-pointer focus:outline-none"
                >
                  Izinkan
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Permission Denied Explanation Modal */}
        {showDeniedModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowDeniedModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#141414] border border-red-500/20 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-4 z-10"
            >
              <div className="w-12 h-12 rounded-full bg-red-950/30 text-red-400 flex items-center justify-center">
                <Info size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Akses Galeri Diperlukan</h3>
                <p className="text-xs text-[#8E8E93] leading-relaxed">
                  Akses galeri tidak diizinkan. Together memerlukan izin galeri untuk memilih foto profil Anda. Silakan beri izin untuk melanjutkan.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={handleResetPermission}
                  className="py-2.5 px-4 rounded-xl bg-[#FF8DA1] text-black text-xs font-semibold hover:bg-[#ff7b92] transition-colors cursor-pointer focus:outline-none"
                >
                  Beri Izin Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeniedModal(false)}
                  className="py-2 px-4 text-xs text-[#8E8E93] hover:text-white transition-colors cursor-pointer focus:outline-none"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
