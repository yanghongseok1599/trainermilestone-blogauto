'use client';

import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-lg text-center">
        {/* 404 숫자 */}
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-[#f72c5b]">404</h1>
        </div>

        {/* 메시지 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#111111] mb-4">
            페이지를 찾을 수 없습니다
          </h2>
          <p className="text-[#6b7280]">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
            <br />
            주소를 다시 확인해 주세요.
          </p>
        </div>

        {/* 버튼들 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button className="w-full sm:w-auto bg-[#f72c5b] hover:bg-[#e0264f] text-white">
              <Home className="w-4 h-4 mr-2" />
              홈으로 가기
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto border-[#eeeeee]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            이전 페이지
          </Button>
        </div>

        {/* 추천 링크 */}
        <div className="mt-12 p-6 bg-[#f5f5f5] rounded-xl">
          <p className="text-sm text-[#6b7280] mb-4">찾고 계신 서비스가 있으신가요?</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/keyword-extractor">
              <Button variant="ghost" size="sm" className="text-[#6b7280] hover:text-[#f72c5b]">
                <Search className="w-3 h-3 mr-1" />
                황금키워드추출기
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-[#6b7280] hover:text-[#f72c5b]">
                BLOG-AUTO
              </Button>
            </Link>
            <Link href="/image-generator">
              <Button variant="ghost" size="sm" className="text-[#6b7280] hover:text-[#f72c5b]">
                이미지 생성기
              </Button>
            </Link>
            <Link href="/before-after">
              <Button variant="ghost" size="sm" className="text-[#6b7280] hover:text-[#f72c5b]">
                비포애프터
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
