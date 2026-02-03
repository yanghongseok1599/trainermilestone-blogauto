'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* 뒤로가기 */}
        <Link href="/">
          <Button variant="ghost" className="mb-6 text-[#6b7280] hover:text-[#111111]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            홈으로
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-[#111111] mb-8">개인정보처리방침</h1>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">1. 수집하는 개인정보 항목</h2>
            <p className="text-[#6b7280] mb-2">회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li><strong>필수항목:</strong> 이메일 주소, 비밀번호, 이름(닉네임)</li>
              <li><strong>선택항목:</strong> 프로필 이미지, 연락처, 소속 센터명</li>
              <li><strong>자동수집:</strong> IP 주소, 쿠키, 서비스 이용기록, 접속 로그</li>
              <li><strong>소셜 로그인 시:</strong> 소셜 계정 식별자, 이메일, 프로필 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">2. 개인정보의 수집 및 이용 목적</h2>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>회원 가입 및 관리: 회원제 서비스 제공, 본인 확인</li>
              <li>서비스 제공: AI 콘텐츠 생성, 마케팅 도구 제공</li>
              <li>결제 처리: 유료 서비스 결제 및 환불</li>
              <li>고객 지원: 문의 응대, 공지사항 전달</li>
              <li>서비스 개선: 이용 통계 분석, 서비스 품질 향상</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">3. 개인정보의 보유 및 이용 기간</h2>
            <p className="text-[#6b7280] mb-2">
              회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
            </p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>계약 또는 청약철회 기록: 5년 (전자상거래법)</li>
              <li>대금결제 및 재화 공급 기록: 5년 (전자상거래법)</li>
              <li>소비자 불만 또는 분쟁 처리 기록: 3년 (전자상거래법)</li>
              <li>로그인 기록: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">4. 개인정보의 제3자 제공</h2>
            <p className="text-[#6b7280] mb-2">
              회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.
            </p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령에 의거하거나, 수사 목적으로 법령에 정해진 절차에 따라 요청이 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">5. 개인정보의 처리 위탁</h2>
            <p className="text-[#6b7280] mb-2">회사는 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁합니다.</p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm text-[#6b7280] border-collapse">
                <thead>
                  <tr className="border-b border-[#eeeeee]">
                    <th className="text-left py-2 pr-4 font-semibold text-[#111111]">수탁업체</th>
                    <th className="text-left py-2 font-semibold text-[#111111]">위탁 업무</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#eeeeee]">
                    <td className="py-2 pr-4">토스페이먼츠</td>
                    <td className="py-2">결제 처리</td>
                  </tr>
                  <tr className="border-b border-[#eeeeee]">
                    <td className="py-2 pr-4">Firebase (Google)</td>
                    <td className="py-2">사용자 인증</td>
                  </tr>
                  <tr className="border-b border-[#eeeeee]">
                    <td className="py-2 pr-4">Supabase</td>
                    <td className="py-2">데이터 저장</td>
                  </tr>
                  <tr className="border-b border-[#eeeeee]">
                    <td className="py-2 pr-4">Vercel</td>
                    <td className="py-2">웹 호스팅</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">6. 이용자의 권리와 행사 방법</h2>
            <p className="text-[#6b7280] mb-2">이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정 및 삭제 요구</li>
              <li>개인정보 처리 정지 요구</li>
              <li>회원 탈퇴</li>
            </ul>
            <p className="text-[#6b7280] mt-2">
              위 권리 행사는 서비스 내 설정 또는 이메일(info@trainer_milestone.com)을 통해 가능합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">7. 개인정보의 안전성 확보 조치</h2>
            <p className="text-[#6b7280] mb-2">회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>개인정보의 암호화</li>
              <li>해킹 등에 대비한 기술적 대책</li>
              <li>개인정보 접근 제한</li>
              <li>접속기록의 보관 및 위변조 방지</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">8. 쿠키의 사용</h2>
            <p className="text-[#6b7280]">
              회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 쿠키(cookie)를 사용합니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 서비스 이용에 제한이 있을 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">9. 개인정보 보호책임자</h2>
            <div className="p-4 bg-[#f5f5f5] rounded-lg">
              <p className="text-[#111111] font-medium">개인정보 보호책임자</p>
              <p className="text-[#6b7280] mt-1">담당부서: 고객지원팀</p>
              <p className="text-[#6b7280]">이메일: info@trainer_milestone.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">10. 개인정보처리방침 변경</h2>
            <p className="text-[#6b7280]">
              이 개인정보처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용이 추가, 삭제 및 수정될 수 있으며, 변경 시 최소 7일 전에 공지합니다.
            </p>
          </section>

          <div className="pt-8 border-t border-[#eeeeee]">
            <p className="text-sm text-[#9ca3af]">
              공고일자: 2025년 1월 1일 | 시행일자: 2025년 1월 1일
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
