'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getUserSubscription } from '@/lib/payment-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Check, Sparkles, Zap, Crown, Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { PLANS, SubscriptionPlan, UserSubscription } from '@/types/payment';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { generateOrderId, generatePaymentId, createPayment } from '@/lib/payment-service';

const planIcons: Record<SubscriptionPlan, React.ReactNode> = {
  FREE: <Sparkles className="w-6 h-6" />,
  BASIC: <Zap className="w-6 h-6" />,
  PRO: <Crown className="w-6 h-6" />,
  ENTERPRISE: <Building2 className="w-6 h-6" />,
};

const planColors: Record<SubscriptionPlan, string> = {
  FREE: 'text-[#6b7280]',
  BASIC: 'text-[#3b82f6]',
  PRO: 'text-[#f72c5b]',
  ENTERPRISE: 'text-[#8b5cf6]',
};

const planBgColors: Record<SubscriptionPlan, string> = {
  FREE: 'bg-[#6b7280]/10',
  BASIC: 'bg-[#3b82f6]/10',
  PRO: 'bg-[#f72c5b]/10',
  ENTERPRISE: 'bg-[#8b5cf6]/10',
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

    if (plan === 'ENTERPRISE') {
      toast.info('엔터프라이즈 플랜은 문의가 필요합니다');
      // TODO: 문의 페이지로 이동 또는 모달
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
        orderName: `BlogBooster ${planInfo.name} 플랜 (월간)`,
        customerName: user.displayName || '고객',
        customerEmail: user.email || undefined,
        successUrl: `${window.location.origin}/payment/success?paymentId=${paymentId}`,
        failUrl: `${window.location.origin}/payment/fail?paymentId=${paymentId}`,
      });

    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : '결제 처리 중 오류가 발생했습니다';
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
            <p className="mt-4 text-sm text-[#10b981] bg-[#10b981]/10 inline-block px-4 py-2 rounded-full">
              현재 플랜: {PLANS[subscription.currentPlan].name}
            </p>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(Object.keys(PLANS) as SubscriptionPlan[]).map((planKey) => {
            const plan = PLANS[planKey];
            const isCurrentPlan = subscription?.currentPlan === planKey;
            const isPopular = planKey === 'PRO';

            return (
              <Card
                key={planKey}
                className={`relative border-2 transition-all duration-300 ${
                  isCurrentPlan
                    ? 'border-[#10b981] shadow-lg'
                    : isPopular
                    ? 'border-[#f72c5b] shadow-xl scale-105'
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
                    <span className="bg-[#10b981] text-white text-xs font-bold px-3 py-1 rounded-full">
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
                        ? 'bg-[#10b981] hover:bg-[#059669]'
                        : planKey === 'PRO'
                        ? 'bg-[#f72c5b] hover:bg-[#e0264f]'
                        : planKey === 'ENTERPRISE'
                        ? 'bg-[#8b5cf6] hover:bg-[#7c3aed]'
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
                      : planKey === 'ENTERPRISE'
                      ? '문의하기'
                      : '선택하기'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-[#6b7280] text-sm">
            결제 관련 문의: support@blogbooster.kr
          </p>
        </div>
      </div>
    </div>
  );
}
