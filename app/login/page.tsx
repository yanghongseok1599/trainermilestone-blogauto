'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Lock, ArrowLeft, User } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const { user, loading, signInWithGoogle, signInWithEmail, signInAsAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // 이미 로그인된 상태면 대시보드로 이동 (redirect 복귀 시)
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('아이디와 비밀번호를 입력해주세요');
      return;
    }

    setIsLoading(true);

    // 관리자 로그인 체크 (이메일 형식 불필요)
    if (signInAsAdmin(email, password)) {
      toast.success('관리자 로그인 성공!');
      router.push('/dashboard');
      setIsLoading(false);
      return;
    }

    // 일반 이메일 로그인
    try {
      await signInWithEmail(email, password);
      toast.success('로그인 성공!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '로그인 실패';
      if (errorMessage.includes('user-not-found')) {
        toast.error('등록되지 않은 계정입니다');
      } else if (errorMessage.includes('wrong-password')) {
        toast.error('비밀번호가 올바르지 않습니다');
      } else if (errorMessage.includes('invalid-email')) {
        toast.error('유효하지 않은 이메일 형식입니다');
      } else {
        toast.error('로그인 실패: ' + errorMessage);
      }
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      console.log('Google 로그인 시도...');
      await signInWithGoogle();
      toast.success('Google 로그인 성공!');
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error('Google 로그인 에러 상세:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google 로그인 실패';

      // 구체적인 에러 안내
      if (errorMessage.includes('operation-not-allowed')) {
        toast.error('Firebase Console에서 Google 로그인을 활성화해주세요', {
          description: 'Authentication > Sign-in method > Google > 사용 설정',
          duration: 8000,
        });
      } else if (errorMessage.includes('unauthorized-domain')) {
        toast.error('도메인이 승인되지 않았습니다', {
          description: 'Authentication > Settings > 승인된 도메인에서 localhost 추가',
          duration: 8000,
        });
      } else {
        toast.error(errorMessage);
      }
    }
    setIsGoogleLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white to-[#f5f5f5]">
      <Card className="w-full max-w-md border border-[#eeeeee] shadow-xl bg-white">
        <CardHeader className="text-center pb-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111111] mb-4 self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </Link>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f72c5b] to-[#ff6b6b] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <CardTitle className="text-2xl font-bold text-[#111111]">로그인</CardTitle>
          <CardDescription className="text-[#6b7280]">
            계정에 로그인하여 저장된 데이터를 불러오세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {/* Social Login Buttons */}
          <div className="space-y-3">
            {/* Google Login */}
            <Button
              variant="outline"
              className="w-full h-12 border-[#eeeeee] hover:bg-[#f5f5f5] text-[#111111] font-medium"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Google로 계속하기
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#eeeeee]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#9ca3af]">또는 아이디로 로그인</span>
            </div>
          </div>

          {/* Email/ID Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <Input
                  type="text"
                  placeholder="아이디 또는 이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <Input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-[#f72c5b] hover:bg-[#e0264f] text-white font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              로그인
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-[#6b7280]">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-[#f72c5b] hover:underline font-medium">
              회원가입
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f72c5b]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
