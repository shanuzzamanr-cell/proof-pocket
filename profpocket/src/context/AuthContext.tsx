import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType, testFirestoreConnection } from '../services/firebase';

export interface UserCloudProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  preferredCurrency: string;
  themePreference: 'light' | 'dark';
  createdAt?: any;
  updatedAt?: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserCloudProfile | null;
  authLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfileData: (updates: Partial<UserCloudProfile>) => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'signup' | 'forgot_password';
  setAuthModalMode: (mode: 'login' | 'signup' | 'forgot_password') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserCloudProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Auth modal management
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'forgot_password'>('login');

  const clearAuthError = () => setAuthError(null);

  // Sync or fetch profile in Firestore users/{userId}
  const syncUserProfile = async (fbUser: FirebaseUser) => {
    const userRef = doc(db, 'users', fbUser.uid);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserProfile(snap.data() as UserCloudProfile);
      } else {
        const newProfile: UserCloudProfile = {
          uid: fbUser.uid,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'ProofPocket User',
          email: fbUser.email || '',
          photoURL: fbUser.photoURL || '/src/assets/images/avatar_sarah_chen_1794233966180.jpg',
          preferredCurrency: 'USD',
          themePreference: 'light',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
      }
    } catch (err) {
      console.error('[ProofPocket Auth] Error loading user profile:', err);
      // Fallback local representation if network transient
      setUserProfile({
        uid: fbUser.uid,
        displayName: fbUser.displayName || 'User',
        email: fbUser.email || '',
        photoURL: fbUser.photoURL || '/src/assets/images/avatar_sarah_chen_1794233966180.jpg',
        preferredCurrency: 'USD',
        themePreference: 'light',
      });
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Email / Password Login
  const signInWithEmail = async (email: string, pass: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await syncUserProfile(cred.user);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      const msg = getFriendlyAuthError(err?.code || err?.message);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Email / Password Signup
  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (name.trim()) {
        await firebaseUpdateProfile(cred.user, { displayName: name.trim() });
      }
      const userRef = doc(db, 'users', cred.user.uid);
      const initialProfile: UserCloudProfile = {
        uid: cred.user.uid,
        displayName: name.trim() || email.split('@')[0],
        email: cred.user.email || email.trim(),
        photoURL: '/src/assets/images/avatar_sarah_chen_1794233966180.jpg',
        preferredCurrency: 'USD',
        themePreference: 'light',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userRef, initialProfile);
      setUserProfile(initialProfile);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      const msg = getFriendlyAuthError(err?.code || err?.message);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Google Sign-In with popup
  const signInWithGoogle = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(res.user);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        setAuthLoading(false);
        return;
      }
      const msg = getFriendlyAuthError(err?.code || err?.message);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Forgot Password
  const resetPassword = async (email: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      const msg = getFriendlyAuthError(err?.code || err?.message);
      setAuthError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setAuthLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Update profile
  const updateUserProfileData = async (updates: Partial<UserCloudProfile>) => {
    if (!user) throw new Error('Not authenticated');
    const userRef = doc(db, 'users', user.uid);
    try {
      const payload = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(userRef, payload);
      if (updates.displayName) {
        await firebaseUpdateProfile(user, { displayName: updates.displayName });
      }
      setUserProfile(prev => (prev ? { ...prev, ...payload } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        authLoading,
        authError,
        clearAuthError,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        signOut,
        updateUserProfileData,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

function getFriendlyAuthError(codeOrMessage: string): string {
  if (codeOrMessage.includes('auth/invalid-email')) return 'Please enter a valid email address.';
  if (codeOrMessage.includes('auth/user-not-found') || codeOrMessage.includes('auth/wrong-password') || codeOrMessage.includes('auth/invalid-credential')) {
    return 'Invalid email or password credentials.';
  }
  if (codeOrMessage.includes('auth/email-already-in-use')) {
    return 'An account with this email address already exists.';
  }
  if (codeOrMessage.includes('auth/weak-password')) {
    return 'Password is too short. Please choose at least 6 characters.';
  }
  if (codeOrMessage.includes('auth/network-request-failed')) {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (codeOrMessage.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return codeOrMessage || 'Authentication operation failed.';
}
