'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, User, Loader2, Crown, PenTool, ImagePlus, ArrowLeftRight, Dumbbell } from 'lucide-react';

export function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/제목을 입력해주세요. (13).png"
              alt="BlogBooster"
              width={140}
              height={40}
              className="h-10 w-auto object-contain"
              style={{ aspectRatio: 'auto' }}
              priority
            />
          </Link>

          {/* Navigation & Auth */}
          <div className="flex items-center gap-4">
            {/* Blog Auto Link */}
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#6b7280] hover:text-[#f72c5b] hover:bg-[#f72c5b]/10"
              >
                <PenTool className="w-4 h-4 mr-1" />
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
                <ImagePlus className="w-4 h-4 mr-1" />
                이미지 생성기
              </Button>
            </Link>

            {/* Before/After Generator Link */}
            <Link href="/before-after">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#6b7280] hover:text-[#f72c5b] hover:bg-[#f72c5b]/10"
              >
                <ArrowLeftRight className="w-4 h-4 mr-1" />
                비포애프터
              </Button>
            </Link>

            {/* Exercise GIF Generator Link */}
            <Link href="/exercise-gif">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#6b7280] hover:text-[#f72c5b] hover:bg-[#f72c5b]/10"
              >
                <Dumbbell className="w-4 h-4 mr-1" />
                운동 GIF
              </Button>
            </Link>

            {/* Pricing Link */}
            <Link href="/pricing">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#6b7280] hover:text-[#f72c5b] hover:bg-[#f72c5b]/10"
              >
                <Crown className="w-4 h-4 mr-1" />
                요금제
              </Button>
            </Link>

            {/* Auth Buttons */}
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#6b7280]" />
            ) : user ? (
              <div className="flex items-center gap-3">
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
                  <span className="text-sm text-[#111111] max-w-[120px] truncate">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </div>
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
