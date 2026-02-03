'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getUserSubscription } from '@/lib/payment-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Check, Sparkles, Zap, Crown, Building2, ArrowLeft, Loader2, Calendar, Users, Brain, ImagePlus } from 'lucide-react';
import { PLANS, SubscriptionPlan, UserSubscription } from '@/types/payment';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { generateOrderId, generatePaymentId, createPayment } from '@/lib/payment-service';

// 요금 페이지에 표시할 플랜 (BETA 제외)
const DISPLAY_PLANS: SubscriptionPlan[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS'];

const planIcons: Record<SubscriptionPlan, React.ReactNode> = {
  FREE: <Sparkles className="w-6 h-6" />,
  STARTER: <Zap className="w-6 h-6" />,
  PRO: <Crown className="w-6 h-6" />,
  BUSINESS: <Building2 className="w-6 h-6" />,
  BETA: <Crown className="w-6 h-6" />,
};

const planColors: Record<SubscriptionPlan, string> = {
  FREE: 'text-[#6b7280]',
  STARTER: 'text-[#111111]',
  PRO: 'text-[#f72c5b]',
  BUSINESS: 'text-[#111111]',
  BETA: 'text-[#f72c5b]',
};

const planBgColors: Record<SubscriptionPlan, string> = {
  FREE: 'bg-[#6b7280]/10',
  STARTER: 'bg-[#111111]/10',
  PRO: 'bg-[#f72c5b]/10',
  BUSINESS: 'bg-[#111111]/10',
  BETA: 'bg-[#f72c5b]/10',
};

// 추가 기능 하이라이트
const planHighlights: Record<SubscriptionPlan, { icon: React.ReactNode; text: string }[]> = {
  FREE: [],
  STARTER: [
    { icon: <Brain className="w-4 h-4" />, text: '비포애프터 에디터' },
  ],
  PRO: [
    { icon: <Calendar className="w-4 h-4" />, text: '예약 발행' },
    { icon: <Users className="w-4 h-4" />, text: '팀 협업 1명' },
    { icon: <Brain className="w-4 h-4" />, text: 'RAG 학습' },
  ],
  BUSINESS: [
    { icon: <Users className="w-4 h-4" />, text: '팀 협업 3명' },
    { icon: <Crown className="w-4 h-4" />, text: '전용 튜닝' },
  ],
  BETA: [
    { icon: <Calendar className="w-4 h-4" />, text: '예약 발행' },
    { icon: <Brain className="w-4 h-4" />, text: 'RAG 학습' },
  ],
};

export default function PricingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<SubscriptionPlan | null>(null);

  useEffect(() => {
    const loadSubscription = async () => {
      if (user) {
        try {
          const sub = await getUserSubscription(user.uid);
          setSubscription(sub);
        } catch (error) {
          console.error('Failed to load subscription:', error);
        }
      }
      setIsLoading(false);
    };

    if (!authLoading) {
      loadSubscription();
    }
  }, [user, authLoading]);

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      router.push('/login');
      return;
    }

    if (plan === 'FREE') {
      toast.info('무료 플랜은 기본으로 제공됩니다');
      return;
    }

    if (subscription?.currentPlan === plan) {
      toast.info('현재 사용 중인 플랜입니다');
      return;
    }

    setProcessingPlan(plan);

    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        throw new Error('토스 클라이언트 키가 설정되지 않았습니다');
      }

      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: user.uid });

      const planInfo = PLANS[plan];
      const orderId = generateOrderId();
      const paymentId = generatePaymentId();

      // Firestore에 결제 정보 미리 저장 (PENDING 상태)
      await createPayment({
        id: paymentId,
        oderId: orderId,
        userId: user.uid,
        amount: planInfo.price,
        status: 'PENDING',
        plan: plan,
        planName: planInfo.name,
      });

      // 토스 결제창 열기
      await payment.requestPayment({
        method: 'CARD',
        amount: {
          currency: 'KRW',
          value: planInfo.price,
        },
        orderId: orderId,
        orderName: `트레이너 마일스톤 블로그 부스터 ${planInfo.name} 플랜 (월간)`,
        customerName: user.displayName || '고객',
        customerEmail: user.email || undefined,
        successUrl: `${window.location.origin}/payment/success?paymentId=${paymentId}`,
        failUrl: `${window.location.origin}/payment/fail?paymentId=${paymentId}`,
      });

    } catch (error: unknown) {
      // 사용자가 결제를 취소한 경우 무시
      const err = error as { code?: string; message?: string };
      if (err.code === 'USER_CANCEL' || err.code === 'PAYMENT_CANCELED' ||
          err.message?.includes('취소')) {
        // 사용자 취소는 에러로 표시하지 않음
        return;
      }
      console.error('Payment error:', error);
      const errorMessage = err.message || '결제 처리 중 오류가 발생했습니다';
      toast.error(errorMessage);
    } finally {
      setProcessingPlan(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f72c5b]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f5f5f5] py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111111] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </Link>
          <h1 className="text-4xl font-bold text-[#111111] mb-4">
            요금제 선택
          </h1>
          <p className="text-[#6b7280] text-lg">
            비즈니스에 맞는 플랜을 선택하세요
          </p>
          {subscription && (
            <p className="mt-4 text-sm text-[#03C75A] bg-[#03C75A]/10 inline-block px-4 py-2 rounded-full">
              현재 플랜: {PLANS[subscription.currentPlan].name}
            </p>
          )}
        </div>

        {/* Comparison Table for Desktop */}
        <div className="hidden lg:block mb-12 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-4 text-left border-b border-[#eeeeee]">기능</th>
                {DISPLAY_PLANS.map((planKey) => (
                  <th key={planKey} className={`p-4 text-center border-b border-[#eeeeee] ${planKey === 'PRO' ? 'bg-[#f72c5b]/5' : ''}`}>
                    <div className={`font-bold ${planColors[planKey]}`}>{PLANS[planKey].name}</div>
                    <div className="text-xl font-bold text-[#111111] mt-1">
                      {PLANS[planKey].price === 0 ? '무료' : `₩${PLANS[planKey].price.toLocaleString()}`}
                      {PLANS[planKey].price > 0 && <span className="text-sm text-[#6b7280]">/월</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-4 border-b border-[#eeeeee] text-[#4b5563]">월 블로그 생성</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">3회</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">20회</td>
                <td className="p-4 text-center border-b border-[#eeeeee] bg-[#f72c5b]/5 font-semibold">100회</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">무제한</td>
              </tr>
              <tr>
                <td className="p-4 border-b border-[#eeeeee] text-[#4b5563]">월 토큰 제한</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">50K</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">300K</td>
                <td className="p-4 text-center border-b border-[#eeeeee] bg-[#f72c5b]/5 font-semibold">1M</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">3M</td>
              </tr>
              <tr>
                <td className="p-4 border-b border-[#eeeeee] text-[#4b5563]">프리셋 저장</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">3개</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">10개</td>
                <td className="p-4 text-center border-b border-[#eeeeee] bg-[#f72c5b]/5">무제한</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">무제한</td>
              </tr>
              <tr>
                <td className="p-4 border-b border-[#eeeeee] text-[#4b5563]">AI 이미지 생성</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">-</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">
                  <div>50장/월</div>
                  <div className="text-xs text-[#6b7280]">유료 5장/일</div>
                </td>
                <td className="p-4 text-center border-b border-[#eeeeee] bg-[#f72c5b]/5 font-semibold">
                  <div>200장/월</div>
                  <div className="text-xs text-[#6b7280] font-normal">유료 5장 + 무료 25장/일</div>
                </td>
                <td className="p-4 text-center border-b border-[#eeeeee]">
                  <div>500장/월</div>
                  <div className="text-xs text-[#6b7280]">유료 10장 + 무료 40장/일</div>
                </td>
              </tr>
              <tr>
                <td className="p-4 border-b border-[#eeeeee] text-[#4b5563]">비포애프터 에디터</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">-</td>
                <td className="p-4 text-center border-b border-[#eeeeee]"><Check className="w-5 h-5 text-[#03C75A] mx-auto" /></td>
                <td className="p-4 text-center border-b border-[#eeeeee] bg-[#f72c5b]/5"><Check className="w-5 h-5 text-[#03C75A] mx-auto" /></td>
                <td className="p-4 text-center border-b border-[#eeeeee]"><Check className="w-5 h-5 text-[#03C75A] mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-4 border-b border-[#eeeeee] text-[#4b5563]">RAG 학습 기능</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">-</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">-</td>
                <td className="p-4 text-center border-b border-[#eeeeee] bg-[#f72c5b]/5"><Check className="w-5 h-5 text-[#03C75A] mx-auto" /></td>
                <td className="p-4 text-center border-b border-[#eeeeee]"><Check className="w-5 h-5 text-[#03C75A] mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-4 border-b border-[#eeeeee] text-[#4b5563]">예약 발행</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">-</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">-</td>
                <td className="p-4 text-center border-b border-[#eeeeee] bg-[#f72c5b]/5"><Check className="w-5 h-5 text-[#03C75A] mx-auto" /></td>
                <td className="p-4 text-center border-b border-[#eeeeee]"><Check className="w-5 h-5 text-[#03C75A] mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-4 border-b border-[#eeeeee] text-[#4b5563]">팀 협업</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">1명</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">1명</td>
                <td className="p-4 text-center border-b border-[#eeeeee] bg-[#f72c5b]/5 font-semibold">1명</td>
                <td className="p-4 text-center border-b border-[#eeeeee] font-semibold">3명</td>
              </tr>
              <tr>
                <td className="p-4 border-b border-[#eeeeee] text-[#4b5563]">커스텀 프롬프트</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">-</td>
                <td className="p-4 text-center border-b border-[#eeeeee]">-</td>
                <td className="p-4 text-center border-b border-[#eeeeee] bg-[#f72c5b]/5"><Check className="w-5 h-5 text-[#03C75A] mx-auto" /></td>
                <td className="p-4 text-center border-b border-[#eeeeee]"><Check className="w-5 h-5 text-[#03C75A] mx-auto" /></td>
              </tr>
              <tr>
                <td className="p-4 text-[#4b5563]"></td>
                {DISPLAY_PLANS.map((planKey) => {
                  const isCurrentPlan = subscription?.currentPlan === planKey;
                  return (
                    <td key={planKey} className={`p-4 text-center ${planKey === 'PRO' ? 'bg-[#f72c5b]/5' : ''}`}>
                      <Button
                        className={`w-full h-11 font-semibold ${
                          isCurrentPlan
                            ? 'bg-[#03C75A] hover:bg-[#059669]'
                            : planKey === 'PRO'
                            ? 'bg-[#f72c5b] hover:bg-[#e0264f]'
                            : planKey === 'BUSINESS'
                            ? 'bg-[#111111] hover:bg-[#333333]'
                            : 'bg-[#111111] hover:bg-[#333333]'
                        } text-white`}
                        onClick={() => handleSelectPlan(planKey)}
                        disabled={isCurrentPlan || processingPlan === planKey}
                      >
                        {processingPlan === planKey ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {isCurrentPlan
                          ? '사용 중'
                          : planKey === 'FREE'
                          ? '무료 시작'
                          : '선택하기'}
                      </Button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Plans Grid for Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-6">
          {DISPLAY_PLANS.map((planKey) => {
            const plan = PLANS[planKey];
            const isCurrentPlan = subscription?.currentPlan === planKey;
            const isPopular = planKey === 'PRO';
            const highlights = planHighlights[planKey];

            return (
              <Card
                key={planKey}
                className={`relative border-2 transition-all duration-300 ${
                  isCurrentPlan
                    ? 'border-[#03C75A] shadow-lg'
                    : isPopular
                    ? 'border-[#f72c5b] shadow-xl'
                    : 'border-[#eeeeee] hover:border-[#d1d5db]'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#f72c5b] text-white text-xs font-bold px-3 py-1 rounded-full">
                      인기
                    </span>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="bg-[#03C75A] text-white text-xs font-bold px-3 py-1 rounded-full">
                      현재 플랜
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`w-12 h-12 rounded-xl ${planBgColors[planKey]} ${planColors[planKey]} flex items-center justify-center mx-auto mb-3`}>
                    {planIcons[planKey]}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-[#111111]">
                      {plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-[#6b7280] text-sm">/월</span>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* 하이라이트 기능 */}
                  {highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-3 border-b border-[#eeeeee]">
                      {highlights.map((h, idx) => (
                        <span key={idx} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${planBgColors[planKey]} ${planColors[planKey]}`}>
                          {h.icon}
                          {h.text}
                        </span>
                      ))}
                    </div>
                  )}

                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${planColors[planKey]}`} />
                        <span className="text-[#4b5563]">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full h-11 font-semibold ${
                      isCurrentPlan
                        ? 'bg-[#03C75A] hover:bg-[#059669]'
                        : planKey === 'PRO'
                        ? 'bg-[#f72c5b] hover:bg-[#e0264f]'
                        : planKey === 'BUSINESS'
                        ? 'bg-[#111111] hover:bg-[#333333]'
                        : 'bg-[#111111] hover:bg-[#333333]'
                    } text-white`}
                    onClick={() => handleSelectPlan(planKey)}
                    disabled={isCurrentPlan || processingPlan === planKey}
                  >
                    {processingPlan === planKey ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {isCurrentPlan
                      ? '사용 중'
                      : planKey === 'FREE'
                      ? '무료 시작'
                      : '선택하기'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Raon Pick 비교 섹션 */}
        <div className="mt-16 bg-[#111111] rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-6 text-center">경쟁사 대비 블로그 부스터의 차별점</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#f72c5b] rounded-xl flex items-center justify-center mx-auto mb-3">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">RAG 기반 SEO 최적화</h3>
              <p className="text-sm text-[#9ca3af]">상위노출 블로그 패턴을 자동 학습하여 SEO 최적화된 콘텐츠 생성</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#f72c5b] rounded-xl flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">검색 의도 분석</h3>
              <p className="text-sm text-[#9ca3af]">5가지 검색 의도 × 5가지 글쓰기 스타일로 전략적 콘텐츠 생성</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#f72c5b] rounded-xl flex items-center justify-center mx-auto mb-3">
                <ImagePlus className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">AI 이미지 생성</h3>
              <p className="text-sm text-[#9ca3af]">DALL-E 3, Imagen 3 등 최신 AI 모델로 블로그 맞춤 이미지 자동 생성</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#f72c5b] rounded-xl flex items-center justify-center mx-auto mb-3">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">비포애프터 전문 에디터</h3>
              <p className="text-sm text-[#9ca3af]">배경 자동 제거, 5가지 레이아웃, 워터마크 등 전문 편집 기능</p>
            </div>
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-[#6b7280] text-sm">
            결제 관련 문의: info@trainer_milestone.com
          </p>
        </div>
      </div>
    </div>
  );
}
