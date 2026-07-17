/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../widgets/Button';
import { InputField } from '../widgets/InputField';

interface LupaPasswordProps {
  onNavigate: (screen: 'LOGIN') => void;
}

export const LupaPassword: React.FC<LupaPasswordProps> = ({ onNavigate }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username tidak boleh kosong');
      return;
    }

    setError('');
    setSuccessMessage(`Simulasi: Tautan pengaturan ulang kata sandi telah dikirim untuk pengguna "${username.trim()}".`);
  };

  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-8 px-6 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          id="forgot-btn-back"
          onClick={() => onNavigate('LOGIN')}
          className="w-9 h-9 rounded-xl border border-[#2C2C2E]/60 flex items-center justify-center text-[#8E8E93] hover:text-white hover:border-[#FF8DA1]/30 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-[10px] uppercase text-[#8E8E93] tracking-[0.2em] font-semibold">Lupa Password</span>
        <div className="w-9"></div> {/* spacer */}
      </div>

      {/* Main Content */}
      <div className="my-auto py-6">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white tracking-tight font-sans">Pemulihan Akun</h2>
          <p className="text-sm text-[#8E8E93] mt-2 leading-relaxed">
            Masukkan username Anda di bawah ini. Kami akan mengirimkan simulasi tautan pengaturan ulang kata sandi Anda.
          </p>
        </div>

        {!successMessage ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <InputField
              id="forgot-input-username"
              label="Username"
              value={username}
              onChange={(val) => {
                setUsername(val);
                if (error) setError('');
              }}
              placeholder="Masukkan username terdaftar Anda"
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-400 text-xs mt-1"
              >
                <AlertCircle size={14} />
                <span>{error}</span>
              </motion.div>
            )}

            <div className="mt-4">
              <Button
                id="forgot-btn-submit"
                type="submit"
                variant="primary"
              >
                Kirim
              </Button>
            </div>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#141414] border border-[#2C2C2E]/60 p-6 rounded-xl flex flex-col items-center text-center gap-4"
          >
            <div className="w-10 h-10 bg-green-500/5 text-green-400 rounded-full flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Instruksi Terkirim</h3>
              <p className="text-xs text-[#8E8E93] mt-2 leading-relaxed">
                {successMessage}
              </p>
            </div>
            <Button
              id="forgot-btn-success-back"
              variant="secondary"
              onClick={() => onNavigate('LOGIN')}
              className="mt-2"
            >
              Kembali ke Masuk
            </Button>
          </motion.div>
        )}
      </div>

      {/* Empty footer spacing for layout alignment */}
      <div className="h-8"></div>
    </div>
  );
};
