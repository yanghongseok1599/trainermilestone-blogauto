'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { logActivity } from './activity-log';

// 관리자 계정 설정
const ADMIN_CREDENTIALS = {
  username: 'ccv5',
  password: '3412aa',
};

const ADMIN_SESSION_KEY = 'blogbooster_admin_session';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSuperAdmin: boolean; // 시스템 관리자 (ccv5)
  getAuthHeaders: () => Promise<Record<string, string>>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInAsAdmin: (username: string, password: string) => boolean;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    // 관리자 세션 확인
    const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (adminSession === 'true') {
      setIsSuperAdmin(true);
      document.cookie = 'admin_uid=admin-ccv5; path=/; max-age=86400; SameSite=Lax';
      // 관리자용 가상 유저 객체 생성
      const adminUser = {
        uid: 'admin-ccv5',
        email: 'admin@trainermilestone.com',
        displayName: '관리자',
        photoURL: null,
      } as User;
      setUser(adminUser);
      setLoading(false);
      return;
    }

    // Skip if auth is not initialized
    if (!auth) {
      setLoading(false);
      return;
    }

    // Handle redirect result (for mobile/popup blocked cases)
    const handleRedirectResult = async () => {
      if (!auth) return;
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          await saveUserToFirestore(result.user);
        }
      } catch (error) {
        console.error('Redirect result error:', error);
      }
    };
    handleRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && db) {
        // 차단된 사용자 체크
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists() && userSnap.data().isBlocked) {
            await signOut(auth!);
            setUser(null);
            setLoading(false);
            return;
          }
        } catch {
          // 체크 실패 시 통과 허용
        }
      }
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Save user data to Firestore
  const saveUserToFirestore = async (user: User) => {
    if (!db) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const now = new Date();

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        loginHistory: [Timestamp.fromDate(now)],
      });
    } else {
      // 최근 5회 접속 기록 유지
      const data = userSnap.data();
      const history: Timestamp[] = data.loginHistory || [];
      history.push(Timestamp.fromDate(now));
      // 최근 5개만 유지
      const trimmed = history.slice(-5);

      await setDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        loginHistory: trimmed,
      }, { merge: true });
    }
  };

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error('Firebase가 초기화되지 않았습니다. .env.local 파일을 확인해주세요.');
    }
    try {
      // Try popup first
      const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      await saveUserToFirestore(result.user);
      logActivity(result.user.uid, 'login', 'Google 로그인');
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      console.error('Google sign in error:', firebaseError);

      // If popup blocked or failed, try redirect
      if (firebaseError.code === 'auth/popup-blocked' ||
          firebaseError.code === 'auth/popup-closed-by-user' ||
          firebaseError.code === 'auth/cancelled-popup-request') {
        console.log('Popup blocked, trying redirect...');
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      // Provide user-friendly error messages
      if (firebaseError.code === 'auth/unauthorized-domain') {
        throw new Error('이 도메인은 Firebase에서 승인되지 않았습니다. Firebase Console > Authentication > Settings > 승인된 도메인에서 도메인을 추가해주세요.');
      }
      if (firebaseError.code === 'auth/operation-not-allowed') {
        throw new Error('Google 로그인이 활성화되지 않았습니다. Firebase Console > Authentication > Sign-in method에서 Google을 활성화해주세요.');
      }
      if (firebaseError.code === 'auth/internal-error') {
        throw new Error('Firebase 인증 오류가 발생했습니다. Firebase Console 설정을 확인해주세요.');
      }

      throw new Error(firebaseError.message || 'Google 로그인에 실패했습니다.');
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase가 초기화되지 않았습니다. .env.local 파일을 확인해주세요.');
    }
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await saveUserToFirestore(result.user);
      logActivity(result.user.uid, 'login', '이메일 로그인');
    } catch (error) {
      console.error('Email sign in error:', error);
      throw error;
    }
  };

  // 관리자 로그인 (이메일 형식 불필요)
  const signInAsAdmin = (username: string, password: string): boolean => {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      document.cookie = 'admin_uid=admin-ccv5; path=/; max-age=86400; SameSite=Lax';
      setIsSuperAdmin(true);
      // 관리자용 가상 유저 객체 생성
      const adminUser = {
        uid: 'admin-ccv5',
        email: 'admin@trainermilestone.com',
        displayName: '관리자',
        photoURL: null,
      } as User;
      setUser(adminUser);
      return true;
    }
    return false;
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    if (!auth) {
      throw new Error('Firebase가 초기화되지 않았습니다. .env.local 파일을 확인해주세요.');
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await saveUserToFirestore(result.user);
    } catch (error) {
      console.error('Email sign up error:', error);
      throw error;
    }
  };

  const logout = async () => {
    // 관리자 세션 클리어
    localStorage.removeItem(ADMIN_SESSION_KEY);
    document.cookie = 'admin_uid=; path=/; max-age=0';
    const wasAdmin = isSuperAdmin;
    setIsSuperAdmin(false);
    setUser(null);

    // 관리자는 Firebase 인증을 사용하지 않으므로 signOut 불필요
    if (wasAdmin || !auth) {
      return;
    }

    try {
      await signOut(auth!);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // API 요청용 인증 헤더 반환 (관리자는 쿠키 사용, 일반 유저는 Firebase ID 토큰)
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (isSuperAdmin) return {}; // 관리자는 쿠키로 인증
    if (user) {
      try {
        const token = await user.getIdToken();
        return { 'Authorization': `Bearer ${token}` };
      } catch {
        return {};
      }
    }
    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSuperAdmin,
        getAuthHeaders,
        signInWithGoogle,
        signInWithEmail,
        signInAsAdmin,
        signUpWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
