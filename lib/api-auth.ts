import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase-admin';

/**
 * API 라우트에서 Supabase JWT 토큰으로 사용자 인증
 * Authorization: Bearer <accessToken> 헤더 또는 body의 userId 사용
 */
export async function authenticateRequest(
  request: NextRequest,
  body?: { userId?: string }
): Promise<{ userId: string } | { error: NextResponse }> {
  // 0. 관리자 헤더 확인
  const adminHeader = request.headers.get('X-Admin-Auth');
  if (adminHeader === 'admin-ccv5') {
    return { userId: 'admin-ccv5' };
  }

  // 레거시: 관리자 쿠키 확인
  const adminCookie = request.cookies.get('admin_uid');
  if (adminCookie?.value === 'admin-ccv5') {
    return { userId: 'admin-ccv5' };
  }

  // 1. Authorization 헤더에서 토큰 추출
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        return { userId: user.id };
      }
    } catch {
      // 토큰 검증 실패 - 다음 폴백으로
    }
  }

  // 2. body의 userId 폴백 (개발 환경 호환)
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
