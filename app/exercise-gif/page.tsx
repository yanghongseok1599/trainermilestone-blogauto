'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Dumbbell, Sparkles } from 'lucide-react';

export default function ExerciseGifPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f5f5f5] py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111111] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </Link>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#34d399] flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#111111] mb-4">
            운동 GIF 생성기
          </h1>
          <p className="text-[#6b7280] text-lg">
            운동 동작을 GIF로 만들어 블로그에 활용하세요
          </p>
        </div>

        {/* Coming Soon Card */}
        <Card className="border-2 border-dashed border-[#e5e5e5] bg-white/50">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-[#10b981]/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-[#10b981]" />
            </div>
            <CardTitle className="text-2xl text-[#111111]">준비 중입니다</CardTitle>
            <CardDescription className="text-base">
              운동 GIF 생성 기능이 곧 출시됩니다
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="bg-[#f5f5f5] rounded-xl p-6">
              <h3 className="font-semibold text-[#111111] mb-3">예정된 기능</h3>
              <ul className="text-sm text-[#6b7280] space-y-2">
                <li>- 운동 영상을 GIF로 변환</li>
                <li>- 프레임 속도 및 크기 조절</li>
                <li>- 반복 재생 설정</li>
                <li>- 운동 이름 자동 오버레이</li>
                <li>- 블로그 삽입용 코드 생성</li>
              </ul>
            </div>
            <Link href="/">
              <Button className="bg-[#10b981] hover:bg-[#059669] text-white">
                블로그 자동화로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
