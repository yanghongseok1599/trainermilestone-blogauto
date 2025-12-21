'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, Home, RefreshCw, Loader2 } from 'lucide-react';

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message') || '결제가 취소되었거나 오류가 발생했습니다';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-[#f5f5f5] p-4">
      <Card className="w-full max-w-md border border-red-200 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-[#111111]">결제 실패</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-red-600 text-sm">
              {decodeURIComponent(errorMessage)}
            </p>
            {errorCode && (
              <p className="text-red-400 text-xs mt-2">
                오류 코드: {errorCode}
              </p>
            )}
          </div>
          <p className="text-[#6b7280] text-sm">
            결제 중 문제가 발생했습니다.
            <br />
            다시 시도하거나 다른 결제 수단을 이용해주세요.
          </p>
          <div className="flex gap-3">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                홈으로
              </Button>
            </Link>
            <Link href="/pricing" className="flex-1">
              <Button className="w-full bg-[#f72c5b] hover:bg-[#e0264f]">
                <RefreshCw className="w-4 h-4 mr-2" />
                다시 시도
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f72c5b]" />
      </div>
    }>
      <PaymentFailContent />
    </Suspense>
  );
}
