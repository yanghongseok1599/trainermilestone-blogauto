import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5; // 분당 최대 취소 요청 수
const RATE_LIMIT_WINDOW = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const clientIp = forwardedFor?.split(',')[0] || 'unknown';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    // 2. 요청 데이터 검증
    const body = await request.json();
    const { paymentKey, cancelReason, cancelAmount } = body;

    if (!paymentKey || !cancelReason) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // 3. paymentKey 형식 검증
    if (typeof paymentKey !== 'string' || paymentKey.length < 10 || paymentKey.length > 200) {
      return NextResponse.json(
        { error: '유효하지 않은 결제 키입니다', code: 'INVALID_PAYMENT_KEY' },
        { status: 400 }
      );
    }

    // 4. 취소 사유 검증 (XSS 방지)
    const sanitizedReason = cancelReason
      .replace(/[<>]/g, '')
      .substring(0, 200);

    if (sanitizedReason.length < 2) {
      return NextResponse.json(
        { error: '취소 사유를 입력해주세요', code: 'INVALID_REASON' },
        { status: 400 }
      );
    }

    // 5. 취소 금액 검증 (부분 취소시)
    if (cancelAmount !== undefined) {
      const numAmount = Number(cancelAmount);
      if (isNaN(numAmount) || numAmount <= 0 || numAmount > 10000000) {
        return NextResponse.json(
          { error: '유효하지 않은 취소 금액입니다', code: 'INVALID_AMOUNT' },
          { status: 400 }
        );
      }
    }

    // 6. 토스 시크릿 키 확인
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: '결제 서버 설정 오류', code: 'SERVER_CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // 7. 토스 결제 취소 API 호출
    const cancelBody: Record<string, unknown> = {
      cancelReason: sanitizedReason,
    };

    if (cancelAmount) {
      cancelBody.cancelAmount = Number(cancelAmount);
    }

    const tossResponse = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cancelBody),
      }
    );

    const tossData = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error('Toss Cancel API Error:', tossData);
      return NextResponse.json(
        {
          error: tossData.message || '결제 취소 실패',
          code: tossData.code || 'TOSS_CANCEL_ERROR',
        },
        { status: tossResponse.status }
      );
    }

    // 8. 성공 응답
    return NextResponse.json({
      success: true,
      cancellation: {
        paymentKey: tossData.paymentKey,
        orderId: tossData.orderId,
        status: tossData.status,
        canceledAt: tossData.cancels?.[0]?.canceledAt,
        cancelAmount: tossData.cancels?.[0]?.cancelAmount,
      },
    });

  } catch (error) {
    console.error('Payment cancel error:', error);
    return NextResponse.json(
      { error: '결제 취소 중 오류가 발생했습니다', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
