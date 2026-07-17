/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, Eye, EyeOff, Smartphone, Laptop } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ children }) => {
  const [isSimulated, setIsSimulated] = useState(() => {
    const saved = localStorage.getItem('together_phone_frame_enabled');
    return saved !== 'false'; // Defaults to true if not set
  });
  const [currentTime, setCurrentTime] = useState('08:15');

  useEffect(() => {
    localStorage.setItem('together_phone_frame_enabled', String(isSimulated));
  }, [isSimulated]);

  // Sync with external toggle events from Pengaturan page
  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined) {
        setIsSimulated(customEvent.detail);
      }
    };
    window.addEventListener('together_toggle_phone_frame', handleToggle);
    return () => window.removeEventListener('together_toggle_phone_frame', handleToggle);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isSimulated) {
    return (
      <div className="min-h-screen w-full bg-[#0B0B0B] text-white flex flex-col relative font-sans">
        {/* Small, non-intrusive Floating Action Button (FAB) at the bottom-right */}
        <div className="fixed bottom-6 right-6 z-50">
          <button
            id="toggle-simulator-on"
            onClick={() => setIsSimulated(true)}
            className="w-10 h-10 bg-[#141414]/90 hover:bg-[#1A1A1C] text-[#8E8E93] hover:text-[#FF8DA1] border border-[#2C2C2E]/60 hover:border-[#FF8DA1]/30 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer"
            title="Gunakan Bingkai HP"
          >
            <Smartphone size={16} />
          </button>
        </div>
        {/* Fully responsive container that fills the entire device screen size when phone frame is off */}
        <div className="w-full min-h-screen bg-[#0B0B0B] relative overflow-y-auto flex flex-col flex-1">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#121212] flex flex-col items-center justify-center py-6 px-4 select-none relative font-sans overflow-hidden">
      
      {/* Simulation Banner / Controller */}
      <div className="mb-6 flex flex-col items-center text-center max-w-sm">
        <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
          Together <span className="text-xs bg-[#FF8DA1]/20 text-[#FF8DA1] font-normal px-2 py-0.5 rounded-full border border-[#FF8DA1]/30">Android Prototype</span>
        </h1>
        <p className="text-xs text-[#8E8E93] mt-1.5 leading-relaxed">
          Pondasi desain & navigasi aplikasi mobile premium untuk Anda dan pasangan.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            id="toggle-simulator-off"
            onClick={() => setIsSimulated(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C1E] text-white border border-[#2C2C2E] hover:border-[#FF8DA1] rounded-full text-xs transition-all cursor-pointer"
          >
            <Laptop size={12} />
            <span>Tampilan Layar Penuh</span>
          </button>
        </div>
      </div>

      {/* Modern Phone Device Container */}
      <div className="relative w-[385px] h-[780px] bg-[#000000] rounded-[55px] p-3 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] border-[6px] border-[#252528] flex flex-col items-stretch overflow-hidden">
        
        {/* Phone Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-50 flex items-center justify-center">
          <div className="w-12 h-1 bg-[#1A1A1A] rounded-full absolute top-1"></div>
          <div className="w-2.5 h-2.5 bg-[#09090C] rounded-full border border-[#1A1A1A] absolute right-6"></div>
        </div>

        {/* Outer Bezel glow */}
        <div className="absolute inset-0.5 rounded-[44px] border border-white/5 pointer-events-none z-40"></div>

        {/* Screen Area */}
        <div className="flex-1 bg-[#0B0B0B] rounded-[42px] overflow-hidden flex flex-col relative">
          
          {/* Status Bar */}
          <div className="h-11 px-6 pt-2 flex items-center justify-between text-xs font-medium text-white z-50 bg-[#0B0B0B]">
            <span className="text-[13px] font-semibold tracking-wide">{currentTime}</span>
            <div className="flex items-center gap-1.5">
              <Signal size={14} className="stroke-2 text-white" />
              <Wifi size={14} className="stroke-2 text-white" />
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/90">98%</span>
                <Battery size={16} className="stroke-[1.5] text-[#FF8DA1]" />
              </div>
            </div>
          </div>

          {/* Core Content Area */}
          <div className="flex-1 overflow-y-auto relative flex flex-col scrollbar-none">
            {children}
          </div>

          {/* Android Navigation Gesture Pill */}
          <div className="h-5 flex items-center justify-center bg-[#0B0B0B] z-40">
            <div className="w-32 h-1 bg-white/20 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
