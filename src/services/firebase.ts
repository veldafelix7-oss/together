/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simulated Firebase Authentication Service with persistent accounts
// This mimics the Firebase Auth API to support the Together Stage 3 specifications cleanly.

export interface FirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

const STORAGE_KEYS = {
  USERS_DB: 'together_firebase_users_db',
  CURRENT_USER: 'together_firebase_current_user',
};

// Seed with a default demo user if the DB is empty
const getStoredUsers = (): Record<string, { email: string; displayName: string; passwordHash: string }> => {
  const data = localStorage.getItem(STORAGE_KEYS.USERS_DB);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return {};
    }
  }
  
  // Default user seed
  const defaultDB = {
    'user@together.com': {
      email: 'user@together.com',
      displayName: 'User',
      passwordHash: 'password123', // plain text for simple simulation
    }
  };
  localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(defaultDB));
  return defaultDB;
};

const saveStoredUsers = (db: Record<string, { email: string; displayName: string; passwordHash: string }>) => {
  localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(db));
};

export const FirebaseAuth = {
  // Get active session
  getCurrentUser(): FirebaseUser | null {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Monitor auth state changes (callback patterns matching Firebase SDK)
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    const checkAuth = () => {
      const user = this.getCurrentUser();
      callback(user);
    };

    // Initial check
    checkAuth();

    // Listen to storage events to keep tabs synced if needed
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
    };
  },

  // Simulated email/username login
  signInWithEmailAndPassword(emailOrUsername: string, password: string): Promise<FirebaseUser> {
    return new Promise((resolve, reject) => {
      // Simulate network latency
      setTimeout(() => {
        const users = getStoredUsers();
        const trimmedEmail = emailOrUsername.trim().toLowerCase();
        
        // Find user by email or by display name
        const userEntry = Object.values(users).find(
          u => u.email.toLowerCase() === trimmedEmail || u.displayName.toLowerCase() === trimmedEmail
        );

        if (!userEntry) {
          reject(new Error('User tidak ditemukan. Periksa kembali username/email Anda.'));
          return;
        }

        if (userEntry.passwordHash !== password) {
          reject(new Error('Password salah. Silakan coba lagi.'));
          return;
        }

        const authenticatedUser: FirebaseUser = {
          uid: 'uid_' + userEntry.displayName.toLowerCase(),
          email: userEntry.email,
          displayName: userEntry.displayName,
        };

        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(authenticatedUser));
        resolve(authenticatedUser);
      }, 1200); // 1.2s delay for modern loading animations
    });
  },

  // Simulated signup
  createUserWithEmailAndPassword(emailOrUsername: string, password: string, displayName: string): Promise<FirebaseUser> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = getStoredUsers();
        const trimmedEmailOrUsername = emailOrUsername.trim().toLowerCase();
        
        // Ensure email format or mock one if they input a username
        const email = trimmedEmailOrUsername.includes('@') 
          ? trimmedEmailOrUsername 
          : `${trimmedEmailOrUsername}@together.com`;

        // Check if user already exists
        if (users[email]) {
          reject(new Error('Username atau Email sudah terdaftar.'));
          return;
        }

        // Validate lengths
        if (!displayName.trim()) {
          reject(new Error('Username tidak boleh kosong.'));
          return;
        }
        if (password.length < 8) {
          reject(new Error('Password minimal harus 8 karakter.'));
          return;
        }

        // Register new auth user
        users[email] = {
          email,
          displayName: displayName.trim(),
          passwordHash: password,
        };

        saveStoredUsers(users);

        const uid = 'uid_' + displayName.trim().toLowerCase().replace(/\s+/g, '_');
        
        // Save initial user doc in simulated Firestore
        const firestoreUsers = FirebaseFirestore.getUsers();
        firestoreUsers[uid] = {
          uid,
          username: displayName.trim(),
          displayName: '', // Empty initially so they must complete profile
          photoUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          partnerId: '',
          relationshipStartDate: '',
          relationshipStatus: 'single',
        };
        FirebaseFirestore.saveUsers(firestoreUsers);

        const newUser: FirebaseUser = {
          uid,
          email,
          displayName: displayName.trim(),
        };

        resolve(newUser);
      }, 1500); // 1.5s delay
    });
  },

  // Simulated Google Sign In
  signInWithGoogle(email: string, displayName: string, photoURL?: string): Promise<FirebaseUser> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const uid = 'uid_google_' + displayName.toLowerCase().replace(/\s+/g, '_');
        
        const authenticatedUser: FirebaseUser = {
          uid,
          email: email,
          displayName: displayName,
          photoURL: photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        };

        // Save initial user doc in simulated Firestore if not exists
        const firestoreUsers = FirebaseFirestore.getUsers();
        if (!firestoreUsers[uid]) {
          firestoreUsers[uid] = {
            uid,
            username: email.split('@')[0],
            displayName: '', // Empty initially so they complete profile
            photoUrl: photoURL || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            partnerId: '',
            relationshipStartDate: '',
            relationshipStatus: 'single',
          };
          FirebaseFirestore.saveUsers(firestoreUsers);
        }

        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(authenticatedUser));
        resolve(authenticatedUser);
      }, 1000);
    });
  },

  // Simulated Sign out
  signOut(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        resolve();
      }, 800);
    });
  }
};

