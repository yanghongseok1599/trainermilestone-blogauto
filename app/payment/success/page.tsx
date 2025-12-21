'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  approvePayment,
  upgradePlan,
  getPayment,
} from '@/lib/payment-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle, Loader2, Home, FileText, AlertTriangle } from 'lucide-react';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [orderName, setOrderName] = useState('');
  const processedRef = useRef(false);

  useEffect(() => {
    const confirmPayment = async () => {
      // 중복 처리 방지
      if (processedRef.current) return;

      try {
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');
        const paymentId = searchParams.get('paymentId');

        // 1. 필수 파라미터 검증
        if (!paymentKey || !orderId || !amount || !paymentId) {
          throw new Error('결제 정보가 올바르지 않습니다');
        }

        if (!user) {
          throw new Error('로그인이 필요합니다');
        }

        // 2. Firestore에서 결제 정보 조회 및 소유자 검증
        const payment = await getPayment(paymentId);

        if (!payment) {
          throw new Error('결제 정보를 찾을 수 없습니다');
        }

        // 보안: 결제 정보의 소유자 확인 (RLS)
        if (payment.userId !== user.uid) {
          console.error('Payment ownership mismatch');
          throw new Error('권한이 없는 결제입니다');
        }

        // 보안: orderId 일치 확인
        if (payment.oderId !== orderId) {
          console.error('Order ID mismatch');
          throw new Error('주문 정보가 일치하지 않습니다');
        }

        // 보안: 금액 일치 확인
        if (payment.amount !== Number(amount)) {
          console.error('Amount mismatch:', { expected: payment.amount, received: amount });
          throw new Error('결제 금액이 일치하지 않습니다');
        }

        // 보안: 이미 처리된 결제인지 확인
        if (payment.status === 'DONE') {
          setOrderName(payment.planName);
          setStatus('success');
          return;
        }

        if (payment.status !== 'PENDING') {
          throw new Error('처리할 수 없는 결제 상태입니다');
        }

        processedRef.current = true;

        // 3. 서버에서 결제 승인
        const response = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '결제 승인 실패');
        }

        // 4. Firestore 업데이트
        await approvePayment(paymentId, paymentKey, data.payment);
        await upgradePlan(user.uid, payment.plan, paymentId);

        setOrderName(payment.planName);
        setStatus('success');
        toast.success('결제가 완료되었습니다!');

      } catch (error) {
        console.error('Payment confirmation error:', error);
        const message = error instanceof Error ? error.message : '결제 승인 중 오류 발생';
        setErrorMessage(message);
        setStatus('error');
        toast.error(message);
      }
    };

    // 인증 로딩 완료 후 실행
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      confirmPayment();
    }
  }, [searchParams, user, authLoading, router]);

  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#f5f5f5]">
        <Card className="w-full max-w-md border border-[#eeeeee] shadow-xl">
          <CardContent className="pt-12 pb-8 text-center">
            <Loader2 className="w-16 h-16 animate-spin text-[#f72c5b] mx-auto mb-6" />
            <h2 className="text-xl font-bold text-[#111111] mb-2">
              결제 확인 중...
            </h2>
            <p className="text-[#6b7280]">
              잠시만 기다려주세요
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#f5f5f5] p-4">
        <Card className="w-full max-w-md border border-red-200 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-xl text-red-600">결제 오류</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-[#6b7280]">{errorMessage}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/pricing')}
              >
                다시 시도
              </Button>
              <Button
                className="flex-1 bg-[#111111] hover:bg-[#333333]"
                onClick={() => router.push('/')}
              >
                홈으로
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#f5f5f5] p-4">
      <Card className="w-full max-w-md border border-[#10b981]/30 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 rounded-full bg-[#10b981]/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-[#10b981]" />
          </div>
          <CardTitle className="text-2xl text-[#111111]">결제 완료!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="bg-[#f5f5f5] rounded-lg p-4">
            <p className="text-sm text-[#6b7280] mb-1">구매 플랜</p>
            <p className="text-lg font-bold text-[#111111]">
              BlogBooster {orderName} 플랜
            </p>
          </div>
          <p className="text-[#6b7280]">
            플랜 업그레이드가 완료되었습니다.
            <br />
            지금 바로 모든 기능을 이용해보세요!
          </p>
          <div className="flex gap-3">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                홈으로
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button className="w-full bg-[#f72c5b] hover:bg-[#e0264f]">
                <FileText className="w-4 h-4 mr-2" />
                블로그 작성
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f72c5b]" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
