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
          <p className="text-[#6b7280]">
            BlogBooster(이하 &quot;회사&quot;)는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수하고 있습니다.
            회사는 개인정보처리방침을 통하여 이용자가 제공하는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며,
            개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">1. 수집하는 개인정보 항목</h2>
            <p className="text-[#6b7280] mb-2">회사는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.</p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>필수항목: 이메일 주소, 비밀번호, 이름(닉네임)</li>
              <li>소셜 로그인 시: 소셜 계정 식별자, 프로필 사진(선택)</li>
              <li>자동 수집 항목: 접속 IP, 쿠키, 서비스 이용 기록, 접속 로그</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">2. 개인정보의 수집 및 이용 목적</h2>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>회원 가입 및 관리: 회원제 서비스 이용에 따른 본인확인, 개인식별</li>
              <li>서비스 제공: 블로그 자동화, 키워드 분석, 이미지 생성 등 서비스 제공</li>
              <li>고객 지원: 문의사항 처리, 공지사항 전달</li>
              <li>서비스 개선: 서비스 이용 통계, 맞춤 서비스 제공</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">3. 개인정보의 보유 및 이용 기간</h2>
            <p className="text-[#6b7280] mb-2">
              회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체없이 파기합니다.
              단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.
            </p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
              <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
              <li>접속 로그: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">4. 개인정보의 파기 절차 및 방법</h2>
            <p className="text-[#6b7280]">
              회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체없이 파기합니다.
              파기절차 및 방법은 다음과 같습니다.
            </p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1 mt-2">
              <li>파기절차: 이용자가 서비스 이용 등을 위해 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라 일정 기간 저장된 후 파기됩니다.</li>
              <li>파기방법: 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">5. 개인정보의 제3자 제공</h2>
            <p className="text-[#6b7280]">
              회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.
            </p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1 mt-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">6. 이용자의 권리와 행사 방법</h2>
            <p className="text-[#6b7280]">
              이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며,
              회원 탈퇴를 통해 개인정보 이용에 대한 동의를 철회할 수 있습니다.
              개인정보 조회, 수정은 &quot;마이페이지&quot;에서 직접 하실 수 있으며,
              회원 탈퇴는 고객센터를 통해 요청하실 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">7. 개인정보 보호책임자</h2>
            <p className="text-[#6b7280]">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고,
              개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="mt-4 p-4 bg-[#f5f5f5] rounded-lg">
              <p className="text-[#111111] font-medium">개인정보 보호책임자</p>
              <p className="text-[#6b7280] mt-1">이메일: support@blogbooster.kr</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">8. 개인정보처리방침 변경</h2>
            <p className="text-[#6b7280]">
              이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는
              변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          <div className="pt-8 border-t border-[#eeeeee]">
            <p className="text-sm text-[#9ca3af]">
              본 개인정보처리방침은 2024년 1월 1일부터 시행됩니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
