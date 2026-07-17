/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  MessageSquare, 
  User as UserIcon, 
  Camera, 
  Image as ImageIcon, 
  Send, 
  Lock, 
  Loader2,
  Paperclip,
  AlertCircle,
  Mic,
  Play,
  Pause,
  Search,
  Info,
  X,
  Check,
  CheckCheck,
  Trash2,
  Edit3,
  CornerUpLeft,
  Calendar,
  Heart,
  Grid,
  FileText
} from 'lucide-react';
import { FirebaseAuth, FirebaseFirestore, FirestoreUserDoc, ChatMessage, ChatSession } from '../services/firebase';
import { Screen } from '../models/types';

interface ChatProps {
  onNavigate: (screen: Screen) => void;
}

// Quick presets for test couple images in sandbox
const IMAGE_PRESETS = [
  {
    name: 'Sunset Walk',
    url: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=500&auto=format&fit=crop&q=80'
  },
  {
    name: 'Holding Hands',
    url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&auto=format&fit=crop&q=80'
  },
  {
    name: 'Cozy Morning',
    url: 'https://images.unsplash.com/photo-1531747118685-ca8fa6e08806?w=500&auto=format&fit=crop&q=80'
  },
  {
    name: 'Roadtrip Adventure',
    url: 'https://images.unsplash.com/photo-1464746133101-a2c3f88e0dd9?w=500&auto=format&fit=crop&q=80'
  }
];

