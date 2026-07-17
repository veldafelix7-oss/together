/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Plus, 
  MapPin, 
  Heart, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  Camera, 
  Image as ImageIcon, 
  Smile, 
  X, 
  Sparkles, 
  CalendarDays, 
  User, 
  TrendingUp, 
  Calendar, 
  SlidersHorizontal,
  Loader2,
  Info,
  CheckCircle2
} from 'lucide-react';
import { FirebaseFirestore, FirebaseAuth, Memory, FirestoreUserDoc } from '../services/firebase';
import { Screen } from '../models/types';

// Preset pictures for easy aesthetic testing and demonstration
const PRESET_GALLERY = [
  {
    name: 'Kencan Makan Malam',
    url: 'https://images.unsplash.com/photo-1517857399767-96589f244a21?w=600&auto=format&fit=crop&q=80',
    description: 'Menikmati malam romantis berdua.'
  },
  {
    name: 'Senja di Pantai',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
    description: 'Menatap matahari terbenam bersama.'
  },
  {
    name: 'Santai di Kafe',
    url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=80',
    description: 'Secangkir kopi hangat dan obrolan manis.'
  },
  {
    name: 'Petualangan Alam',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
    description: 'Mendaki dan menghirup udara segar bersama.'
  }
];

const MOODS = [
  { label: 'Bahagia', emoji: '😊', color: '#FFF4E5' },
  { label: 'Romantis', emoji: '❤️', color: '#FFEBEF' },
  { label: 'Bersyukur', emoji: '✨', color: '#E8F5E9' },
  { label: 'Damai', emoji: '🍃', color: '#E3F2FD' },
  { label: 'Seru', emoji: '🎉', color: '#F3E5F5' },
];

interface TimelineKenanganProps {
  onNavigate: (screen: Screen) => void;
}

