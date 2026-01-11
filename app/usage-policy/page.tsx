'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function UsagePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f5f5f5] py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/keyword-extractor"
            className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111111] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            황금키워드추출기로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold text-[#111111] mb-2">서비스 이용 정책</h1>
          <p className="text-[#6b7280]">
            BlogBooster 서비스의 안정적인 운영을 위한 이용 정책입니다
          </p>
        </div>

        {/* 무료 사용자 제한 */}
        <Card className="mb-6 border-[#eeeeee]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-500" />
              무료 사용자 제한 정책
            </CardTitle>
            <CardDescription>
              서비스 안정성을 위해 무료 사용자에게 다음과 같은 제한을 두고 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">황금키워드추출기</h3>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>일일 검색 제한:</strong> 1일 3회</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>연관 키워드:</strong> 최대 50개</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>제한 초기화:</strong> 매일 자정 (00:00 KST)</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">BLOG-AUTO 생성기</h3>
                <ul className="space-y-2 text-sm text-green-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>AI 글 생성:</strong> 무제한</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>이미지 업로드:</strong> 무제한</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>API 키 필요:</strong> Gemini 또는 OpenAI API 키</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">AI 이미지 생성기</h3>
                <ul className="space-y-2 text-sm text-purple-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>이미지 생성:</strong> 무제한</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>API 키 필요:</strong> OpenAI 또는 Gemini API 키</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">비포애프터 생성기</h3>
                <ul className="space-y-2 text-sm text-orange-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>사용 횟수:</strong> 무제한</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>레이아웃:</strong> 모든 기능 이용 가능</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 프리미엄 플랜 */}
        <Card className="mb-6 border-[#f72c5b]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#f72c5b]">
              프리미엄 플랜 (준비중)
            </CardTitle>
            <CardDescription>
              무제한으로 모든 기능을 사용하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-[#f72c5b]/10 to-[#ff6b6b]/10 rounded-lg">
                  <h3 className="font-semibold text-[#111111] mb-2">황금키워드추출기 Pro</h3>
                  <ul className="space-y-1 text-sm text-[#6b7280]">
                    <li>• 무제한 검색</li>
                    <li>• 고급 필터링</li>
                    <li>• 검색량 데이터 제공</li>
                    <li>• 경쟁 분석 리포트</li>
                  </ul>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                  <h3 className="font-semibold text-[#111111] mb-2">통합 플랜</h3>
                  <ul className="space-y-1 text-sm text-[#6b7280]">
                    <li>• 모든 기능 무제한</li>
                    <li>• 우선 지원</li>
                    <li>• API 키 공유</li>
                    <li>• 팀 협업 기능</li>
                  </ul>
                </div>
              </div>

              <div className="text-center pt-4">
                <Link href="/pricing">
                  <Button className="bg-[#f72c5b] hover:bg-[#e0264f] text-white">
                    요금제 살펴보기
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 공정 이용 정책 */}
        <Card className="border-[#eeeeee]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              공정 이용 정책
            </CardTitle>
            <CardDescription>
              모든 사용자가 안정적으로 서비스를 이용할 수 있도록 다음 사항을 준수해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-[#6b7280]">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[#6b7280] rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  <strong>자동화 금지:</strong> 봇이나 자동화 도구를 사용한 대량 호출은 금지됩니다
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[#6b7280] rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  <strong>계정 공유 금지:</strong> 계정은 개인 사용 목적으로만 사용 가능합니다
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[#6b7280] rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  <strong>서비스 남용 금지:</strong> 과도한 요청이나 시스템 부하를 유발하는 행위는 제한될 수 있습니다
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-[#6b7280] rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  <strong>정책 위반 시:</strong> 경고 없이 서비스 이용이 제한될 수 있습니다
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-[#9ca3af]">
          <p>이 정책은 서비스 개선을 위해 사전 공지 없이 변경될 수 있습니다</p>
          <p className="mt-2">문의: trainermilestone@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
