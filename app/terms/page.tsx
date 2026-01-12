'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
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

        <h1 className="text-3xl font-bold text-[#111111] mb-8">서비스 이용약관</h1>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제1조 (목적)</h2>
            <p className="text-[#6b7280]">
              본 약관은 BlogBooster(이하 &quot;회사&quot;)가 제공하는 블로그 자동화 서비스(이하 &quot;서비스&quot;)의 이용조건 및 절차,
              회사와 이용자의 권리, 의무, 책임사항 등을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제2조 (정의)</h2>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-2">
              <li>&quot;서비스&quot;란 회사가 제공하는 블로그 자동화, 키워드 분석, 이미지 생성, 비포애프터 이미지 생성 등의 온라인 서비스를 의미합니다.</li>
              <li>&quot;이용자&quot;란 회사의 서비스에 접속하여 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
              <li>&quot;회원&quot;이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며, 회사가 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>본 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.</li>
              <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.</li>
              <li>약관이 변경되는 경우 회사는 변경 약관의 적용일자 7일 전부터 서비스 내 공지합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제4조 (서비스의 제공)</h2>
            <p className="text-[#6b7280] mb-2">회사는 다음과 같은 서비스를 제공합니다.</p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>황금키워드추출기: 블로그 키워드 분석 및 추천 서비스</li>
              <li>BLOG-AUTO: AI 기반 블로그 콘텐츠 자동 생성 서비스</li>
              <li>이미지 생성기: AI 기반 이미지 생성 서비스</li>
              <li>비포애프터 생성기: 비포애프터 비교 이미지 생성 서비스</li>
              <li>기타 회사가 추가 개발하거나 다른 회사와의 제휴계약 등을 통해 제공하는 일체의 서비스</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제5조 (서비스 이용)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>서비스는 회사의 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴, 1일 24시간 운영을 원칙으로 합니다.</li>
              <li>회사는 시스템 정기점검, 증설 및 교체를 위해 회사가 정한 날이나 시간에 서비스를 일시 중단할 수 있으며, 예정되어 있는 작업으로 인한 서비스 일시 중단은 서비스를 통해 사전에 공지합니다.</li>
              <li>일부 서비스는 무료로 제공되며, 일부 서비스는 유료 결제가 필요합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제6조 (이용자의 의무)</h2>
            <p className="text-[#6b7280] mb-2">이용자는 다음 행위를 하여서는 안 됩니다.</p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>신청 또는 변경 시 허위내용의 등록</li>
              <li>타인의 정보 도용</li>
              <li>회사가 게시한 정보의 변경</li>
              <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
              <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
              <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
              <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
              <li>서비스를 이용하여 생성된 콘텐츠의 저작권 침해 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제7조 (저작권)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>서비스 내 회사가 제공하는 콘텐츠에 대한 저작권 및 지적재산권은 회사에 귀속됩니다.</li>
              <li>이용자가 서비스를 이용하여 생성한 콘텐츠의 저작권은 이용자에게 귀속됩니다.</li>
              <li>이용자는 서비스를 이용하여 얻은 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제8조 (결제 및 환불)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>유료 서비스 이용 시 회사가 정한 요금을 결제하여야 합니다.</li>
              <li>결제는 신용카드, 계좌이체 등 회사가 정한 방법으로 진행됩니다.</li>
              <li>환불은 관련 법령 및 회사의 환불 정책에 따릅니다.</li>
              <li>서비스 이용 개시 후 7일 이내에 환불 요청 시 전액 환불됩니다. (단, 서비스를 이용한 경우 이용 부분 제외)</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제9조 (면책조항)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
              <li>회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
              <li>회사는 이용자가 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않습니다.</li>
              <li>AI가 생성한 콘텐츠의 정확성, 적법성에 대해 회사는 보증하지 않으며, 이용자가 이를 사용함으로써 발생하는 문제에 대해 책임지지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제10조 (분쟁해결)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>회사와 이용자 간에 발생한 분쟁에 관한 소송은 대한민국 법을 준거법으로 합니다.</li>
              <li>회사와 이용자 간에 발생한 분쟁에 관한 소송은 회사 소재지 관할 법원을 전속관할로 합니다.</li>
            </ol>
          </section>

          <div className="pt-8 border-t border-[#eeeeee]">
            <p className="text-sm text-[#9ca3af]">
              본 이용약관은 2024년 1월 1일부터 시행됩니다.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
