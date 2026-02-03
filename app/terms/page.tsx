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
              이 약관은 회사가 제공하는 트레이너 마일스톤 서비스(이하 &quot;서비스&quot;)의 이용조건 및 절차, 회사와 이용자의 권리, 의무, 책임사항과 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제2조 (정의)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>&quot;서비스&quot;란 회사가 제공하는 AI 기반 피트니스 마케팅 도구를 의미합니다.</li>
              <li>&quot;이용자&quot;란 본 약관에 따라 서비스를 이용하는 회원을 의미합니다.</li>
              <li>&quot;회원&quot;이란 회사와 서비스 이용계약을 체결한 자를 의미합니다.</li>
              <li>&quot;콘텐츠&quot;란 서비스를 통해 생성된 글, 이미지 등 모든 결과물을 의미합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.</li>
              <li>약관이 변경되는 경우 회사는 변경 내용을 시행일 7일 전부터 공지합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제4조 (회원가입)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입하고 본 약관에 동의함으로써 회원가입을 신청합니다.</li>
              <li>회사는 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.</li>
            </ol>
            <ul className="list-disc pl-10 text-[#6b7280] space-y-1 mt-2">
              <li>이전에 회원자격을 상실한 적이 있는 경우</li>
              <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
              <li>기타 서비스 운영에 현저히 지장이 있다고 판단되는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제5조 (서비스의 제공)</h2>
            <p className="text-[#6b7280] mb-2">회사는 다음과 같은 서비스를 제공합니다.</p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>AI 블로그 글쓰기 도구</li>
              <li>카드뉴스 생성 도구</li>
              <li>비포애프터 이미지 생성</li>
              <li>황금 키워드 분석</li>
              <li>블로그 카르텔 품앗이 서비스</li>
              <li>기타 회사가 추가 개발하거나 제휴를 통해 제공하는 서비스</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제6조 (서비스 이용료)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>서비스는 무료 및 유료로 제공되며, 유료 서비스의 이용요금은 서비스 내 가격표에 게시됩니다.</li>
              <li>유료 서비스의 제공기간은 월간 구독(결제일로부터 1개월)을 기본으로 하며, 별도의 해지 요청이 없는 한 자동 갱신됩니다.</li>
              <li>회사는 유료 서비스 이용요금을 변경할 수 있으며, 변경 시 최소 7일 전에 공지합니다.</li>
              <li>이용자가 결제한 이용요금에 대한 환불은 회사의 환불 정책에 따릅니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제7조 (환불 정책)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>결제 후 7일 이내에 서비스를 이용하지 않은 경우 전액 환불이 가능합니다.</li>
              <li>서비스 이용 후에는 이용 기간에 비례하여 환불 금액이 산정됩니다.</li>
              <li>무료 체험 기간 중에는 언제든지 해지가 가능하며, 요금이 청구되지 않습니다.</li>
              <li>환불 요청은 고객센터(info@trainer_milestone.com)를 통해 가능합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제8조 (이용자의 의무)</h2>
            <p className="text-[#6b7280] mb-2">이용자는 다음 행위를 하여서는 안 됩니다.</p>
            <ul className="list-disc pl-6 text-[#6b7280] space-y-1">
              <li>타인의 정보 도용</li>
              <li>회사가 게시한 정보의 무단 변경</li>
              <li>회사가 허용하지 않은 정보의 수집, 저장, 공개</li>
              <li>회사 및 제3자의 저작권 등 지적재산권 침해</li>
              <li>회사 및 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
              <li>서비스를 이용하여 불법적인 콘텐츠를 생성하는 행위</li>
              <li>서비스를 이용하여 허위 정보를 유포하는 행위</li>
              <li>기타 불법적이거나 부당한 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제9조 (콘텐츠의 저작권)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>서비스를 통해 이용자가 생성한 콘텐츠의 저작권은 이용자에게 귀속됩니다.</li>
              <li>이용자는 생성한 콘텐츠를 자유롭게 사용, 수정, 배포할 수 있습니다.</li>
              <li>회사는 서비스 개선 목적으로 이용자의 콘텐츠를 익명화하여 분석할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제10조 (서비스 이용 제한)</h2>
            <p className="text-[#6b7280]">
              회사는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 서비스 이용을 제한하거나 회원 자격을 정지 또는 상실시킬 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제11조 (회사의 의무)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>회사는 관련 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않습니다.</li>
              <li>회사는 지속적이고 안정적인 서비스 제공을 위해 노력합니다.</li>
              <li>회사는 이용자로부터 제기되는 의견이나 불만이 정당하다고 인정할 경우 적절한 절차를 거쳐 처리합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제12조 (면책조항)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</li>
              <li>회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
              <li>AI가 생성한 콘텐츠의 정확성, 완전성에 대해 회사는 보증하지 않으며, 이용자는 생성된 콘텐츠를 검토 후 사용해야 합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제13조 (분쟁해결)</h2>
            <ol className="list-decimal pl-6 text-[#6b7280] space-y-2">
              <li>회사와 이용자 간에 발생한 분쟁에 관한 소송은 대한민국 법원을 관할 법원으로 합니다.</li>
              <li>회사와 이용자 간에 제기된 소송에는 대한민국 법을 적용합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#111111] mb-4">제14조 (기타)</h2>
            <p className="text-[#6b7280]">
              본 약관에서 정하지 아니한 사항과 본 약관의 해석에 관하여는 관계 법령 및 상관례에 따릅니다.
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
