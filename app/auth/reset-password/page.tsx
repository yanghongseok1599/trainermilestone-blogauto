'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';
import type { AuthChangeEvent } from '@supabase/supabase-js';

const supabase = createSupabaseBrowserClient();

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Supabase가 URL의 토큰을 자동으로 처리하여 세션을 설정함
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('비밀번호를 입력해주세요');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('비밀번호가 일치하지 않습니다');
      return;
    }
    if (password.length < 6) {
      toast.error('비밀번호는 6자 이상이어야 합니다');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || '비밀번호 변경에 실패했습니다');
      } else {
        toast.success('비밀번호가 변경되었습니다!');
        router.push('/dashboard');
      }
    } catch {
      toast.error('비밀번호 변경 중 오류가 발생했습니다');
    }
    setIsLoading(false);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white to-[#f5f5f5]">
        <Card className="w-full max-w-md border border-[#eeeeee] shadow-xl bg-white">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#f72c5b] mb-4" />
            <p className="text-[#6b7280]">인증 확인 중...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white to-[#f5f5f5]">
      <Card className="w-full max-w-md border border-[#eeeeee] shadow-xl bg-white">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f72c5b] to-[#ff6b6b] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">B</span>
          </div>
          <CardTitle className="text-2xl font-bold text-[#111111]">새 비밀번호 설정</CardTitle>
          <CardDescription className="text-[#6b7280]">
            새로운 비밀번호를 입력해주세요
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <Input
                type="password"
                placeholder="새 비밀번호 (6자 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pl-10 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <Input
                type="password"
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 pl-10 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-[#f72c5b] hover:bg-[#e0264f] text-white font-semibold"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              비밀번호 변경
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
