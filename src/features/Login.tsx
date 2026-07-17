/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../widgets/Button';
import { InputField } from '../widgets/InputField';
import { FirebaseAuth, FirebaseFirestore } from '../services/firebase';
import { StorageService } from '../services/storage';

interface LoginProps {
  onNavigate: (screen: 'WELCOME' | 'REGISTER' | 'HOME' | 'FORGOT_PASSWORD' | 'COMPLETE_PROFILE') => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Detailed validation
    if (!username.trim() && !password) {
      setError('Username/Email dan Password tidak boleh kosong');
      return;
    }
    if (!username.trim()) {
      setError('Username atau Email tidak boleh kosong');
      return;
    }
    if (!password) {
      setError('Password tidak boleh kosong');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal terdiri dari 8 karakter');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Authenticate via simulated FirebaseAuth
      const user = await FirebaseAuth.signInWithEmailAndPassword(username, password);
      StorageService.setLoggedIn(true);

      // Check if profile is complete in Firestore
      const doc = await FirebaseFirestore.getUserDoc(user.uid, true); // force success for login path
      setIsLoading(false);
      
      if (doc && doc.displayName) {
        onNavigate('HOME');
      } else {
        onNavigate('COMPLETE_PROFILE');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Gagal masuk. Silakan periksa kembali akun Anda.');
    }
  };

  const selectGoogleAccount = async (email: string, displayName: string) => {
    setShowGoogleDialog(false);
    setIsLoading(true);
    setError('');
    
    try {
      const user = await FirebaseAuth.signInWithGoogle(email, displayName);
      StorageService.setLoggedIn(true);

      // Check if profile is complete in Firestore
      const doc = await FirebaseFirestore.getUserDoc(user.uid, true); // force success for login path
      setIsLoading(false);

      if (doc && doc.displayName) {
        onNavigate('HOME');
      } else {
        onNavigate('COMPLETE_PROFILE');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Gagal masuk dengan Google.');
    }
  };

  const handleForgotPassword = () => {
    onNavigate('FORGOT_PASSWORD');
  };

  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-8 px-6 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          id="login-btn-back"
          onClick={() => onNavigate('WELCOME')}
          disabled={isLoading}
          className="w-9 h-9 rounded-xl border border-[#2C2C2E]/60 flex items-center justify-center text-[#8E8E93] hover:text-white hover:border-[#FF8DA1]/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-[10px] uppercase text-[#8E8E93] tracking-[0.2em] font-semibold">Masuk</span>
        <div className="w-9"></div> {/* spacer to center */}
      </div>

      {/* Main Form Area */}
      <div className="my-auto py-6">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Selamat Datang Kembali</h2>
          <p className="text-sm text-[#8E8E93] mt-2 leading-relaxed">Masuk untuk terhubung kembali dengan pasangan Anda.</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <InputField
            id="login-input-username"
            label="Username atau Email"
            value={username}
            disabled={isLoading}
            onChange={(val) => {
              setUsername(val);
              if (error) setError('');
            }}
            placeholder="Masukkan username atau email Anda"
          />

          <InputField
            id="login-input-password"
            label="Password"
            type="password"
            value={password}
            disabled={isLoading}
            onChange={(val) => {
              setPassword(val);
              if (error) setError('');
            }}
            placeholder="Masukkan password Anda"
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

          {/* Forgot password */}
          <div className="flex justify-end -mt-2">
            <button
              id="login-btn-forgot"
              type="button"
              disabled={isLoading}
              onClick={handleForgotPassword}
              className="text-xs text-[#FF8DA1] hover:text-[#FF7A91] transition-colors font-medium cursor-pointer disabled:opacity-50"
            >
              Lupa Password?
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <Button
              id="login-btn-submit"
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="relative flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  <span>Memproses...</span>
                </>
              ) : (
                'Masuk'
              )}
            </Button>

            <Button
              id="login-btn-google"
              type="button"
              variant="google"
              disabled={isLoading}
              onClick={() => setShowGoogleDialog(true)}
            >
              {/* Google G Custom SVG Vector */}
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                <path
                  fill="#FF8DA1"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#8E8E93"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#8E8E93"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#8E8E93"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Masuk dengan Google
            </Button>
          </div>
        </form>
      </div>

      {/* Footer link to Register */}
      <div className="text-center pb-2">
        <p className="text-xs text-[#8E8E93]">
          Belum punya akun?{' '}
          <button
            id="login-btn-go-to-register"
            disabled={isLoading}
            onClick={() => onNavigate('REGISTER')}
            className="text-[#FF8DA1] font-semibold hover:text-[#FF7A91] ml-1 cursor-pointer focus:outline-none disabled:opacity-50"
          >
            Daftar
          </button>
        </p>
      </div>

      {/* Elegant Minimalist Google Account Selector Modal */}
      <AnimatePresence>
        {showGoogleDialog && (
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
              className="bg-[#141414] border border-[#2C2C2E]/60 p-6 rounded-xl w-full max-w-[280px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4 border-b border-[#2C2C2E]/40 pb-3">
                <h4 className="text-xs font-semibold text-white tracking-wide">Pilih akun Google</h4>
                <button 
                  onClick={() => setShowGoogleDialog(false)}
                  className="text-xs text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <p className="text-[11px] text-[#8E8E93] mb-4 leading-relaxed">
                Pilih salah satu akun Google berikut untuk melanjutkan ke aplikasi Together:
              </p>

              <div className="flex flex-col gap-2">
                {/* Account 1: Levina */}
                <button
                  onClick={() => selectGoogleAccount('levina6404@gmail.com', 'Levina')}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#1C1C1E] transition-colors text-left w-full cursor-pointer border border-[#2C2C2E]/40"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FF8DA1]/10 flex items-center justify-center text-xs font-semibold text-[#FF8DA1]">
                    L
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-medium text-white truncate">Levina</span>
                    <span className="text-[10px] text-[#8E8E93] truncate">levina6404@gmail.com</span>
                  </div>
                </button>

                {/* Account 2: Together Guest */}
                <button
                  onClick={() => selectGoogleAccount('guest@together.com', 'Together Guest')}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#1C1C1E] transition-colors text-left w-full cursor-pointer border border-[#2C2C2E]/40"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-semibold text-blue-400">
                    G
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-medium text-white truncate">Together Guest</span>
                    <span className="text-[10px] text-[#8E8E93] truncate">guest@together.com</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