export const TimelineKenangan: React.FC<TimelineKenanganProps> = ({ onNavigate }) => {
  const [currentUserDoc, setCurrentUserDoc] = useState<FirestoreUserDoc | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'photo' | 'no_photo'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Interactive UI State
  const [activeTab, setActiveTab] = useState<'timeline' | 'statistics'>('timeline');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editMemoryId, setEditMemoryId] = useState<string | null>(null);

  // Form Field State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formLocation, setFormLocation] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formMood, setFormMood] = useState('');

  // Media Capture State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showPresetSelector, setShowPresetSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Custom Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const showToast = (text: string, type: 'error' | 'success' = 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch / Sync initial user and real-time memories
  useEffect(() => {
    const user = FirebaseAuth.getCurrentUser();
    if (!user) {
      onNavigate('LOGIN');
      return;
    }

    // Load user doc
    FirebaseFirestore.getUserDoc(user.uid, true).then(doc => {
      if (doc) {
        setCurrentUserDoc(doc);
      }
    });

    // Real-time synchronization
    const unsubscribe = FirebaseFirestore.subscribeMemories(user.uid, (data) => {
      setMemories(data);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [onNavigate]);

  // Clean camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle camera init
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Kamera tidak dapat diakses atau sedang digunakan aplikasi lain.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setFormPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  // Handle local file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Open Form for Adding
  const openAddForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormLocation('');
    setFormPhoto('');
    setFormMood('');
    setIsEditing(false);
    setEditMemoryId(null);
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const openEditForm = (memory: Memory) => {
    setFormTitle(memory.title);
    setFormDescription(memory.description);
    setFormDate(memory.date);
    setFormLocation(memory.location || '');
    setFormPhoto(memory.photoUrl || '');
    setFormMood(memory.mood || '');
    setIsEditing(true);
    setEditMemoryId(memory.id);
    setIsFormOpen(true);
    setSelectedMemory(null); // Close detail view
  };

  // Handle Add/Edit Save
  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim() || !formDate) {
      showToast('Judul, Deskripsi, dan Tanggal wajib diisi.');
      return;
    }

    const user = FirebaseAuth.getCurrentUser();
    if (!user || !currentUserDoc) return;

    setIsSaving(true);
    try {
      const coupleIds = currentUserDoc.partnerId 
        ? [user.uid, currentUserDoc.partnerId].sort() 
        : [user.uid];

      if (isEditing && editMemoryId) {
        await FirebaseFirestore.updateMemory(editMemoryId, {
          title: formTitle.trim(),
          description: formDescription.trim(),
          date: formDate,
          location: formLocation.trim() || undefined,
          photoUrl: formPhoto || undefined,
          mood: formMood || undefined,
        });
        showToast('Kenangan berhasil diperbarui!', 'success');
      } else {
        await FirebaseFirestore.addMemory({
          title: formTitle.trim(),
          description: formDescription.trim(),
          date: formDate,
          location: formLocation.trim() || undefined,
          photoUrl: formPhoto || undefined,
          mood: formMood || undefined,
          creatorId: user.uid,
          creatorName: currentUserDoc.displayName || 'Pasanganmu',
          coupleIds,
        });
        showToast('Kenangan indah baru telah disimpan!', 'success');
      }

      setIsFormOpen(false);
      stopCamera();
    } catch (err: any) {
      showToast('Gagal menyimpan kenangan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleDeleteMemory = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await FirebaseFirestore.deleteMemory(deleteConfirmId);
      setDeleteConfirmId(null);
      setSelectedMemory(null); // Close detail if open
      showToast('Kenangan telah dihapus.', 'success');
    } catch (err: any) {
      showToast('Gagal menghapus kenangan: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Favorite Status
  const handleToggleFavorite = async (memory: Memory, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await FirebaseFirestore.updateMemory(memory.id, {
        isFavorite: !memory.isFavorite
      });
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // Dynamic extract years & months from memories for filters
  const extractedYears = Array.from(new Set(memories.map(m => m.date.split('-')[0]))) as string[];
  const years = ['all', ...extractedYears].sort((a, b) => b.localeCompare(a));
  const monthsList = [
    { value: 'all', label: 'Semua Bulan' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  // Filtering Logic
  const filteredMemories = memories.filter(memory => {
    // 1. Search Query
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      memory.title.toLowerCase().includes(query) || 
      memory.description.toLowerCase().includes(query) || 
      memory.date.includes(query);

    // 2. Photo Filter
    const matchesPhoto = photoFilter === 'all' || 
      (photoFilter === 'photo' && !!memory.photoUrl) || 
      (photoFilter === 'no_photo' && !memory.photoUrl);

    // 3. Year Filter
    const parts = memory.date.split('-');
    const matchesYear = selectedYear === 'all' || parts[0] === selectedYear;

    // 4. Month Filter
    const matchesMonth = selectedMonth === 'all' || parts[1] === selectedMonth;

    return matchesSearch && matchesPhoto && matchesYear && matchesMonth;
  });

  // Calculate Accurate Stats
  const totalKenangan = memories.length;
  const totalFoto = memories.filter(m => !!m.photoUrl).length;
  
  // Hari bersama calculation (from current anniversary date in userDoc)
  const getDaysTogether = () => {
    if (!currentUserDoc?.relationshipStartDate) return 0;
    const parts = currentUserDoc.relationshipStartDate.split('-');
    if (parts.length !== 3) return 0;
    const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - start.getTime();
    return diffTime < 0 ? 0 : Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };
  const daysTogether = getDaysTogether();

  // Check relationship status
  const isConnected = currentUserDoc?.relationshipStatus === 'connected';

  if (!isLoading && !isConnected) {
    return (
      <div className="flex-1 bg-[#0B0B0B] flex flex-col h-full font-sans overflow-hidden text-white">
        <div className="px-6 py-4 border-b border-[#1C1C1E] flex items-center justify-between shrink-0">
          <button 
            id="btn-back-to-home-locked"
            onClick={() => onNavigate('HOME')}
            className="p-1.5 hover:bg-[#141414] rounded-full transition-colors cursor-pointer text-[#8E8E93] hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-xs font-semibold tracking-[0.25em] uppercase text-white">together</span>
          <div className="w-8"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto">
          <div className="w-14 h-14 bg-[#FF8DA1]/5 rounded-full flex items-center justify-center text-[#FF8DA1] border border-[#FF8DA1]/15 mb-6">
            <User size={20} className="stroke-[1.5]" />
          </div>
          <h2 className="text-sm font-semibold text-white tracking-tight">Timeline Kenangan Terkunci</h2>
          <p className="text-xs text-[#8E8E93] leading-relaxed mt-2.5">
            Fitur Timeline Kenangan adalah ruang khusus berdua untuk menyimpan cerita, mood, lokasi, dan foto setiap momen penting hubungan kalian.
          </p>
          <p className="text-xs text-pink-400/80 mt-2 font-medium">
            Hubungkan pasangan Anda terlebih dahulu di halaman Home untuk membuka fitur ini.
          </p>
          <button
            id="locked-btn-connect"
            onClick={() => onNavigate('HOME')}
            className="mt-8 px-5 py-2.5 bg-[#FF8DA1] hover:bg-[#FF7A91] text-[#0B0B0B] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // Kenangan Bulan Ini
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const kenanganBulanIni = memories.filter(m => m.date.startsWith(currentMonthStr)).length;

  // Format Indonesian Date
  const formatIndonesianDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  };

  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col h-full font-sans overflow-hidden text-white">
      {/* 1. TOP HEADER ZONE */}
      <div className="px-6 py-4 border-b border-[#1C1C1E] flex items-center justify-between shrink-0">
        <button 
          id="btn-back-to-home"
          onClick={() => onNavigate('HOME')}
          className="p-1.5 hover:bg-[#141414] rounded-full transition-colors cursor-pointer text-[#8E8E93] hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-xs font-semibold tracking-[0.25em] uppercase text-white">together</span>
        <div className="w-8"></div> {/* Spacer balance */}
      </div>

      {/* 2. TAB CONTROLS (TIMELINE VS STATS) */}
      <div className="flex border-b border-[#1C1C1E] shrink-0">
        <button
          id="tab-timeline"
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-3.5 text-xs tracking-wider uppercase font-medium relative transition-colors cursor-pointer ${
            activeTab === 'timeline' ? 'text-[#FF8DA1]' : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          <span>Timeline Kenangan</span>
          {activeTab === 'timeline' && (
            <motion.div 
              layoutId="activeTabUnderline" 
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF8DA1]" 
              transition={{ duration: 0.2 }}
            />
          )}
        </button>
        <button
          id="tab-statistics"
          onClick={() => setActiveTab('statistics')}
          className={`flex-1 py-3.5 text-xs tracking-wider uppercase font-medium relative transition-colors cursor-pointer ${
            activeTab === 'statistics' ? 'text-[#FF8DA1]' : 'text-[#8E8E93] hover:text-white'
          }`}
        >
          <span>Statistik</span>
          {activeTab === 'statistics' && (
            <motion.div 
              layoutId="activeTabUnderline" 
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF8DA1]" 
              transition={{ duration: 0.2 }}
            />
          )}
        </button>
      </div>

      {/* 3. SCROLLABLE CONTAINER */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="text-[#FF8DA1]"
          >
            <Loader2 size={24} />
          </motion.div>
          <span className="text-[10px] text-[#8E8E93] tracking-widest uppercase font-mono mt-3">Sinkronisasi data...</span>
        </div>
      ) : activeTab === 'timeline' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* SEARCH & FILTERS SECTION */}
          <div className="p-4 bg-[#111] border-b border-[#1C1C1E] flex flex-col gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]">
                <Search size={14} />
              </span>
              <input
                id="search-memory-input"
                type="text"
                placeholder="Cari judul, deskripsi, tanggal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1A1C] border border-[#2C2C2E]/50 focus:border-[#FF8DA1]/50 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium placeholder-[#8E8E93] focus:outline-none transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-white cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Expanded elegant filters row */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] text-[#8E8E93] font-mono shrink-0 mr-1 uppercase tracking-wider">Filter:</span>
              
              {/* Photo Filter Dropdown / Row */}
              <select
                id="filter-photo-select"
                value={photoFilter}
                onChange={(e: any) => setPhotoFilter(e.target.value)}
                className="bg-[#1A1A1C] border border-[#2C2C2E]/40 rounded-lg px-2.5 py-1 text-[11px] font-medium text-white focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Momen</option>
                <option value="photo">Ada Foto</option>
                <option value="no_photo">Tanpa Foto</option>
              </select>

              {/* Year Filter Dropdown */}
              <select
                id="filter-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-[#1A1A1C] border border-[#2C2C2E]/40 rounded-lg px-2.5 py-1 text-[11px] font-medium text-white focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Tahun</option>
                {years.filter(y => y !== 'all').map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {/* Month Filter Dropdown */}
              <select
                id="filter-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-[#1A1A1C] border border-[#2C2C2E]/40 rounded-lg px-2.5 py-1 text-[11px] font-medium text-white focus:outline-none cursor-pointer"
              >
                {monthsList.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* MAIN CONTENT WORKSPACE */}
          <div className="flex-1 overflow-y-auto px-6 py-5 relative">
            
            {/* EMPTY STATE */}
            {filteredMemories.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 px-4 text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="w-14 h-14 bg-[#141414] rounded-full border border-[#2C2C2E]/45 flex items-center justify-center text-[#FF8DA1]/40 mb-4"
                >
                  <Heart size={22} className="stroke-[1.5]" />
                </motion.div>
                <h3 className="text-sm font-semibold text-white">Belum ada kenangan.</h3>
                <p className="text-xs text-[#8E8E93] mt-1.5 max-w-[200px] leading-relaxed">
                  {searchQuery || photoFilter !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all'
                    ? 'Tidak ada kenangan yang cocok dengan filter pencarian.'
                    : 'Tambahkan momen pertama kalian.'}
                </p>
                
                <button
                  id="btn-add-first-memory"
                  onClick={openAddForm}
                  className="mt-6 px-5 py-2.5 bg-[#FF8DA1] hover:bg-[#FF7A91] text-[#0B0B0B] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Tambah Kenangan</span>
                </button>
              </div>
            ) : (
              /* THE TIMELINE VIEW */
              <div className="relative pl-6 border-l border-[#1C1C1E] space-y-8 py-2">
                <AnimatePresence initial={false}>
                  {filteredMemories.map((memory, index) => {
                    const moodObj = MOODS.find(m => m.label === memory.mood);
                    return (
                      <motion.div
                        key={memory.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
                        onClick={() => setSelectedMemory(memory)}
                        className="relative bg-[#141414] border border-[#2C2C2E]/40 hover:border-[#FF8DA1]/30 rounded-2xl p-4.5 transition-all cursor-pointer group"
                      >
                        {/* Timeline Connector Indicator Dot */}
                        <div className="absolute -left-[31px] top-6 w-2.5 h-2.5 rounded-full bg-[#1C1C1E] border border-[#FF8DA1] group-hover:bg-[#FF8DA1] transition-colors" />

                        <div className="flex flex-col gap-2.5">
                          {/* Top Row: Date & Favorite Button */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono text-[#8E8E93] font-semibold tracking-wide">
                              {formatIndonesianDate(memory.date)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {/* Mood Pill */}
                              {moodObj && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1C1C1E] border border-[#2C2C2E]/40 flex items-center gap-1 text-white/90">
                                  <span>{moodObj.emoji}</span>
                                  <span>{moodObj.label}</span>
                                </span>
                              )}
                              
                              <button
                                onClick={(e) => handleToggleFavorite(memory, e)}
                                className="p-1 hover:bg-[#1C1C1E] rounded-full transition-colors cursor-pointer text-[#8E8E93] hover:text-red-400"
                              >
                                <Heart 
                                  size={13} 
                                  className={`${
                                    memory.isFavorite 
                                      ? 'text-red-400 fill-red-400' 
                                      : 'text-[#8E8E93] hover:text-red-400'
                                  }`} 
                                />
                              </button>
                            </div>
                          </div>

                          {/* Image Thumbnail (Lazy-loaded with absolute containment) */}
                          {memory.photoUrl && (
                            <div className="w-full h-36 rounded-xl overflow-hidden bg-black/40 border border-[#2C2C2E]/20 relative">
                              <img
                                src={memory.photoUrl}
                                alt={memory.title}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                              />
                            </div>
                          )}

                          {/* Text Body */}
                          <div>
                            <h4 className="text-sm font-semibold text-white tracking-tight group-hover:text-[#FF8DA1] transition-colors">
                              {memory.title}
                            </h4>
                            <p className="text-xs text-[#8E8E93] leading-relaxed mt-1 line-clamp-2">
                              {memory.description}
                            </p>
                          </div>

                          {/* Footer Info Row */}
                          <div className="flex items-center justify-between border-t border-[#1C1C1E]/40 pt-2 text-[10px] text-[#8E8E93] font-medium">
                            <span className="flex items-center gap-1">
                              <User size={10} className="text-[#8E8E93]/70" />
                              <span>{memory.creatorName}</span>
                            </span>

                            {memory.location && (
                              <span className="flex items-center gap-0.5 text-right font-mono truncate max-w-[120px]">
                                <MapPin size={10} className="text-[#FF8DA1]" />
                                <span>{memory.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* FLOAT ADD ACTION BUTTON (IF NOT EMPTY) */}
          {filteredMemories.length > 0 && (
            <motion.button
              id="fab-add-memory"
              onClick={openAddForm}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-[#FF8DA1] hover:bg-[#FF7A91] text-[#0B0B0B] flex items-center justify-center shadow-xl shadow-[#FF8DA1]/15 border border-white/10 cursor-pointer z-30"
            >
              <Plus size={20} className="stroke-[2.5]" />
            </motion.button>
          )}
        </div>
      ) : (
        /* STATISTICS VIEW */
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="bg-[#141414] border border-[#2C2C2E]/40 rounded-2xl p-4.5 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF8DA1]/10 rounded-xl flex items-center justify-center text-[#FF8DA1]">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">Ikhtisar Kenangan</h3>
              <p className="text-[10px] text-[#8E8E93] mt-0.5">Analisis hubungan kasih sayang kalian berdua.</p>
            </div>
          </div>

          {/* Grid Cards (Thin custom border) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Card 1: Total Kenangan */}
            <div className="bg-[#141414] border border-[#2C2C2E]/30 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#8E8E93] font-mono">Kenangan</span>
              <span className="text-3xl font-light text-[#FF8DA1] mt-3">{totalKenangan}</span>
              <span className="text-[9px] text-[#8E8E93]/70 mt-1">Total momen terabadikan</span>
            </div>

            {/* Card 2: Jumlah Foto */}
            <div className="bg-[#141414] border border-[#2C2C2E]/30 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#8E8E93] font-mono">Album Foto</span>
              <span className="text-3xl font-light text-[#FF8DA1] mt-3">{totalFoto}</span>
              <span className="text-[9px] text-[#8E8E93]/70 mt-1">Momen dengan foto</span>
            </div>

            {/* Card 3: Hari Bersama */}
            <div className="bg-[#141414] border border-[#2C2C2E]/30 rounded-xl p-4 flex flex-col justify-between col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#8E8E93] font-mono">Hari Bersama</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#FF8DA1]/5 border border-[#FF8DA1]/20 text-[9px] font-mono text-[#FF8DA1]">Hubungan Aktif</span>
              </div>
              <span className="text-4xl font-light text-white mt-4">{daysTogether} Hari</span>
              <span className="text-[10px] text-[#8E8E93]/80 mt-1.5 leading-relaxed">
                {currentUserDoc?.relationshipStartDate 
                  ? `Sejak tanggal jadian kalian: ${formatIndonesianDate(currentUserDoc.relationshipStartDate)}` 
                  : 'Tentukan tanggal jadian di halaman Home untuk melacak.'}
              </span>
            </div>

            {/* Card 4: Kenangan Bulan Ini */}
            <div className="bg-[#141414] border border-[#2C2C2E]/30 rounded-xl p-4 flex flex-col justify-between col-span-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#8E8E93] font-mono">Momen Bulan Ini</span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-3xl font-light text-[#FF8DA1]">{kenanganBulanIni} Momen</span>
                <span className="text-xs text-[#8E8E93]">Baru</span>
              </div>
              <span className="text-[9px] text-[#8E8E93]/70 mt-1">Dibuat pada bulan berjalan</span>
            </div>
          </div>

          {/* Sweet Minimal Tip Card */}
          <div className="bg-[#141414]/50 border border-[#2C2C2E]/20 rounded-xl p-4 text-center">
            <span className="text-xs text-[#8E8E93] italic">
              "Hubungan yang erat dibangun dari tumpukan momen kecil yang dihargai bersama."
            </span>
          </div>
        </div>
      )}

      {/* ================= MODALS & OVERLAYS ================= */}
      <AnimatePresence>
        
        {/* A. ADD / EDIT MEMORY FORM (SLIDE-UP DIALOG) */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSaving) {
                  setIsFormOpen(false);
                  stopCamera();
                }
              }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Form Content */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-h-[92%] bg-[#0B0B0B] border-t border-[#1C1C1E] rounded-t-3xl flex flex-col overflow-hidden z-10 text-left"
            >
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-[#1C1C1E] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-[#FF8DA1]" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                    {isEditing ? 'Ubah Kenangan' : 'Tambah Kenangan'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    if (!isSaving) {
                      setIsFormOpen(false);
                      stopCamera();
                    }
                  }}
                  className="p-1 text-[#8E8E93] hover:text-white rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSaveMemory} className="flex-1 overflow-y-auto px-6 py-5 space-y-5 pb-12">
                
                {/* 1. Title Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#8E8E93] font-mono">Judul Kenangan *</label>
                  <input
                    id="input-memory-title"
                    type="text"
                    required
                    placeholder="Contoh: Kencan Pertama Kita"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2C2C2E]/80 focus:border-[#FF8DA1] rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors"
                  />
                </div>

                {/* 2. Date Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#8E8E93] font-mono">Tanggal *</label>
                  <input
                    id="input-memory-date"
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2C2C2E]/80 focus:border-[#FF8DA1] rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors cursor-pointer"
                  />
                </div>

                {/* 3. Location Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#8E8E93] font-mono">Lokasi (Opsional)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93]">
                      <MapPin size={14} />
                    </span>
                    <input
                      id="input-memory-location"
                      type="text"
                      placeholder="Contoh: Senopati, Jakarta"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="w-full bg-[#141414] border border-[#2C2C2E]/80 focus:border-[#FF8DA1] rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* 4. Mood Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#8E8E93] font-mono">Bagaimana perasaanmu? (Opsional)</label>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {MOODS.map(m => (
                      <button
                        key={m.label}
                        type="button"
                        onClick={() => setFormMood(formMood === m.label ? '' : m.label)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                          formMood === m.label
                            ? 'bg-[#FF8DA1]/15 border-[#FF8DA1] text-[#FF8DA1]'
                            : 'bg-[#141414] border-[#2C2C2E]/60 text-white/90 hover:border-white/20'
                        }`}
                      >
                        <span>{m.emoji}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Photo Picker & Camera Simulator */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#8E8E93] font-mono">Unggah Foto Momen (Opsional)</label>
                  
                  {formPhoto ? (
                    /* Photo Preview with Remove Action */
                    <div className="relative w-full h-44 rounded-xl overflow-hidden border border-[#2C2C2E] bg-black">
                      <img src={formPhoto} alt="Upload preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormPhoto('')}
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/75 hover:bg-black text-[#8E8E93] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    /* Picker Actions */
                    <div className="grid grid-cols-2 gap-3">
                      {/* Camera Trigger */}
                      <button
                        type="button"
                        onClick={startCamera}
                        className="h-20 bg-[#141414] border border-dashed border-[#2C2C2E] hover:border-[#FF8DA1]/50 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer text-[#8E8E93] hover:text-[#FF8DA1] transition-all"
                      >
                        <Camera size={18} />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Ambil Kamera</span>
                      </button>

                      {/* File Upload Trigger */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-20 bg-[#141414] border border-dashed border-[#2C2C2E] hover:border-[#FF8DA1]/50 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer text-[#8E8E93] hover:text-[#FF8DA1] transition-all"
                      >
                        <ImageIcon size={18} />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Dari Galeri</span>
                      </button>
                    </div>
                  )}

                  {/* Hidden Input File */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Aesthetic Preset Selector (Super convenient testing shortcut) */}
                  {!formPhoto && !isCameraActive && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowPresetSelector(!showPresetSelector)}
                        className="text-[10px] text-[#FF8DA1] hover:underline font-medium cursor-pointer"
                      >
                        {showPresetSelector ? 'Sembunyikan Pintasan Galeri' : 'Atau gunakan contoh foto romantis'}
                      </button>

                      {showPresetSelector && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-1">
                          {PRESET_GALLERY.map(p => (
                            <div
                              key={p.name}
                              onClick={() => {
                                setFormPhoto(p.url);
                                setShowPresetSelector(false);
                              }}
                              className="bg-[#141414] border border-[#2C2C2E]/40 rounded-lg p-1.5 cursor-pointer hover:border-[#FF8DA1]/40 flex items-center gap-2 group"
                            >
                              <img src={p.url} className="w-8 h-8 rounded object-cover" />
                              <div className="overflow-hidden">
                                <p className="text-[9px] font-bold text-white truncate">{p.name}</p>
                                <p className="text-[8px] text-[#8E8E93] truncate">{p.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* LIVE CAMERA OVERLAY / SNAPSHOT WINDOW */}
                  {isCameraActive && (
                    <div className="border border-[#2C2C2E] rounded-xl bg-black overflow-hidden relative">
                      <div className="p-3 bg-[#111] flex items-center justify-between border-b border-[#2C2C2E]/30">
                        <span className="text-[10px] font-mono text-white/80 flex items-center gap-1.5 uppercase font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          Kamera Aktif
                        </span>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="p-0.5 text-[#8E8E93] hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {cameraError ? (
                        <div className="p-6 text-center text-xs text-[#8E8E93] leading-relaxed">
                          <p>{cameraError}</p>
                          <p className="mt-2 text-[10px] text-pink-400">Silakan gunakan menu "Pilih Galeri" untuk mengunggah berkas gambar.</p>
                        </div>
                      ) : (
                        <div className="relative aspect-video w-full bg-black">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="px-4 py-2.5 bg-white text-black font-bold text-xs rounded-full shadow-lg flex items-center gap-1.5 hover:bg-gray-100 transition-transform cursor-pointer"
                            >
                              <Camera size={12} />
                              <span>Ambil Gambar</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. Description Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#8E8E93] font-mono">Deskripsi Cerita Momen *</label>
                  <textarea
                    id="input-memory-description"
                    required
                    rows={4}
                    placeholder="Tuliskan cerita detail momen romantis atau penting ini agar tidak terlupakan..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2C2C2E]/80 focus:border-[#FF8DA1] rounded-xl px-4 py-3 text-sm font-medium focus:outline-none transition-colors resize-none leading-relaxed"
                  />
                </div>

                {/* Action Submit Buttons */}
                <div className="flex gap-3 pt-4 border-t border-[#1C1C1E]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      stopCamera();
                    }}
                    disabled={isSaving}
                    className="flex-1 py-3 bg-[#141414] border border-[#2C2C2E]/55 hover:bg-[#1A1A1C] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 bg-[#FF8DA1] hover:bg-[#FF7A91] disabled:opacity-50 text-[#0B0B0B] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Kenangan</span>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}

        {/* B. DETAIL KENANGAN VIEW MODAL */}
        {selectedMemory && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMemory(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Content Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="relative w-full max-h-[92%] bg-[#0B0B0B] border-t border-[#1C1C1E] rounded-t-3xl flex flex-col overflow-hidden z-10 text-left"
            >
              {/* Header bar with controls */}
              <div className="px-6 py-4 border-b border-[#1C1C1E] flex items-center justify-between shrink-0">
                <span className="text-[10px] font-mono text-[#8E8E93] uppercase font-bold tracking-widest">Detail Kenangan</span>
                <div className="flex items-center gap-2">
                  {/* Favorite indicator inside detail */}
                  <button
                    onClick={(e) => handleToggleFavorite(selectedMemory, e).then(() => {
                      // refresh selectedMemory locally
                      setSelectedMemory({
                        ...selectedMemory,
                        isFavorite: !selectedMemory.isFavorite
                      });
                    })}
                    className="p-1.5 hover:bg-[#141414] rounded-full text-[#8E8E93] hover:text-red-400 transition-colors"
                  >
                    <Heart size={15} className={selectedMemory.isFavorite ? 'text-red-400 fill-red-400' : ''} />
                  </button>
                  
                  {/* Creator specific controls */}
                  {selectedMemory.creatorId === FirebaseAuth.getCurrentUser()?.uid && (
                    <>
                      <button
                        onClick={() => openEditForm(selectedMemory)}
                        className="p-1.5 hover:bg-[#141414] rounded-full text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(selectedMemory.id)}
                        className="p-1.5 hover:bg-[#141414] rounded-full text-[#8E8E93] hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => setSelectedMemory(null)}
                    className="p-1 text-[#8E8E93] hover:text-white rounded-full transition-colors cursor-pointer ml-1"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto pb-12">
                {/* 1. Large Image Header */}
                {selectedMemory.photoUrl ? (
                  <div className="w-full h-64 bg-black border-b border-[#1C1C1E]/50 relative">
                    <img 
                      src={selectedMemory.photoUrl} 
                      alt={selectedMemory.title} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover" 
                    />
                  </div>
                ) : (
                  <div className="w-full h-20" /> // spacer
                )}

                {/* 2. Metadata Section */}
                <div className="px-6 py-5 space-y-4">
                  {/* Badges / Chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Date Badge */}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-[#141414] border border-[#2C2C2E]/40 text-[#8E8E93]">
                      {formatIndonesianDate(selectedMemory.date)}
                    </span>

                    {/* Location Badge */}
                    {selectedMemory.location && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#141414] border border-[#2C2C2E]/40 text-white/90 flex items-center gap-1 max-w-[150px] truncate">
                        <MapPin size={10} className="text-[#FF8DA1]" />
                        <span>{selectedMemory.location}</span>
                      </span>
                    )}

                    {/* Mood Badge */}
                    {selectedMemory.mood && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#141414] border border-[#2C2C2E]/40 text-white/90 flex items-center gap-1">
                        <span>{MOODS.find(m => m.label === selectedMemory.mood)?.emoji}</span>
                        <span>{selectedMemory.mood}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Author */}
                  <div className="pt-2">
                    <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
                      {selectedMemory.title}
                    </h2>
                    <span className="text-[10px] text-[#8E8E93] mt-1.5 block">
                      Diabadikan oleh <span className="text-white font-semibold">{selectedMemory.creatorName}</span>
                    </span>
                  </div>

                  {/* Main Description Text */}
                  <div className="border-t border-[#1C1C1E]/60 pt-4">
                    <p className="text-sm text-[#8E8E93] leading-relaxed whitespace-pre-wrap">
                      {selectedMemory.description}
                    </p>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}

        {/* C. CONFIRM DELETE DIALOG */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeleting) setDeleteConfirmId(null);
              }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Content Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm bg-[#141414] border border-[#2C2C2E]/70 rounded-2xl p-6 shadow-2xl flex flex-col text-left overflow-hidden z-10"
            >
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                Hapus Kenangan
              </h3>
              <p className="text-xs text-[#8E8E93] leading-relaxed mb-6">
                Apakah Anda yakin ingin menghapus kenangan berharga ini? Tindakan ini permanen dan akan menghapus data pada kedua akun pasangan.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-[#1C1C1E] border border-[#2C2C2E]/50 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMemory}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <span>Hapus</span>
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
              {toastMessage.type === 'success' ? <CheckCircle2 size={14} className="shrink-0 text-emerald-400" /> : <Info size={14} className="shrink-0 text-red-400" />}
              <span>{toastMessage.text}</span>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
};