export interface FirestoreUserDoc {
  uid: string;
  username: string;
  displayName: string;
  photoUrl: string;
  birthDate?: string;
  gender?: string;
  createdAt: string;
  updatedAt: string;
  partnerId: string;
  partnerName?: string;
  connectedAt?: string;
  relationshipStartDate: string;
  relationshipStatus: 'single' | 'coupled' | 'connected';
  status?: 'online' | 'offline';
  lastSeen?: string;
}

export interface InvitationCode {
  code: string;
  creatorId: string;
  createdAt: string; // ISO String
  expiresAt: string; // ISO String
}

const FIRESTORE_KEYS = {
  USERS: 'together_firestore_users',
  INVITATIONS: 'together_firestore_invitations',
  MEMORIES: 'together_firestore_memories',
};

// Simulation of transient failure to test "Coba Lagi" (first attempt on get can fail to show beautiful error state)
let simulatedGlitchCount = 0;

export const FirebaseFirestore = {
  // Reset glitch count for testing purposes
  resetGlitch() {
    simulatedGlitchCount = 0;
  },

  getUsers(): Record<string, FirestoreUserDoc> {
    const data = localStorage.getItem(FIRESTORE_KEYS.USERS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    }
    return {};
  },

  saveUsers(users: Record<string, FirestoreUserDoc>) {
    localStorage.setItem(FIRESTORE_KEYS.USERS, JSON.stringify(users));
  },

  getInvitations(): Record<string, InvitationCode> {
    const data = localStorage.getItem(FIRESTORE_KEYS.INVITATIONS);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    }
    return {};
  },

  saveInvitations(invitations: Record<string, InvitationCode>) {
    localStorage.setItem(FIRESTORE_KEYS.INVITATIONS, JSON.stringify(invitations));
  },

  // Get user doc by UID
  getUserDoc(uid: string, forceSuccess: boolean = false): Promise<FirestoreUserDoc | null> {
    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        // Simulate a transient error to show the beautiful "Coba Lagi" page
        // Only trigger once to ensure "Coba Lagi" successfully resolves next time
        if (!forceSuccess && simulatedGlitchCount === 0) {
          simulatedGlitchCount++;
          reject(new Error('Koneksi terputus. Gagal mengambil data dari database Firestore.'));
          return;
        }

        const users = this.getUsers();
        const user = users[uid];
        resolve(user || null);
      }, 1000);
    });
  },

  // Set or update user doc
  setUserDoc(uid: string, data: Partial<FirestoreUserDoc>): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const users = this.getUsers();
        const existing = users[uid] || {
          uid,
          username: '',
          displayName: '',
          photoUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          partnerId: '',
          relationshipStartDate: '',
          relationshipStatus: 'single',
        };

        const updated: FirestoreUserDoc = {
          ...existing,
          ...data,
          uid, // preserve uid
          updatedAt: new Date().toISOString(),
        } as FirestoreUserDoc;

        users[uid] = updated;
        this.saveUsers(users);

        // Dispatch an event so other components or open windows can listen to updates in real time
        window.dispatchEvent(new CustomEvent('together_presence_updated', {
          detail: { uid, status: updated.status || 'online', lastSeen: updated.lastSeen || new Date().toISOString() }
        }));

        resolve();
      }, 1000);
    });
  },

  // Update relationship start date for both connected partners
  updateRelationshipStartDate(uid: string, partnerId: string, startDate: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = this.getUsers();
        const user = users[uid];
        const partner = partnerId ? users[partnerId] : null;

        if (!user) {
          reject(new Error('Pengguna tidak ditemukan.'));
          return;
        }

        user.relationshipStartDate = startDate;
        user.updatedAt = new Date().toISOString();
        users[uid] = user;

        if (partner) {
          partner.relationshipStartDate = startDate;
          partner.updatedAt = new Date().toISOString();
          users[partnerId] = partner;
        }

        this.saveUsers(users);
        // Dispatch an event so other components or open windows can listen to updates in real time
        window.dispatchEvent(new CustomEvent('together_relationship_start_date_updated', { detail: startDate }));
        resolve();
      }, 1000);
    });
  },

  // Generate an invitation code
  generateInvitationCode(uid: string): Promise<InvitationCode> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const invitations = this.getInvitations();

        // Remove any old invitations created by this user
        Object.keys(invitations).forEach((code) => {
          if (invitations[code].creatorId === uid) {
            delete invitations[code];
          }
        });

        // Generate a cryptographically secure-looking 6-char alpha-numeric uppercase code
        // Easy to read, hard to guess: excludes similar characters (like O, 0, I, 1)
        const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
        let code = '';
        let isUnique = false;

        while (!isUnique) {
          code = 'TG-';
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          if (!invitations[code]) {
            isUnique = true;
          }
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes

        const newInvitation: InvitationCode = {
          code,
          creatorId: uid,
          createdAt: now.toISOString(),
          expiresAt,
        };

        invitations[code] = newInvitation;
        this.saveInvitations(invitations);
        resolve(newInvitation);
      }, 800);
    });
  },

  // Get active invitation code for user
  getInvitationCodeForUser(uid: string): Promise<InvitationCode | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const invitations = this.getInvitations();
        const now = new Date().getTime();
        
        const invitationList = Object.values(invitations) as InvitationCode[];
        const found = invitationList.find(
          (inv) => inv.creatorId === uid && new Date(inv.expiresAt).getTime() > now
        );

        resolve(found || null);
      }, 500);
    });
  },

  // Cancel/delete invitation code for user
  cancelInvitationCode(uid: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const invitations = this.getInvitations();
        let changed = false;

        Object.keys(invitations).forEach((code) => {
          if (invitations[code].creatorId === uid) {
            delete invitations[code];
            changed = true;
          }
        });

        if (changed) {
          this.saveInvitations(invitations);
        }
        resolve();
      }, 500);
    });
  },

  // Validate an invitation code and return the creator's profile
  validateAndGetPartnerForCode(code: string, currentUid: string): Promise<FirestoreUserDoc> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const sanitizedCode = code.trim().toUpperCase();
        
        if (!sanitizedCode) {
          reject(new Error('Kode undangan tidak boleh kosong.'));
          return;
        }

        // Validate format: TG-XXXXXX
        const formatRegex = /^TG-[2-9A-Z]{6}$/;
        if (!formatRegex.test(sanitizedCode)) {
          reject(new Error('Format kode salah. Contoh format yang benar: TG-8K4M2P'));
          return;
        }

        const invitations = this.getInvitations();
        const invitation = invitations[sanitizedCode];

        if (!invitation) {
          reject(new Error('Kode undangan tidak ditemukan. Periksa kembali kode Anda.'));
          return;
        }

        // Check expiry
        const now = new Date().getTime();
        if (new Date(invitation.expiresAt).getTime() <= now) {
          reject(new Error('Kode undangan sudah kadaluarsa (berlaku selama 10 menit).'));
          return;
        }

        // Check self-invitation
        if (invitation.creatorId === currentUid) {
          reject(new Error('Anda tidak dapat menggunakan kode undangan Anda sendiri.'));
          return;
        }

        // Fetch partner details
        const users = this.getUsers();
        const partner = users[invitation.creatorId];

        if (!partner) {
          reject(new Error('Pengguna pembuat kode tidak ditemukan.'));
          return;
        }

        // Check if partner already connected
        if (partner.relationshipStatus === 'connected') {
          reject(new Error('Pengguna tersebut sudah terhubung dengan pasangan lain.'));
          return;
        }

        resolve(partner);
      }, 1000);
    });
  },

  // Securely connect two users as partners
  connectPartners(uid1: string, uid2: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = this.getUsers();
        const user1 = users[uid1];
        const user2 = users[uid2];

        if (!user1 || !user2) {
          reject(new Error('Satu atau kedua akun tidak ditemukan.'));
          return;
        }

        if (user1.relationshipStatus === 'connected' || user2.relationshipStatus === 'connected') {
          reject(new Error('Salah satu atau kedua akun sudah terhubung dengan pasangan lain.'));
          return;
        }

        const connectedTime = new Date().toISOString();

        // Update User 1
        user1.relationshipStatus = 'connected';
        user1.partnerId = uid2;
        user1.partnerName = user2.displayName || user2.username;
        user1.connectedAt = connectedTime;
        if (!user1.relationshipStartDate) {
          user1.relationshipStartDate = '';
        }

        // Update User 2
        user2.relationshipStatus = 'connected';
        user2.partnerId = uid1;
        user2.partnerName = user1.displayName || user1.username;
        user2.connectedAt = connectedTime;
        if (!user2.relationshipStartDate) {
          user2.relationshipStartDate = '';
        }

        users[uid1] = user1;
        users[uid2] = user2;
        this.saveUsers(users);

        // Delete any invitation codes associated with both users to avoid reuse
        const invitations = this.getInvitations();
        let invitationsChanged = false;
        Object.keys(invitations).forEach((code) => {
          if (invitations[code].creatorId === uid1 || invitations[code].creatorId === uid2) {
            delete invitations[code];
            invitationsChanged = true;
          }
        });

        if (invitationsChanged) {
          this.saveInvitations(invitations);
        }

        // Dispatch events so both users' active frames sync in real time
        window.dispatchEvent(new CustomEvent('together_presence_updated', {
          detail: { uid: uid1, status: user1.status || 'online', lastSeen: user1.lastSeen || new Date().toISOString() }
        }));
        window.dispatchEvent(new CustomEvent('together_presence_updated', {
          detail: { uid: uid2, status: user2.status || 'online', lastSeen: user2.lastSeen || new Date().toISOString() }
        }));
 
        resolve();
      }, 1200);
    });
  },

  // Get composite chatId for two users
  getChatId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
  },

  // Get messages for a chat ID (internal helper)
  getChatMessagesRaw(chatId: string): ChatMessage[] {
    const key = `together_firestore_chat_messages_${chatId}`;
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    return [];
  },

  // Save messages for a chat ID (internal helper)
  saveChatMessagesRaw(chatId: string, messages: ChatMessage[]) {
    const key = `together_firestore_chat_messages_${chatId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  },

  // Fetch all chat messages asynchronously
  getChatMessages(chatId: string): Promise<ChatMessage[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.getChatMessagesRaw(chatId));
      }, 100); // lightweight delay for natural feel
    });
  },

  // Update user presence (Online / Offline status)
  updateUserPresence(uid: string, status: 'online' | 'offline'): Promise<void> {
    return new Promise((resolve) => {
      const users = this.getUsers();
      if (users[uid]) {
        users[uid].status = status;
        users[uid].lastSeen = new Date().toISOString();
        this.saveUsers(users);

        // Notify local and storage listeners
        const event = new CustomEvent('together_presence_updated', {
          detail: { uid, status, lastSeen: users[uid].lastSeen }
        });
        window.dispatchEvent(event);
      }
      resolve();
    });
  },

  // Subscribe to partner user document (Presence)
  subscribeUserDoc(uid: string, callback: (doc: FirestoreUserDoc | null) => void): () => void {
    const handlePresenceUpdate = (event: Event) => {
      const customEv = event as CustomEvent;
      if (customEv.detail && customEv.detail.uid === uid) {
        const users = this.getUsers();
        callback(users[uid] || null);
      }
    };

    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === FIRESTORE_KEYS.USERS) {
        const users = this.getUsers();
        callback(users[uid] || null);
      }
    };

    window.addEventListener('together_presence_updated', handlePresenceUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    // Initial value
    const users = this.getUsers();
    callback(users[uid] || null);

    return () => {
      window.removeEventListener('together_presence_updated', handlePresenceUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  },

  // Get raw chat session (internal helper)
  getChatSessionRaw(chatId: string): ChatSession | null {
    const key = `together_firestore_chat_session_${chatId}`;
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Set typing status
  setTypingStatus(chatId: string, uid: string, isTyping: boolean): Promise<void> {
    return new Promise((resolve) => {
      const key = `together_firestore_chat_session_${chatId}`;
      let session = this.getChatSessionRaw(chatId);
      const nowIso = new Date().toISOString();

      if (!session) {
        session = {
          id: chatId,
          uids: chatId.split('_'),
          updatedAt: nowIso,
          isTyping: {},
        };
      }

      if (!session.isTyping) {
        session.isTyping = {};
      }

      session.isTyping[uid] = isTyping;
      session.updatedAt = nowIso;
      localStorage.setItem(key, JSON.stringify(session));

      // Dispatch event
      const event = new CustomEvent('together_session_updated', {
        detail: { chatId, session }
      });
      window.dispatchEvent(event);
      resolve();
    });
  },

  // Subscribe to Chat Session (for Typing indicator)
  subscribeChatSession(chatId: string, callback: (session: ChatSession | null) => void): () => void {
    const handleSessionUpdate = (event: Event) => {
      const customEv = event as CustomEvent;
      if (customEv.detail && customEv.detail.chatId === chatId) {
        callback(customEv.detail.session);
      }
    };

    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === `together_firestore_chat_session_${chatId}`) {
        callback(this.getChatSessionRaw(chatId));
      }
    };

    window.addEventListener('together_session_updated', handleSessionUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    // Initial invocation
    callback(this.getChatSessionRaw(chatId));

    return () => {
      window.removeEventListener('together_session_updated', handleSessionUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  },

  // Mark all unread incoming messages as read
  markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    return new Promise((resolve) => {
      const messages = this.getChatMessagesRaw(chatId);
      let changed = false;

      const updatedMessages = messages.map((msg) => {
        if (msg.receiverId === userId && msg.status !== 'read') {
          changed = true;
          return { ...msg, status: 'read' as const };
        }
        return msg;
      });

      if (changed) {
        this.saveChatMessagesRaw(chatId, updatedMessages);
        
        // Notify
        const updateEvent = new CustomEvent('together_chat_updated', { 
          detail: { chatId } 
        });
        window.dispatchEvent(updateEvent);
      }
      resolve();
    });
  },

  // Edit a specific message (sender only)
  editChatMessage(chatId: string, messageId: string, newText: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const trimmed = newText.trim();
      if (!trimmed) {
        reject(new Error('Pesan tidak boleh kosong.'));
        return;
      }

      const messages = this.getChatMessagesRaw(chatId);
      const idx = messages.findIndex((m) => m.id === messageId || m.messageId === messageId);
      if (idx === -1) {
        reject(new Error('Pesan tidak ditemukan.'));
        return;
      }

      messages[idx].text = trimmed;
      messages[idx].isEdited = true;
      messages[idx].updatedAt = new Date().toISOString();

      this.saveChatMessagesRaw(chatId, messages);

      // Dispatch update
      const updateEvent = new CustomEvent('together_chat_updated', { 
        detail: { chatId } 
      });
      window.dispatchEvent(updateEvent);
      resolve();
    });
  },

  // Delete a specific message (for Me or for Everyone)
  deleteChatMessage(chatId: string, messageId: string, deleteType: 'me' | 'everyone', userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const messages = this.getChatMessagesRaw(chatId);
      const idx = messages.findIndex((m) => m.id === messageId || m.messageId === messageId);
      if (idx === -1) {
        reject(new Error('Pesan tidak ditemukan.'));
        return;
      }

      if (deleteType === 'everyone') {
        messages[idx].isDeletedForAll = true;
        messages[idx].text = 'Pesan ini telah dihapus';
        messages[idx].updatedAt = new Date().toISOString();
      } else {
        // deleted for me
        if (!messages[idx].deletedFor) {
          messages[idx].deletedFor = [];
        }
        if (!messages[idx].deletedFor.includes(userId)) {
          messages[idx].deletedFor.push(userId);
        }
      }

      this.saveChatMessagesRaw(chatId, messages);

      // Dispatch update
      const updateEvent = new CustomEvent('together_chat_updated', { 
        detail: { chatId } 
      });
      window.dispatchEvent(updateEvent);
      resolve();
    });
  },

  // Send a chat message (with replyTo support)
  sendChatMessage(
    chatId: string, 
    senderId: string, 
    receiverId: string, 
    text: string, 
    replyTo?: { id: string; text: string; senderId: string; senderName: string }
  ): Promise<ChatMessage> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const sanitizedText = text.trim();
        if (!sanitizedText) {
          reject(new Error('Pesan tidak boleh kosong.'));
          return;
        }

        const maxLen = 1000;
        if (sanitizedText.length > maxLen) {
          reject(new Error(`Pesan terlalu panjang (maksimal ${maxLen} karakter).`));
          return;
        }

        const chatIdComputed = this.getChatId(senderId, receiverId);
        const messages = this.getChatMessagesRaw(chatIdComputed);
        const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const nowIso = new Date().toISOString();

        const newMessage: ChatMessage = {
          id: msgId,
          messageId: msgId,
          conversationId: chatIdComputed,
          senderId,
          receiverId,
          text: sanitizedText,
          timestamp: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
          type: 'text',
          status: 'sent',
          replyTo,
        };

        messages.push(newMessage);
        this.saveChatMessagesRaw(chatIdComputed, messages);

        // Update ChatSession metadata
        const sessionKey = `together_firestore_chat_session_${chatIdComputed}`;
        const session: ChatSession = {
          id: chatIdComputed,
          uids: [senderId, receiverId],
          lastMessage: {
            text: sanitizedText,
            senderId,
            timestamp: nowIso,
          },
          updatedAt: nowIso,
          isTyping: {},
        };
        localStorage.setItem(sessionKey, JSON.stringify(session));

        // Dispatch custom events for immediate real-time updates within browser
        const updateEvent = new CustomEvent('together_chat_updated', { 
          detail: { chatId: chatIdComputed, message: newMessage } 
        });
        window.dispatchEvent(updateEvent);

        resolve(newMessage);
      }, 100);
    });
  },

  // Send a chat message with media attachment (Image / Voice Note)
  sendChatMediaMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    type: 'image' | 'voice_note',
    fileUrl: string,
    duration?: number,
    textPlaceholder?: string
  ): Promise<ChatMessage> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const chatIdComputed = this.getChatId(senderId, receiverId);
        const messages = this.getChatMessagesRaw(chatIdComputed);
        const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const nowIso = new Date().toISOString();

        const newMessage: ChatMessage = {
          id: msgId,
          messageId: msgId,
          conversationId: chatIdComputed,
          senderId,
          receiverId,
          text: textPlaceholder || (type === 'image' ? '📷 Foto' : '🎙️ Pesan Suara'),
          timestamp: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
          type,
          status: 'sent',
          fileUrl,
          duration,
        };

        messages.push(newMessage);
        this.saveChatMessagesRaw(chatIdComputed, messages);

        // Update ChatSession metadata
        const sessionKey = `together_firestore_chat_session_${chatIdComputed}`;
        const session: ChatSession = {
          id: chatIdComputed,
          uids: [senderId, receiverId],
          lastMessage: {
            text: newMessage.text,
            senderId,
            timestamp: nowIso,
          },
          updatedAt: nowIso,
          isTyping: {},
        };
        localStorage.setItem(sessionKey, JSON.stringify(session));

        // Dispatch custom events for immediate real-time updates within browser
        const updateEvent = new CustomEvent('together_chat_updated', { 
          detail: { chatId: chatIdComputed, message: newMessage } 
        });
        window.dispatchEvent(updateEvent);

        resolve(newMessage);
      }, 100);
    });
  },

  // Subscribe to messages with a callback (real-time listener)
  subscribeChatMessages(chatId: string, callback: (messages: ChatMessage[]) => void): () => void {
    // Handler for local custom event (same tab or active iframe context)
    const handleLocalUpdate = (event: Event) => {
      const customEv = event as CustomEvent;
      if (customEv.detail && customEv.detail.chatId === chatId) {
        callback(this.getChatMessagesRaw(chatId));
      }
    };

    // Handler for cross-tab storage updates
    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === `together_firestore_chat_messages_${chatId}`) {
        callback(this.getChatMessagesRaw(chatId));
      }
    };

    // Listen to local dispatch and storage sync
    window.addEventListener('together_chat_updated', handleLocalUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    // Initial immediate callback invocation
    callback(this.getChatMessagesRaw(chatId));

    // Return unsubscribe function
    return () => {
      window.removeEventListener('together_chat_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  },

  getMemoriesRaw(): Record<string, Memory> {
    const data = localStorage.getItem(FIRESTORE_KEYS.MEMORIES);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    }
    return {};
  },

  saveMemoriesRaw(memories: Record<string, Memory>) {
    localStorage.setItem(FIRESTORE_KEYS.MEMORIES, JSON.stringify(memories));
  },

  getMemories(userId: string): Promise<Memory[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const memories = Object.values(this.getMemoriesRaw()) as Memory[];
        // Filter memories where coupleIds contains userId
        const filtered = memories.filter(m => m.coupleIds && m.coupleIds.includes(userId));
        // Sort by date descending, then by createdAt descending
        filtered.sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        resolve(filtered);
      }, 300);
    });
  },

  addMemory(data: {
    title: string;
    description: string;
    date: string;
    location?: string;
    photoUrl?: string;
    mood?: string;
    creatorId: string;
    creatorName: string;
    coupleIds: string[];
  }): Promise<Memory> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const memories = this.getMemoriesRaw();
        const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const nowIso = new Date().toISOString();
        const newMemory: Memory = {
          ...data,
          id,
          isFavorite: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        memories[id] = newMemory;
        this.saveMemoriesRaw(memories);

        // Dispatch events for real-time sync across tabs or frames
        const updateEvent = new CustomEvent('together_memories_updated', {
          detail: { id, action: 'add', memory: newMemory }
        });
        window.dispatchEvent(updateEvent);

        resolve(newMemory);
      }, 400);
    });
  },

  updateMemory(id: string, data: Partial<Memory>): Promise<Memory> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const memories = this.getMemoriesRaw();
        const existing = memories[id];
        if (!existing) {
          reject(new Error('Memory tidak ditemukan.'));
          return;
        }

        const updated: Memory = {
          ...existing,
          ...data,
          id, // preserve id
          updatedAt: new Date().toISOString(),
        };

        memories[id] = updated;
        this.saveMemoriesRaw(memories);

        const updateEvent = new CustomEvent('together_memories_updated', {
          detail: { id, action: 'update', memory: updated }
        });
        window.dispatchEvent(updateEvent);

        resolve(updated);
      }, 400);
    });
  },

  deleteMemory(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const memories = this.getMemoriesRaw();
        if (!memories[id]) {
          reject(new Error('Memory tidak ditemukan.'));
          return;
        }

        delete memories[id];
        this.saveMemoriesRaw(memories);

        const updateEvent = new CustomEvent('together_memories_updated', {
          detail: { id, action: 'delete' }
        });
        window.dispatchEvent(updateEvent);

        resolve();
      }, 300);
    });
  },

  subscribeMemories(userId: string, callback: (memories: Memory[]) => void): () => void {
    const handleLocalUpdate = () => {
      this.getMemories(userId).then(callback);
    };

    const handleStorageUpdate = (event: StorageEvent) => {
      if (event.key === FIRESTORE_KEYS.MEMORIES) {
        this.getMemories(userId).then(callback);
      }
    };

    window.addEventListener('together_memories_updated', handleLocalUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    // Initial load
    this.getMemories(userId).then(callback);

    return () => {
      window.removeEventListener('together_memories_updated', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }
};

export const FirebaseStorage = {
  uploadFile(path: string, file: File | string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (typeof file === 'string') {
          resolve(file);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }, 500);
    });
  }
};

export interface Memory {
  id: string;
  title: string;
  description: string;
  date: string;
  location?: string;
  photoUrl?: string;
  mood?: string;
  creatorId: string;
  creatorName: string;
  coupleIds: string[];
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * ==========================================
 * CHAT COLLECTION ARCHITECTURAL FOUNDATION
 * ==========================================
 * These interfaces define the Firestore database schemas 
 * for Stage 8B/8C (real-time chat implementation).
 */

export interface ChatMessage {
  id: string;             // Document ID in Firestore 'chats/{chatId}/messages/{messageId}'
  messageId: string;      // Explicit message ID for schema compliance
  conversationId: string; // Explicit conversation/session ID
  senderId: string;       // Sender UID
  receiverId: string;     // Receiver UID
  text: string;           // Message payload (for text/images placeholder/replies)
  timestamp: string;      // ISO String format
  createdAt: string;      // ISO String format
  updatedAt: string;      // ISO String format
  type: 'text' | 'image' | 'voice_note' | 'call_log' | 'sticker';
  status: 'sent' | 'delivered' | 'read';
  // Additional Stage 8C fields:
  isEdited?: boolean;
  deletedFor?: string[];
  isDeletedForAll?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
  };
  fileUrl?: string;       // base64 data-URL or mock HTTP link
  duration?: number;      // for voice note playbacks in seconds
}

export interface ChatSession {
  id: string;             // Composite ID: sorted_uids(uid1, uid2)
  uids: string[];         // Array containing both UIDs for indexing queries
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: string;
  };
  updatedAt: string;      // ISO String for sorting the active chats
  isTyping: Record<string, boolean>; // Realtime presence for typing indicators
}


