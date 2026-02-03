'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, User, Loader2, FileText, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getSeoSchedule } from '@/lib/post-service';
import { POST_TYPE_INFO, PostType, calculateDaysRemaining, calculateNextDue } from '@/types/post';

export function Header() {
  const { user, loading, logout, isSuperAdmin } = useAuth();
  const [overdueCount, setOverdueCount] = useState(0);

  // SEO 알림 개수 로드
  useEffect(() => {
    const loadAlerts = async () => {
      if (!user) {
        setOverdueCount(0);
        return;
      }

      try {
        const schedule = await getSeoSchedule(user.uid);
        if (schedule) {
          let count = 0;
          (Object.keys(POST_TYPE_INFO) as PostType[]).forEach((postType) => {
            const item = schedule[postType];
            const cycleDays = POST_TYPE_INFO[postType].cycleDays;
            const nextDue = calculateNextDue(item.lastPublished, cycleDays);
            const daysRemaining = calculateDaysRemaining(nextDue);
            if (daysRemaining < 0) count++;
          });
          setOverdueCount(count);
        }
      } catch (error) {
        console.error('Failed to load SEO alerts:', error);
      }
    };

    loadAlerts();
  }, [user]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-2 max-w-6xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center mr-2">
            <Image
              src="/제목을 입력해주세요. (16).png"
              alt="트레이너 마일스톤 블로그 부스터"
              width={140}
              height={40}
              className="h-10 w-auto object-contain"
              style={{ aspectRatio: 'auto' }}
              priority
            />
          </Link>

          {/* Navigation & Auth */}
          <div className="flex items-center gap-4">
            {/* Golden Keyword Extractor Link */}
            <Link href="/keyword-extractor">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#6b7280] hover:text-[#f72c5b] hover:bg-[#f72c5b]/10"
              >
                황금키워드추출기
              </Button>
            </Link>

            {/* Blog Auto Link */}
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#6b7280] hover:text-[#f72c5b] hover:bg-[#f72c5b]/10"
              >
                BLOG-AUTO
              </Button>
            </Link>

            {/* Image Generator Link */}
            <Link href="/image-generator">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#6b7280] hover:text-[#f72c5b] hover:bg-[#f72c5b]/10"
              >
                이미지 생성기
              </Button>
            </Link>

            {/* Before/After Generator Link - 곧출시 */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#9ca3af] cursor-not-allowed opacity-60"
                disabled
              >
                비포애프터
              </Button>
              <span className="absolute -top-1 -right-2 px-1.5 py-0.5 text-[10px] font-bold bg-[#f72c5b] text-white rounded-full leading-none whitespace-nowrap">
                곧출시
              </span>
            </div>

            {/* Pricing Link */}
            <Link href="/pricing">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#6b7280] hover:text-[#f72c5b] hover:bg-[#f72c5b]/10"
              >
                요금표
              </Button>
            </Link>

            {/* Admin Link - Super Admin Only */}
            {isSuperAdmin && (
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#f72c5b] hover:text-[#e0264f] hover:bg-[#f72c5b]/10"
                >
                  <Settings className="w-4 h-4 mr-1" />
                  관리자
                </Button>
              </Link>
            )}

            {/* Auth Buttons */}
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#6b7280]" />
            ) : user ? (
              <div className="flex items-center gap-3">
                {!isSuperAdmin && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f5f5f5]">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || ''}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <User className="w-4 h-4 text-[#6b7280]" />
                    )}
                    <span className="text-sm text-[#111111]">
                      {(user.displayName || user.email?.split('@')[0] || '').substring(0, 4)}
                    </span>
                  </div>
                )}
                <Link href="/mypage">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative text-[#6b7280] hover:text-[#f72c5b] hover:bg-[#f72c5b]/10"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    마이페이지
                    {overdueCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {overdueCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-[#6b7280] hover:text-[#f72c5b] hover:bg-[#f72c5b]/10"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  로그아웃
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#6b7280] hover:text-[#111111]"
                  >
                    <LogIn className="w-4 h-4 mr-1" />
                    로그인
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="bg-[#f72c5b] hover:bg-[#e0264f] text-white"
                  >
                    회원가입
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
