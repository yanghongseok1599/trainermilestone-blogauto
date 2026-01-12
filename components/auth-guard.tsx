'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: 'redirect' | 'message';
}

export function AuthGuard({ children, fallback = 'message' }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && fallback === 'redirect') {
      router.push('/login');
    }
  }, [user, loading, router, fallback]);

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f72c5b]" />
      </div>
    );
  }

  // 로그인 안됨 - 메시지 표시
  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-[#6b7280]" />
          </div>
          <h2 className="text-2xl font-bold text-[#111111] mb-3">
            로그인이 필요합니다
          </h2>
          <p className="text-[#6b7280] mb-6">
            이 기능을 사용하려면 먼저 로그인해주세요.
            <br />
            아직 계정이 없으시다면 회원가입을 해주세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button className="w-full sm:w-auto bg-[#f72c5b] hover:bg-[#e0264f] text-white">
                로그인
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" className="w-full sm:w-auto border-[#eeeeee]">
                회원가입
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 로그인됨 - children 렌더링
  return <>{children}</>;
}