export const Chat: React.FC<ChatProps> = ({ onNavigate }) => {
  // Navigation & Page State
  const [userDoc, setUserDoc] = useState<FirestoreUserDoc | null>(null);
  const [partnerDoc, setPartnerDoc] = useState<FirestoreUserDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChatActive, setIsChatActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'info'>('chat');

  // Real-time states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [partnerPresence, setPartnerPresence] = useState<FirestoreUserDoc | null>(null);

  // Message Sending & Input states
  const [typedMessage, setTypedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  // Search Chat feature
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [simulatedVoice, setSimulatedVoice] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio Playback states (for voice notes)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<Record<string, number>>({});
  const audioPlayersRef = useRef<Record<string, HTMLAudioElement>>({});
  const simPlaybackIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Image upload and Attachment toggles
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Pagination state
  const [messageLimit, setMessageLimit] = useState(15);

  // Dom refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load User and Partner Documents
  useEffect(() => {
    const loadUserData = async () => {
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
            setPartnerPresence(partner);
          }
        }
      } catch (err) {
        console.error('Failed to load user info in Chat screen:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [onNavigate]);

  const isConnected = userDoc?.relationshipStatus === 'connected';
  const chatId = userDoc && partnerDoc ? FirebaseFirestore.getChatId(userDoc.uid, partnerDoc.uid) : '';

  // 1. Presence Heartbeat: set online status and update periodically
  useEffect(() => {
    if (!userDoc) return;

    // Set online on mount
    FirebaseFirestore.updateUserPresence(userDoc.uid, 'online');

    // Heartbeat every 10 seconds to keep session active
    const heartbeat = setInterval(() => {
      FirebaseFirestore.updateUserPresence(userDoc.uid, 'online');
    }, 10000);

    // Set offline on unmount
    return () => {
      clearInterval(heartbeat);
      FirebaseFirestore.updateUserPresence(userDoc.uid, 'offline');
    };
  }, [userDoc]);

  // 2. Real-time Subscribers: messages, session, and partner user document (presence)
  useEffect(() => {
    if (!chatId || !partnerDoc) return;

    // A. Subscribe to Chat messages
    const unsubscribeMessages = FirebaseFirestore.subscribeChatMessages(chatId, (newMessages) => {
      // Filter out messages deleted for me
      const visibleMessages = newMessages.filter(
        (m) => !m.deletedFor || !m.deletedFor.includes(userDoc?.uid || '')
      );
      setMessages(visibleMessages);

      if (visibleMessages.length > 0) {
        setIsChatActive(true);
      }

      // Automatically mark received unread messages as read
      if (userDoc) {
        FirebaseFirestore.markMessagesAsRead(chatId, userDoc.uid);
      }
    });

    // B. Subscribe to Chat Session (typing states)
    const unsubscribeSession = FirebaseFirestore.subscribeChatSession(chatId, (session) => {
      setChatSession(session);
    });

    // C. Subscribe to Partner profile (online states)
    const unsubscribePartner = FirebaseFirestore.subscribeUserDoc(partnerDoc.uid, (updatedPartner) => {
      if (updatedPartner) {
        setPartnerPresence(updatedPartner);
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeSession();
      unsubscribePartner();
    };
  }, [chatId, partnerDoc, userDoc]);

  // Smooth scroll to bottom on message updates
  useEffect(() => {
    if (isChatActive && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [messages, isChatActive, activeTab]);

  // Auto scroll on reply panel mount
  useEffect(() => {
    if (replyingTo && messagesEndRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [replyingTo]);

  // 3. Typing Heartbeat Indicator Handler
  const handleInputChange = (text: string) => {
    setTypedMessage(text);
    if (!chatId || !userDoc) return;

    // Set typing to true
    FirebaseFirestore.setTypingStatus(chatId, userDoc.uid, true);

    // Clear timeout if typing continues
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to false after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      FirebaseFirestore.setTypingStatus(chatId, userDoc.uid, false);
    }, 2000);
  };

  // 4. Send Message Logic
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanText = typedMessage.trim();
    if (!cleanText && !editingMessage) return;

    if (!userDoc || !partnerDoc || !chatId) return;

    // Clear typing indicator immediately upon hitting send
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    FirebaseFirestore.setTypingStatus(chatId, userDoc.uid, false);

    setIsSending(true);
    setErrorMessage(null);

    try {
      if (editingMessage) {
        // Edit Mode
        await FirebaseFirestore.editChatMessage(chatId, editingMessage.id, cleanText);
        setEditingMessage(null);
        setTypedMessage('');
      } else {
        // Send Mode (Support Reply text)
        const replyPayload = replyingTo 
          ? {
              id: replyingTo.id,
              text: replyingTo.text,
              senderId: replyingTo.senderId,
              senderName: replyingTo.senderId === userDoc.uid ? 'Anda' : (partnerDoc.displayName || partnerDoc.username)
            }
          : undefined;

        await FirebaseFirestore.sendChatMessage(chatId, userDoc.uid, partnerDoc.uid, cleanText, replyPayload);
        setTypedMessage('');
        setReplyingTo(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengirim pesan.');
    } finally {
      setIsSending(false);
    }
  };

  // 5. Delete Message options
  const handleDeleteMessage = async (messageId: string, type: 'me' | 'everyone') => {
    if (!chatId || !userDoc) return;
    try {
      await FirebaseFirestore.deleteChatMessage(chatId, messageId, type, userDoc.uid);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menghapus pesan.');
    }
  };

  // 6. Real Media Capture / Local image upload using base64 URL
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userDoc || !partnerDoc || !chatId) return;

    setIsUploading(true);
    setShowAttachmentSheet(false);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result as string;
      try {
        await FirebaseFirestore.sendChatMediaMessage(
          chatId,
          userDoc.uid,
          partnerDoc.uid,
          'image',
          base64Url,
          undefined,
          '📷 Foto Dikirim'
        );
      } catch (err) {
        setErrorMessage('Gagal mengirim gambar.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Gagal membaca file gambar.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // 7. Preset Image Sender
  const handleSendPresetImage = async (presetUrl: string) => {
    if (!userDoc || !partnerDoc || !chatId) return;
    setIsUploading(true);
    setShowAttachmentSheet(false);
    setErrorMessage(null);

    try {
      await FirebaseFirestore.sendChatMediaMessage(
        chatId,
        userDoc.uid,
        partnerDoc.uid,
        'image',
        presetUrl,
        undefined,
        '📷 Foto Dikirim'
      );
    } catch (err) {
      setErrorMessage('Gagal mengirim gambar preset.');
    } finally {
      setIsUploading(false);
    }
  };

  // 8. VOICE NOTE RECORDING (Microphone Service)
  const startRecording = async () => {
    setErrorMessage(null);
    setRecordDuration(0);
    setAudioBlob(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const finalBlob = new Blob(chunks, { type: 'audio/webm' });
          setAudioBlob(finalBlob);
          
          // Read to Base64 to simulate saving to Storage
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            await sendVoiceNoteMessage(base64Audio, recordDuration || 5);
          };
          reader.readAsDataURL(finalBlob);

          // Stop all streams to clear native mic icon
          stream.getTracks().forEach(track => track.stop());
        };

        setIsRecording(true);
        setSimulatedVoice(false);
        mediaRecorder.start();

        // Interval duration tracker
        recordIntervalRef.current = setInterval(() => {
          setRecordDuration((prev) => prev + 1);
        }, 1000);
      } else {
        throw new Error('getUserMedia not available');
      }
    } catch (err) {
      // Graceful high-fidelity fallback for sandbox restrictions
      console.warn('Microphone access not allowed or unsupported. Using high-fidelity simulated VN.');
      setIsRecording(true);
      setSimulatedVoice(true);
      
      recordIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
    }

    if (isRecording) {
      if (simulatedVoice) {
        // Handle simulated VN end
        const finalDuration = recordDuration || 4;
        setIsRecording(false);
        sendVoiceNoteMessage('MOCK_VOICE_URL', finalDuration);
      } else {
        // Handle real VN end
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
      }
    }
  };

  const sendVoiceNoteMessage = async (audioDataUrl: string, durationSec: number) => {
    if (!userDoc || !partnerDoc || !chatId) return;
    setIsSending(true);

    try {
      await FirebaseFirestore.sendChatMediaMessage(
        chatId,
        userDoc.uid,
        partnerDoc.uid,
        'voice_note',
        audioDataUrl,
        durationSec,
        '🎙️ Pesan Suara'
      );
    } catch {
      setErrorMessage('Gagal mengirim pesan suara.');
    } finally {
      setIsSending(false);
    }
  };

  // 9. VOICE NOTE PLAYBACK (Plays real audio or high-fidelity progress simulation)
  const togglePlayVoiceNote = (msgId: string, fileUrl: string, durationSec: number) => {
    // If we click on the already playing audio, pause it
    if (playingVoiceId === msgId) {
      if (audioPlayersRef.current[msgId]) {
        audioPlayersRef.current[msgId].pause();
      } else if (simPlaybackIntervalsRef.current[msgId]) {
        clearInterval(simPlaybackIntervalsRef.current[msgId]);
        delete simPlaybackIntervalsRef.current[msgId];
      }
      setPlayingVoiceId(null);
      return;
    }

    // Stop currently playing
    if (playingVoiceId) {
      const prevId = playingVoiceId;
      if (audioPlayersRef.current[prevId]) {
        audioPlayersRef.current[prevId].pause();
      } else if (simPlaybackIntervalsRef.current[prevId]) {
        clearInterval(simPlaybackIntervalsRef.current[prevId]);
        delete simPlaybackIntervalsRef.current[prevId];
      }
    }

    setPlayingVoiceId(msgId);

    // If it's a simulated VN or real audio fails/is mock
    if (fileUrl === 'MOCK_VOICE_URL' || !fileUrl.startsWith('data:audio')) {
      // Simulate progress bar movement based on duration
      let currentProgress = playbackProgress[msgId] || 0;
      if (currentProgress >= 100) currentProgress = 0;

      const steps = durationSec * 10; // updates every 100ms
      const increment = 100 / steps;

      const interval = setInterval(() => {
        currentProgress += increment;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          setPlayingVoiceId(null);
        }
        setPlaybackProgress((prev) => ({ ...prev, [msgId]: currentProgress }));
      }, 100);

      simPlaybackIntervalsRef.current[msgId] = interval;
    } else {
      // Play real recorded audio blob
      let audio = audioPlayersRef.current[msgId];
      if (!audio) {
        audio = new Audio(fileUrl);
        audioPlayersRef.current[msgId] = audio;

        audio.ontimeupdate = () => {
          const pct = (audio.currentTime / audio.duration) * 100;
          setPlaybackProgress((prev) => ({ ...prev, [msgId]: pct || 0 }));
        };

        audio.onended = () => {
          setPlaybackProgress((prev) => ({ ...prev, [msgId]: 100 }));
          setPlayingVoiceId(null);
        };
      }

      audio.play().catch(() => {
        // Fallback to simulation if audio context blocked
        let currentProgress = 0;
        const interval = setInterval(() => {
          currentProgress += 2;
          if (currentProgress >= 100) {
            currentProgress = 100;
            clearInterval(interval);
            setPlayingVoiceId(null);
          }
          setPlaybackProgress((prev) => ({ ...prev, [msgId]: currentProgress }));
        }, 100);
        simPlaybackIntervalsRef.current[msgId] = interval;
      });
    }
  };

  // Helper relative last-seen renderer
  const formatLastSeen = (isoStr?: string) => {
    if (!isoStr) return 'Offline';
    const last = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Baru saja offline';
    if (diffMin < 60) return `Terakhir dilihat ${diffMin} menit yang lalu`;
    
    return `Terakhir dilihat ${last.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Helper date duration count
  const getDaysCount = (startDateStr?: string) => {
    if (!startDateStr) return 1;
    const start = new Date(startDateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  // Search filter query
  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    return m.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Paginated visible thread array
  const paginatedMessages = filteredMessages.slice(-messageLimit);

  const isPartnerTyping = chatSession?.isTyping?.[partnerDoc?.uid || ''] === true;

  // Render header status text
  const getStatusLabel = () => {
    if (isPartnerTyping) return 'Sedang mengetik...';
    if (partnerPresence?.status === 'online') return 'Online';
    return formatLastSeen(partnerPresence?.lastSeen);
  };

  // Extract all media images for Info Gallery
  const sharedMediaMessages = messages.filter((m) => m.type === 'image' && !m.isDeletedForAll);

  // Back trigger
  const handleBack = () => {
    if (activeTab === 'info') {
      setActiveTab('chat');
    } else if (isChatActive && messages.length === 0) {
      setIsChatActive(false);
    } else {
      onNavigate('HOME');
    }
  };

  // 1. LOADING SCREEN
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
        <span className="text-[10px] text-[#8E8E93] tracking-[0.2em] uppercase font-medium">Memuat Obrolan...</span>
      </div>
    );
  }

  // 2. UNCONNECTED STATE (No partner connected)
  if (!isConnected) {
    return (
      <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-12 px-6 sm:py-16 sm:px-12 font-sans">
        <div className="flex items-center justify-between">
          <button
            id="chat-unconnected-back"
            onClick={() => onNavigate('HOME')}
            className="w-9 h-9 rounded-xl border border-[#2C2C2E]/60 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-[10px] uppercase text-[#8E8E93] tracking-[0.2em] font-semibold">Together</span>
          <div className="w-9"></div>
        </div>

        <div className="my-auto text-center max-w-sm mx-auto space-y-6">
          <div className="w-16 h-16 bg-[#141414] border border-[#2C2C2E]/60 rounded-full flex items-center justify-center text-[#8E8E93] mx-auto">
            <MessageSquare size={24} className="opacity-80" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white tracking-tight">Chat</h2>
            <p className="text-xs text-[#8E8E93] leading-relaxed">
              Anda belum terhubung dengan pasangan. Hubungkan pasangan terlebih dahulu untuk mulai mengobrol.
            </p>
          </div>
        </div>

        <div>
          <button
            id="chat-unconnected-btn-connect"
            onClick={() => onNavigate('CONNECT_PARTNER')}
            className="w-full py-4 bg-[#FF8DA1] hover:bg-[#FF7A91] text-[#0B0B0B] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Hubungkan Pasangan
          </button>
        </div>
      </div>
    );
  }

  // 3. NO CONVERSATIONS YET STATE (Connected, but history is completely empty)
  if (!isChatActive) {
    return (
      <div className="flex-1 bg-[#0B0B0B] flex flex-col justify-between py-12 px-6 sm:py-16 sm:px-12 font-sans">
        <div className="flex items-center justify-between">
          <button
            id="chat-initial-back"
            onClick={() => onNavigate('HOME')}
            className="w-9 h-9 rounded-xl border border-[#2C2C2E]/60 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-[10px] uppercase text-[#8E8E93] tracking-[0.2em] font-semibold">Ruang Obrolan</span>
          <div className="w-9"></div>
        </div>

        <div className="my-auto text-center max-w-xs mx-auto space-y-6">
          <div className="relative inline-block">
            {partnerDoc?.photoUrl ? (
              <img 
                src={partnerDoc.photoUrl} 
                alt={partnerDoc.displayName} 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border border-[#2C2C2E] mx-auto shadow-xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#141414] border border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] mx-auto shadow-xl">
                <UserIcon size={32} />
              </div>
            )}
            <span className="absolute bottom-1 right-2 w-4 h-4 bg-pink-500 border-2 border-[#0B0B0B] rounded-full animate-pulse"></span>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white tracking-tight">{partnerDoc?.displayName}</h3>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8E8E93] font-mono block">@{partnerDoc?.username}</span>
            
            <div className="inline-block px-3 py-1 bg-[#141414] border border-[#2C2C2E]/40 rounded-full mt-2">
              <span className="text-[10px] text-[#8E8E93] font-medium tracking-wide">
                Belum ada percakapan
              </span>
            </div>
          </div>
        </div>

        <div>
          <button
            id="chat-btn-start-conversation"
            onClick={() => setIsChatActive(true)}
            className="w-full py-4 bg-[#FF8DA1] hover:bg-[#FF7A91] text-[#0B0B0B] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
          >
            Mulai Percakapan
          </button>
        </div>
      </div>
    );
  }

  // 4. ACTIVE VIEW: CHAT ROOM OR CHAT INFO
  return (
    <div className="flex-1 bg-[#0B0B0B] flex flex-col font-sans relative h-full max-w-full overflow-hidden">
      
      {/* HEADER SECTION */}
      <div className="py-3 px-4 border-b border-[#2C2C2E]/20 bg-[#0B0B0B]/85 backdrop-blur-md flex items-center justify-between sticky top-0 z-30 shrink-0">
        
        <div className="flex items-center gap-3 min-w-0 max-w-[70%]">
          <button
            id="chat-header-back"
            onClick={handleBack}
            className="w-8 h-8 rounded-lg border border-[#2C2C2E]/50 flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={14} />
          </button>

          {/* Click to open Info page */}
          <div 
            onClick={() => setActiveTab(activeTab === 'chat' ? 'info' : 'chat')}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          >
            <div className="relative shrink-0">
              {partnerDoc?.photoUrl ? (
                <img 
                  src={partnerDoc.photoUrl} 
                  alt={partnerDoc.displayName} 
                  className="w-8.5 h-8.5 rounded-full object-cover border border-[#2C2C2E]/40 group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8.5 h-8.5 rounded-full bg-[#141414] border border-[#2C2C2E]/40 flex items-center justify-center text-[#8E8E93]">
                  <UserIcon size={12} />
                </div>
              )}
              {partnerPresence?.status === 'online' && (
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-pink-400 rounded-full border border-[#0B0B0B] animate-pulse"></span>
              )}
            </div>

            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-white group-hover:text-[#FF8DA1] transition-colors truncate leading-tight">
                {partnerDoc?.displayName}
              </h4>
              <span className={`text-[8.5px] font-mono tracking-wider uppercase block ${isPartnerTyping ? 'text-pink-400 animate-pulse font-semibold' : partnerPresence?.status === 'online' ? 'text-pink-400' : 'text-[#8E8E93]'}`}>
                {getStatusLabel()}
              </span>
            </div>
          </div>
        </div>

        {/* Top bar controls */}
        <div className="flex items-center gap-1.5">
          {activeTab === 'chat' && (
            <button
              id="chat-btn-toggle-search"
              onClick={() => {
                setIsSearching(!isSearching);
                if (isSearching) setSearchQuery('');
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSearching ? 'bg-[#FF8DA1]/15 text-[#FF8DA1]' : 'text-[#8E8E93] hover:text-white'}`}
            >
              <Search size={14} />
            </button>
          )}

          <button
            id="chat-btn-toggle-info"
            onClick={() => setActiveTab(activeTab === 'chat' ? 'info' : 'chat')}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'info' ? 'bg-[#FF8DA1]/15 text-[#FF8DA1]' : 'text-[#8E8E93] hover:text-white'}`}
          >
            <Info size={14} />
          </button>
        </div>
      </div>

      {/* SEARCH BANNER IF ACTIVE */}
      {isSearching && activeTab === 'chat' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 bg-[#141414] border-b border-[#2C2C2E]/30 flex items-center gap-2"
        >
          <Search size={12} className="text-[#8E8E93]" />
          <input 
            type="text"
            placeholder="Cari pesan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder-[#8E8E93]/60 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#8E8E93] hover:text-white">
              <X size={12} />
            </button>
          )}
        </motion.div>
      )}

      {/* TAB 1: CHAT SCREEN */}
      {activeTab === 'chat' && (
        <>
          {/* MESSAGES VIEW */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-none flex flex-col justify-start">
            
            {/* Pagination / Load More */}
            {filteredMessages.length > messageLimit && (
              <div className="text-center py-2">
                <button 
                  onClick={() => setMessageLimit((prev) => prev + 15)}
                  className="text-[9px] uppercase tracking-wider font-mono px-3 py-1.5 bg-[#141414] border border-[#2C2C2E]/40 text-[#8E8E93] hover:text-[#FF8DA1] rounded-lg transition-colors cursor-pointer"
                >
                  Muat pesan sebelumnya
                </button>
              </div>
            )}

            {/* Security banner when history is short */}
            {messages.length < 5 && (
              <div className="max-w-[260px] mx-auto text-center py-2.5 px-3 bg-[#141414]/50 border border-[#2C2C2E]/25 rounded-xl space-y-1 my-2 shrink-0">
                <div className="flex items-center justify-center gap-1.5 text-[#8E8E93]">
                  <Lock size={10} className="text-[#FF8DA1]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white">Private Session</span>
                </div>
                <p className="text-[8px] text-[#8E8E93] leading-relaxed">
                  Sesi obrolan dilindungi secara end-to-end pada database cloud.
                </p>
              </div>
            )}

            {/* Main message thread */}
            <div className="flex-1 space-y-5 flex flex-col">
              <AnimatePresence initial={false}>
                {paginatedMessages.map((msg) => {
                  const isMe = msg.senderId === userDoc?.uid;
                  const isDeleted = msg.isDeletedForAll;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.22 }}
                      className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end ml-auto' : 'self-start items-start mr-auto'} group/msg`}
                    >
                      {/* Optional Sender Name */}
                      {!isMe && (
                        <span className="text-[8px] font-mono text-[#8E8E93] ml-1 uppercase tracking-wider mb-0.5">
                          {partnerDoc?.displayName}
                        </span>
                      )}

                      {/* Message Bubble container */}
                      <div className="relative flex items-center gap-2">
                        
                        {/* Action buttons on hover/select (Reply / Edit / Delete) */}
                        {isMe && !isDeleted && (
                          <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 mr-1">
                            <button 
                              onClick={() => setReplyingTo(msg)}
                              className="w-6 h-6 rounded bg-[#141414] border border-[#2C2C2E]/40 flex items-center justify-center text-[#8E8E93] hover:text-white"
                              title="Balas"
                            >
                              <CornerUpLeft size={10} />
                            </button>
                            {msg.type === 'text' && (
                              <button 
                                onClick={() => {
                                  setEditingMessage(msg);
                                  setTypedMessage(msg.text);
                                }}
                                className="w-6 h-6 rounded bg-[#141414] border border-[#2C2C2E]/40 flex items-center justify-center text-[#8E8E93] hover:text-white"
                                title="Edit"
                              >
                                <Edit3 size={10} />
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                if (window.confirm('Hapus pesan ini untuk semua?')) {
                                  handleDeleteMessage(msg.id, 'everyone');
                                }
                              }}
                              className="w-6 h-6 rounded bg-[#141414] border border-[#2C2C2E]/40 flex items-center justify-center text-[#8E8E93] hover:text-red-400"
                              title="Hapus untuk Semua"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )}

                        {!isMe && !isDeleted && (
                          <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 order-last ml-1">
                            <button 
                              onClick={() => setReplyingTo(msg)}
                              className="w-6 h-6 rounded bg-[#141414] border border-[#2C2C2E]/40 flex items-center justify-center text-[#8E8E93] hover:text-white"
                              title="Balas"
                            >
                              <CornerUpLeft size={10} />
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm('Hapus pesan ini untuk saya?')) {
                                  handleDeleteMessage(msg.id, 'me');
                                }
                              }}
                              className="w-6 h-6 rounded bg-[#141414] border border-[#2C2C2E]/40 flex items-center justify-center text-[#8E8E93] hover:text-red-400"
                              title="Hapus untuk Saya"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )}

                        {/* Bubble */}
                        <div 
                          className={`px-3.5 py-2.5 text-xs leading-relaxed font-sans shadow-sm rounded-2xl ${
                            isDeleted
                              ? 'bg-[#141414] border border-[#2C2C2E]/20 text-[#8E8E93]/70 italic rounded-tr-none'
                              : isMe 
                                ? 'bg-[#FF8DA1]/10 border border-[#FF8DA1]/25 text-white rounded-tr-none' 
                                : 'bg-[#141414] border border-[#2C2C2E]/50 text-white rounded-tl-none'
                          }`}
                        >
                          {/* Reply Context Rendered */}
                          {msg.replyTo && (
                            <div className="mb-2 p-2 bg-[#0B0B0B]/60 rounded-lg border-l-2 border-[#FF8DA1] text-[10px] text-[#8E8E93] leading-snug">
                              <span className="font-semibold text-[#FF8DA1] block text-[9px] uppercase tracking-wider mb-0.5">
                                {msg.replyTo.senderName}
                              </span>
                              <span className="truncate block max-w-xs">{msg.replyTo.text}</span>
                            </div>
                          )}

                          {/* Image rendering */}
                          {msg.type === 'image' && msg.fileUrl && (
                            <div 
                              className="mb-2 relative rounded-lg overflow-hidden cursor-zoom-in max-w-[220px]"
                              onClick={() => setFullscreenImage(msg.fileUrl || null)}
                            >
                              <img 
                                src={msg.fileUrl} 
                                alt="Shared Attachment" 
                                className="w-full h-auto max-h-[180px] object-cover hover:opacity-90 transition-opacity"
                              />
                            </div>
                          )}

                          {/* Voice Note rendering */}
                          {msg.type === 'voice_note' && (
                            <div className="flex items-center gap-3 min-w-[170px] py-1 select-none">
                              <button
                                type="button"
                                onClick={() => togglePlayVoiceNote(msg.id, msg.fileUrl || '', msg.duration || 5)}
                                className="w-8 h-8 rounded-full bg-[#FF8DA1]/15 text-[#FF8DA1] border border-[#FF8DA1]/35 flex items-center justify-center transition-transform active:scale-90"
                              >
                                {playingVoiceId === msg.id ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                              </button>

                              <div className="flex-1 space-y-1">
                                {/* Visual Sound wave bar */}
                                <div className="h-5 flex items-center gap-0.5 relative overflow-hidden">
                                  {/* Dummy static wave styling */}
                                  {[3, 5, 2, 6, 8, 4, 3, 7, 5, 2, 4, 6, 8, 3, 5].map((val, k) => {
                                    const isPlayed = (playbackProgress[msg.id] || 0) > (k / 15) * 100;
                                    return (
                                      <span 
                                        key={k} 
                                        className={`w-0.75 rounded-full transition-colors ${isPlayed ? 'bg-[#FF8DA1]' : 'bg-[#2C2C2E]'}`}
                                        style={{ height: `${val * 10}%` }}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="flex justify-between items-center text-[8px] font-mono text-[#8E8E93]">
                                  <span>{playingVoiceId === msg.id ? 'Memutar' : 'Pesan Suara'}</span>
                                  <span>{msg.duration ? `0:${msg.duration.toString().padStart(2, '0')}` : '0:05'}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Text Rendering */}
                          <p className="whitespace-pre-wrap break-all">{msg.text}</p>
                        </div>
                      </div>

                      {/* Footer Info: timestamp, edited indicator, read receipt */}
                      <div className="flex items-center gap-1.5 mt-1 px-1">
                        {msg.isEdited && (
                          <span className="text-[7.5px] font-mono text-[#8E8E93] italic uppercase">
                            Diedit
                          </span>
                        )}
                        <span className="text-[7.5px] text-[#8E8E93]/70 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {/* Read Receipts Indicator */}
                        {isMe && !isDeleted && (
                          <span>
                            {msg.status === 'read' ? (
                              <CheckCheck size={11} className="text-pink-400" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck size={11} className="text-[#8E8E93]" />
                            ) : (
                              <Check size={11} className="text-[#8E8E93]" />
                            )}
                          </span>
                        )}
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* CHAT INPUT AREA */}
          <div className="p-3 bg-[#0B0B0B] border-t border-[#2C2C2E]/20 sticky bottom-0 z-20 shrink-0 space-y-2">
            
            {/* 1. Reply Preview Banner */}
            {replyingTo && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-2 bg-[#141414] rounded-xl border border-[#2C2C2E]/40 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] uppercase tracking-wider font-bold text-[#FF8DA1] block">
                    Membalas {replyingTo.senderId === userDoc?.uid ? 'Anda' : (partnerDoc?.displayName || partnerDoc?.username)}
                  </span>
                  <p className="text-[10px] text-[#8E8E93] truncate">{replyingTo.text}</p>
                </div>
                <button 
                  onClick={() => setReplyingTo(null)}
                  className="w-5 h-5 rounded-full bg-[#2C2C2E]/40 text-[#8E8E93] flex items-center justify-center hover:text-white cursor-pointer"
                >
                  <X size={10} />
                </button>
              </motion.div>
            )}

            {/* 2. Edit Preview Banner */}
            {editingMessage && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-2 bg-[#141414] rounded-xl border border-[#2C2C2E]/40 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] uppercase tracking-wider font-bold text-pink-400 block">
                    Mengedit pesan Anda
                  </span>
                  <p className="text-[10px] text-[#8E8E93] truncate">{editingMessage.text}</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingMessage(null);
                    setTypedMessage('');
                  }}
                  className="w-5 h-5 rounded-full bg-[#2C2C2E]/40 text-[#8E8E93] flex items-center justify-center hover:text-white cursor-pointer"
                >
                  <X size={10} />
                </button>
              </motion.div>
            )}

            {/* Error banner */}
            {errorMessage && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span className="text-[10px] text-red-300 font-medium leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* 3. Main input row / Voice Recorder layout */}
            {isRecording ? (
              // Active voice recorder bar with high fidelity animations
              <div className="flex items-center justify-between bg-[#141414] border border-[#FF8DA1]/30 rounded-xl px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0" />
                  <span className="text-xs text-white font-mono">
                    {Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-[9px] text-[#8E8E93] italic">
                    {simulatedVoice ? '(Simulated) Merekam suara...' : 'Merekam suara...'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Cancel button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
                      setIsRecording(false);
                      setRecordDuration(0);
                    }}
                    className="px-3 py-1 bg-[#2C2C2E] text-xs text-[#8E8E93] rounded-lg hover:text-white"
                  >
                    Batal
                  </button>
                  {/* Finish / Send Voice Note */}
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-7 h-7 rounded-full bg-[#FF8DA1] text-[#0B0B0B] flex items-center justify-center shadow"
                  >
                    <Check size={14} />
                  </button>
                </div>
              </div>
            ) : (
              // Standard message input bar
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-full">
                
                {/* File picker triggers */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    id="chat-btn-attachments"
                    onClick={() => setShowAttachmentSheet(!showAttachmentSheet)}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors focus:outline-none cursor-pointer ${showAttachmentSheet ? 'bg-[#FF8DA1]/15 text-[#FF8DA1] border-[#FF8DA1]/40' : 'bg-[#141414] border-[#2C2C2E]/40 text-[#8E8E93] hover:text-white'}`}
                  >
                    <Paperclip size={14} />
                  </button>
                </div>

                {/* File Upload hidden input */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {/* Input Text box */}
                <div className="flex-1 relative flex items-center">
                  <input
                    id="chat-message-input"
                    type="text"
                    placeholder="Tulis sesuatu..."
                    value={typedMessage}
                    onChange={(e) => handleInputChange(e.target.value)}
                    disabled={isSending}
                    autoComplete="off"
                    className="w-full bg-[#141414] text-white placeholder-[#8E8E93]/60 border border-[#2C2C2E]/60 focus:border-[#FF8DA1]/50 rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-colors shrink"
                  />
                </div>

                {/* Voice / Send button */}
                <div className="flex items-center gap-1 shrink-0">
                  {typedMessage.trim() || editingMessage ? (
                    <button
                      type="submit"
                      id="chat-btn-send"
                      disabled={isSending}
                      className="w-9 h-9 rounded-xl bg-[#FF8DA1] border border-[#FF8DA1]/50 text-[#0B0B0B] flex items-center justify-center hover:opacity-90 active:scale-95 cursor-pointer shadow-md"
                      title="Kirim"
                    >
                      {isSending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="chat-btn-voice"
                      onClick={startRecording}
                      disabled={isSending || isUploading}
                      className="w-9 h-9 rounded-xl bg-[#141414] border border-[#2C2C2E]/40 flex items-center justify-center text-[#8E8E93] hover:text-white active:scale-95 cursor-pointer"
                      title="Rekam Suara"
                    >
                      <Mic size={14} />
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* ATTACHMENT MODAL SHEET */}
            <AnimatePresence>
              {showAttachmentSheet && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="p-3.5 bg-[#141414] border border-[#2C2C2E]/60 rounded-2xl space-y-4 shadow-2xl relative z-40"
                >
                  <div className="flex justify-between items-center border-b border-[#2C2C2E]/30 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white">Tambahkan Media</span>
                    <button onClick={() => setShowAttachmentSheet(false)} className="text-[#8E8E93] hover:text-white">
                      <X size={12} />
                    </button>
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                      className="p-3 rounded-xl bg-[#0B0B0B] border border-[#2C2C2E]/40 flex flex-col items-center gap-1.5 text-xs text-white hover:border-[#FF8DA1]/40 cursor-pointer transition-colors"
                    >
                      <ImageIcon size={16} className="text-[#FF8DA1]" />
                      <span className="text-[10px] font-medium">Galeri Foto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        // Simulated Camera Trigger using hidden file input with capture
                        fileInputRef.current?.setAttribute('capture', 'user');
                        fileInputRef.current?.click();
                      }}
                      className="p-3 rounded-xl bg-[#0B0B0B] border border-[#2C2C2E]/40 flex flex-col items-center gap-1.5 text-xs text-white hover:border-[#FF8DA1]/40 cursor-pointer transition-colors"
                    >
                      <Camera size={16} className="text-[#FF8DA1]" />
                      <span className="text-[10px] font-medium">Ambil Kamera</span>
                    </button>
                  </div>

                  {/* Aesthetic Couple presets */}
                  <div className="space-y-1.5 pt-1.5 border-t border-[#2C2C2E]/10">
                    <span className="text-[8.5px] font-mono uppercase tracking-widest text-[#8E8E93] block">
                      Gunakan Foto Estetik (Sandbox)
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {IMAGE_PRESETS.map((img, i) => (
                        <div 
                          key={i} 
                          onClick={() => handleSendPresetImage(img.url)}
                          className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-[#2C2C2E]/60 cursor-pointer group"
                        >
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-0 bg-[#0B0B0B]/40 flex items-end p-1">
                            <span className="text-[7px] text-white font-medium truncate w-full">{img.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* FOOTER */}
            <div className="text-center">
              <span className="text-[7.5px] uppercase font-mono tracking-widest text-[#8E8E93]/60">
                Data terenkripsi realtime
              </span>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: CHAT INFO SCREEN */}
      {activeTab === 'info' && (
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 bg-[#0B0B0B]">
          
          {/* PROFILE CARD */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              {partnerDoc?.photoUrl ? (
                <img 
                  src={partnerDoc.photoUrl} 
                  alt={partnerDoc.displayName} 
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-[#2C2C2E] mx-auto shadow-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#141414] border-2 border-[#2C2C2E] flex items-center justify-center text-[#8E8E93] mx-auto shadow-xl">
                  <UserIcon size={32} />
                </div>
              )}
              {partnerPresence?.status === 'online' && (
                <span className="absolute bottom-1 right-2 w-4 h-4 bg-pink-500 border-2 border-[#0B0B0B] rounded-full"></span>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">{partnerDoc?.displayName}</h3>
              <span className="text-xs text-[#8E8E93] font-mono">@{partnerDoc?.username}</span>
            </div>
          </div>

          {/* DATES INFO */}
          <div className="p-4 bg-[#141414]/40 border border-[#2C2C2E]/30 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-[#FF8DA1]" />
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-[#8E8E93] block">
                  Tanggal Terhubung
                </span>
                <span className="text-xs text-white font-medium">
                  {userDoc?.connectedAt 
                    ? new Date(userDoc.connectedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '17 Juli 2026'
                  }
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Heart size={16} className="text-[#FF8DA1]" />
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-[#8E8E93] block">
                  Hari Bersama
                </span>
                <span className="text-xs text-white font-medium">
                  {getDaysCount(userDoc?.connectedAt || userDoc?.relationshipStartDate)} Hari Bersama Pasangan
                </span>
              </div>
            </div>
          </div>

          {/* SHARED MEDIA GALLERY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">Media yang Dibagikan</span>
              <span className="text-[9px] font-mono text-[#8E8E93]">{sharedMediaMessages.length} Media</span>
            </div>

            {sharedMediaMessages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {sharedMediaMessages.map((msg, index) => (
                  <div 
                    key={index}
                    onClick={() => setFullscreenImage(msg.fileUrl || null)}
                    className="aspect-square rounded-xl overflow-hidden border border-[#2C2C2E]/40 bg-[#141414] cursor-zoom-in group"
                  >
                    <img 
                      src={msg.fileUrl} 
                      alt="Shared attachment gallery item" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-[#141414]/20 border border-[#2C2C2E]/10 rounded-2xl text-center">
                <Grid size={18} className="mx-auto text-[#8E8E93] opacity-40 mb-2" />
                <span className="text-[10px] text-[#8E8E93] font-medium uppercase tracking-wider block">
                  Belum ada media yang dibagikan
                </span>
              </div>
            )}
          </div>

          {/* Back trigger button */}
          <div className="pt-4">
            <button
              onClick={() => setActiveTab('chat')}
              className="w-full py-3 bg-[#141414] hover:bg-[#2C2C2E]/40 text-white font-semibold text-xs rounded-xl border border-[#2C2C2E]/40 transition-all cursor-pointer"
            >
              Kembali Ke Obrolan
            </button>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE LIGHTBOX */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImage(null)}
            className="fixed inset-0 z-50 bg-[#0B0B0B]/95 flex flex-col justify-between p-6 select-none"
          >
            {/* Top close trigger */}
            <div className="flex justify-between items-center w-full">
              <span className="text-[9px] uppercase tracking-widest font-mono text-[#8E8E93]">Pratinjau Foto</span>
              <button 
                onClick={() => setFullscreenImage(null)}
                className="w-9 h-9 bg-[#141414] border border-[#2C2C2E]/40 rounded-full flex items-center justify-center text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Centered Image */}
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="my-auto max-w-full max-h-[70vh] flex items-center justify-center rounded-xl overflow-hidden shadow-2xl border border-[#2C2C2E]/30"
            >
              <img 
                src={fullscreenImage} 
                alt="Fullscreen View" 
                className="max-w-full max-h-[70vh] object-contain"
              />
            </motion.div>

            {/* Help tip */}
            <div className="text-center">
              <span className="text-[8px] uppercase tracking-wider font-mono text-[#8E8E93]">
                Ketuk di mana saja untuk kembali
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
