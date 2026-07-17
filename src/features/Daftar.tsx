/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../widgets/Button';
import { InputField } from '../widgets/InputField';
import { FirebaseAuth } from '../services/firebase';

interface DaftarProps {
  onNavigate: (screen: 'WELCOME' | 'LOGIN' | 'HOME') => void;
}

export const Daftar: React.FC<DaftarProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Detailed elegant validation
    if (!username.trim() && !password && !confirmPassword) {
      setError('Harap lengkapi semua bidang pendaftaran');
      return;
    }
    if (!username.trim()) {
      setError('Username tidak boleh kosong');
      return;
    }
    if (!password) {
      setError('Password tidak boleh kosong');
      return;
    }
    if (!confirmPassword) {
      setError('Konfirmasi password tidak boleh kosong');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal harus 8 karakter');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Form an email from username if not present for mock Firebase Auth API similarity
      const mockEmail = username.includes('@') ? username : `${username.toLowerCase().replace(/\s+/g, '')}@together.com`;
      await FirebaseAuth.createUserWithEmailAndPassword(mockEmail, password, username);
      setIsLoading(false);
      setShowSuccessDialog(true);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Pendaftaran gagal. Silakan coba lagi.');
    }
  };

  const handleDialogConfirm = () => {
    setShowSuccessDialog(false);
    onNavigate('LOGIN');
  };

  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-8 px-6 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          id="register-btn-back"
          onClick={() => onNavigate('WELCOME')}
          disabled={isLoading}
          className="w-9 h-9 rounded-xl border border-[#2C2C2E]/60 flex items-center justify-center text-[#8E8E93] hover:text-white hover:border-[#FF8DA1]/30 transition-colors cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-[10px] uppercase text-[#8E8E93] tracking-[0.2em] font-semibold">Daftar</span>
        <div className="w-9"></div> {/* spacer */}
      </div>

      {/* Form Area */}
      <div className="my-auto py-4">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Daftar Akun Baru</h2>
          <p className="text-sm text-[#8E8E93] mt-2 leading-relaxed">Mulai buat ruang pribadi yang spesial bersama pasangan Anda.</p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <InputField
            id="register-input-username"
            label="Username"
            value={username}
            disabled={isLoading}
            onChange={(val) => {
              setUsername(val);
              if (error) setError('');
            }}
            placeholder="Masukkan username baru Anda"
          />

          <InputField
            id="register-input-password"
            label="Password"
            type="password"
            value={password}
            disabled={isLoading}
            onChange={(val) => {
              setPassword(val);
              if (error) setError('');
            }}
            placeholder="Minimal 8 karakter"
          />

          <InputField
            id="register-input-confirm-password"
            label="Konfirmasi Password"
            type="password"
            value={confirmPassword}
            disabled={isLoading}
            onChange={(val) => {
              setConfirmPassword(val);
              if (error) setError('');
            }}
            placeholder="Ulangi password Anda"
          />

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

          <div className="mt-4">
            <Button
              id="register-btn-submit"
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="relative flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  <span>Mendaftarkan...</span>
                </>
              ) : (
                'Daftar'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Footer link to Login */}
      <div className="text-center pb-2">
        <p className="text-xs text-[#8E8E93]">
          Sudah memiliki akun?{' '}
          <button
            id="register-btn-go-to-login"
            disabled={isLoading}
            onClick={() => onNavigate('LOGIN')}
            className="text-[#FF8DA1] font-semibold hover:text-[#FF7A91] ml-1 cursor-pointer focus:outline-none disabled:opacity-50"
          >
            Masuk
          </button>
        </p>
      </div>

      {/* Success Dialog Modal Box */}
      <AnimatePresence>
        {showSuccessDialog && (
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
              className="bg-[#141414] border border-[#2C2C2E]/60 p-6 rounded-xl w-full max-w-[260px] text-center flex flex-col items-center"
            >
              <div className="w-10 h-10 bg-green-500/5 text-green-400 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 size={20} />
              </div>
              <h4 className="text-base font-semibold text-white">Sukses</h4>
              <p className="text-xs text-[#8E8E93] mt-2.5 leading-relaxed">
                Pendaftaran berhasil.
              </p>
              <div className="mt-5 w-full">
                <Button
                  id="register-success-confirm"
                  variant="primary"
                  onClick={handleDialogConfirm}
                >
                  Masuk Sekarang
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
