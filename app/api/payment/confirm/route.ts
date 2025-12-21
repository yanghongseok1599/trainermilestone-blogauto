import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// 결제 처리 상태 추적 (중복 방지)
const processingPayments = new Set<string>();

// Rate limiting: IP당 요청 제한
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10; // 분당 최대 요청 수
const RATE_LIMIT_WINDOW = 60 * 1000; // 1분

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
    // 1. Rate Limiting 체크
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const clientIp = forwardedFor?.split(',')[0] || 'unknown';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    // 2. 요청 데이터 파싱 및 검증
    const body = await request.json();
    const { paymentKey, orderId, amount, paymentId, userId } = body;

    if (!paymentKey || !orderId || amount === undefined) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // 3. 금액 유효성 검증
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > 10000000) {
      return NextResponse.json(
        { error: '유효하지 않은 결제 금액입니다', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    // 4. orderId 형식 검증 (인젝션 방지)
    const orderIdPattern = /^ORDER_[A-Z0-9_]+$/;
    if (!orderIdPattern.test(orderId)) {
      return NextResponse.json(
        { error: '유효하지 않은 주문 ID 형식입니다', code: 'INVALID_ORDER_ID' },
        { status: 400 }
      );
    }

    // 5. 중복 처리 방지 (Idempotency)
    const idempotencyKey = `${orderId}:${paymentKey}`;
    if (processingPayments.has(idempotencyKey)) {
      return NextResponse.json(
        { error: '이미 처리 중인 결제입니다', code: 'DUPLICATE_REQUEST' },
        { status: 409 }
      );
    }

    processingPayments.add(idempotencyKey);

    try {
      // 6. 토스 시크릿 키 확인
      const secretKey = process.env.TOSS_SECRET_KEY;
      if (!secretKey) {
        return NextResponse.json(
          { error: '결제 서버 설정 오류', code: 'SERVER_CONFIG_ERROR' },
          { status: 500 }
        );
      }

      // 7. 토스 결제 승인 API 호출
      const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: numAmount,
        }),
      });

      const tossData = await tossResponse.json();

      if (!tossResponse.ok) {
        console.error('Toss API Error:', tossData);
        return NextResponse.json(
          {
            error: tossData.message || '결제 승인 실패',
            code: tossData.code || 'TOSS_API_ERROR',
          },
          { status: tossResponse.status }
        );
      }

      // 8. 토스 응답 검증
      if (tossData.totalAmount !== numAmount) {
        console.error('Amount mismatch:', { expected: numAmount, actual: tossData.totalAmount });
        return NextResponse.json(
          { error: '결제 금액 불일치', code: 'AMOUNT_MISMATCH' },
          { status: 400 }
        );
      }

      // 9. 성공 응답 (민감 정보 제외)
      return NextResponse.json({
        success: true,
        payment: {
          paymentKey: tossData.paymentKey,
          orderId: tossData.orderId,
          orderName: tossData.orderName,
          status: tossData.status,
          method: tossData.method,
          totalAmount: tossData.totalAmount,
          approvedAt: tossData.approvedAt,
          receipt: tossData.receipt?.url, // 영수증 URL만 전달
        },
      });

    } finally {
      // 처리 완료 후 중복 방지 목록에서 제거
      setTimeout(() => {
        processingPayments.delete(idempotencyKey);
      }, 5000);
    }

  } catch (error) {
    console.error('Payment confirm error:', error);

    // 에러 상세 정보는 서버 로그에만 기록
    return NextResponse.json(
      { error: '결제 처리 중 오류가 발생했습니다', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// OPTIONS 요청 처리 (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
