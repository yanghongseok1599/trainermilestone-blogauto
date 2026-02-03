'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#eeeeee] bg-white mt-auto">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* 회사 정보 */}
          <div className="text-center md:text-left">
            <p className="text-sm font-medium text-[#111111]">트레이너 마일스톤 블로그 부스터</p>
            <p className="text-xs text-[#9ca3af] mt-1">
              AI 기반 피트니스 블로그 자동화 시스템
            </p>
          </div>

          {/* 링크 */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/terms" className="text-[#6b7280] hover:text-[#111111] transition-colors">
              이용약관
            </Link>
            <Link href="/privacy" className="text-[#6b7280] hover:text-[#111111] transition-colors">
              개인정보처리방침
            </Link>
            <Link href="/usage-policy" className="text-[#6b7280] hover:text-[#111111] transition-colors">
              이용정책
            </Link>
            <Link href="/pricing" className="text-[#6b7280] hover:text-[#111111] transition-colors">
              요금안내
            </Link>
          </div>
        </div>

        {/* 사업자 정보 */}
        <div className="mt-6 pt-6 border-t border-[#eeeeee] text-center">
          <p className="text-[11px] text-[#b0b0b0] leading-relaxed">
            브랜드 : 트레이너 마일스톤 ㅣ 상호 : 헤븐데일리 ㅣ 대표 : 김지민 ㅣ 사업자등록번호 : 506-54-000971 ㅣ 소재지 : 강원특별자치도 동해시 해안로 449 ㅣ 통신판매신고번호 : 제2026-강원동해-0022호 ㅣ 개인정보관리책임자 : 김지민 ㅣ 문의 : info@trainer_milestone.com
          </p>
          <p className="text-xs text-[#9ca3af] mt-2">
            © {currentYear} 트레이너 마일스톤. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
