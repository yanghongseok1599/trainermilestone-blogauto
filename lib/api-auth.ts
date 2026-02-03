import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from './firebase-admin';

/**
 * API 라우트에서 Firebase ID 토큰으로 사용자 인증
 * Authorization: Bearer <idToken> 헤더 또는 body의 userId 사용
 *
 * @returns userId 또는 에러 응답
 */
export async function authenticateRequest(
  request: NextRequest,
  body?: { userId?: string }
): Promise<{ userId: string } | { error: NextResponse }> {
  // 1. Authorization 헤더에서 토큰 추출
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = await verifyIdToken(token);
    if (decoded) {
      return { userId: decoded.uid };
    }
  }

  // 2. body의 userId 폴백 (토큰 검증 불가 시 - 개발 환경 호환)
  // 프로덕션에서는 토큰 검증 필수로 변경해야 함
  if (body?.userId && body.userId !== '') {
    return { userId: body.userId };
  }

  return {
    error: NextResponse.json(
      { error: '인증이 필요합니다. 로그인해주세요.' },
      { status: 401 }
    ),
  };
}
