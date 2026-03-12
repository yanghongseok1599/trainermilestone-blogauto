'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createSupabaseBrowserClient } from './supabase-client';
import { logActivity } from './activity-log';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

const ADMIN_SESSION_KEY = 'blogbooster_admin_session';

// Supabase User 호환 인터페이스 - 기존 컴포넌트에서 user.uid, user.displayName 등 사용
export interface AppUser {
  uid: string;
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

function toAppUser(supabaseUser: SupabaseUser): AppUser {
  return {
    uid: supabaseUser.id,
    id: supabaseUser.id,
    email: supabaseUser.email ?? null,
    displayName: (supabaseUser.user_metadata?.full_name as string)
      || (supabaseUser.user_metadata?.name as string)
      || null,
    photoURL: (supabaseUser.user_metadata?.avatar_url as string)
      || (supabaseUser.user_metadata?.picture as string)
      || null,
    app_metadata: supabaseUser.app_metadata,
    user_metadata: supabaseUser.user_metadata,
  };
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isSuperAdmin: boolean;
  getAuthHeaders: () => Promise<Record<string, string>>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInAsAdmin: (username: string, password: string) => boolean;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createSupabaseBrowserClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    // 관리자 세션 확인
    const adminSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (adminSession === 'true') {
      setIsSuperAdmin(true);
      const adminUser: AppUser = {
        uid: 'admin-ccv5',
        id: 'admin-ccv5',
        email: 'admin@trainermilestone.com',
        displayName: '관리자',
        photoURL: null,
        app_metadata: { role: 'admin' },
      };
      setUser(adminUser);
      setLoading(false);
      return;
    }

    // Supabase 세션 복원
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkAndSetUser(session.user);
      } else {
        setLoading(false);
      }
    });

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await checkAndSetUser(session.user);
        } else {
          setUser(null);
          setIsSuperAdmin(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkAndSetUser = async (authUser: SupabaseUser) => {
    // 차단된 사용자 체크
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_blocked')
        .eq('id', authUser.id)
        .single();

      if (profile?.is_blocked) {
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        return;
      }
    } catch {
      // 프로필 체크 실패 시 통과 허용
    }

    // admin 체크
    if (authUser.app_metadata?.role === 'admin') {
      setIsSuperAdmin(true);
    }

    setUser(toAppUser(authUser));
    setLoading(false);
  };

  const updateLoginHistory = async (userId: string) => {
    try {
      const now = new Date().toISOString();
      const { data: profile } = await supabase
        .from('profiles')
        .select('login_history')
        .eq('id', userId)
        .single();

      const history = profile?.login_history || [];
      history.push(now);
      const trimmed = history.slice(-5);

      await supabase
        .from('profiles')
        .update({
          last_login_at: now,
          login_history: trimmed,
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Failed to update login history:', error);
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes('not enabled')) {
        throw new Error('Google 로그인이 활성화되지 않았습니다. Supabase Dashboard에서 Google Provider를 활성화해주세요.');
      }
      throw new Error(error.message || 'Google 로그인에 실패했습니다.');
    }
  };

  // 아이디 → 이메일 매핑 (이메일 형식이 아닌 경우)
  const USERNAME_ALIASES: Record<string, string> = {
    'vibecoding': 'dytpq1019@gmail.com',
  };

  const signInWithEmail = async (email: string, password: string) => {
    const resolvedEmail = USERNAME_ALIASES[email.toLowerCase()] || email;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }
      throw new Error(error.message || '로그인에 실패했습니다.');
    }

    if (data.user) {
      await updateLoginHistory(data.user.id);
      logActivity(data.user.id, 'login', '이메일 로그인');
    }
  };

  // 관리자 로그인 (이메일 형식 불필요)
  const signInAsAdmin = (username: string, password: string): boolean => {
    if (username === 'ccv5' && password === '3412aa') {
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setIsSuperAdmin(true);
      const adminUser: AppUser = {
        uid: 'admin-ccv5',
        id: 'admin-ccv5',
        email: 'admin@trainermilestone.com',
        displayName: '관리자',
        photoURL: null,
        app_metadata: { role: 'admin' },
      };
      setUser(adminUser);
      return true;
    }
    return false;
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('이미 가입된 이메일입니다.');
      }
      throw new Error(error.message || '회원가입에 실패했습니다.');
    }

    if (data.user) {
      await updateLoginHistory(data.user.id);
    }
  };

  const logout = async () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    const wasAdmin = isSuperAdmin;
    setIsSuperAdmin(false);
    setUser(null);
    setSession(null);

    if (wasAdmin) return;

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // API 요청용 인증 헤더 반환
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (isSuperAdmin) {
      return { 'X-Admin-Auth': 'admin-ccv5' };
    }
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` };
    }
    // 세션 갱신 시도
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return { 'Authorization': `Bearer ${data.session.access_token}` };
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
