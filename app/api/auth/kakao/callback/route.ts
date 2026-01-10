import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/login?error=kakao_auth_failed', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    const KAKAO_REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
    const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
    const REDIRECT_URI = `${request.nextUrl.origin}/api/auth/kakao/callback`;

    // 1. 카카오 토큰 받기
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY || '',
        client_secret: KAKAO_CLIENT_SECRET || '',
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Token response error:', await tokenResponse.text());
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
    }

    const tokenData = await tokenResponse.json();

    // 2. 카카오 사용자 정보 받기
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('User info error:', await userResponse.text());
      return NextResponse.redirect(new URL('/login?error=user_info_failed', request.url));
    }

    const kakaoUser = await userResponse.json();

    // 3. Firebase Custom Token 생성
    const uid = `kakao:${kakaoUser.id}`;
    const email = kakaoUser.kakao_account?.email || `${kakaoUser.id}@kakao.user`;
    const displayName = kakaoUser.properties?.nickname || kakaoUser.kakao_account?.profile?.nickname || '카카오 사용자';
    const photoURL = kakaoUser.properties?.profile_image || kakaoUser.kakao_account?.profile?.profile_image_url;

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth) {
      console.error('Firebase Admin not initialized');
      return NextResponse.redirect(new URL('/login?error=firebase_error', request.url));
    }

    // Firebase Custom Token 생성
    const customToken = await adminAuth.createCustomToken(uid, {
      provider: 'kakao',
      email,
      displayName,
    });

    // 4. Firestore에 사용자 정보 저장
    if (adminDb) {
      const userRef = adminDb.collection('users').doc(uid);
      const userSnap = await userRef.get();

      if (!userSnap.exists) {
        await userRef.set({
          uid,
          email,
          displayName,
          photoURL,
          provider: 'kakao',
          kakaoId: kakaoUser.id,
          createdAt: new Date(),
          lastLoginAt: new Date(),
        });
      } else {
        await userRef.update({
          lastLoginAt: new Date(),
        });
      }
    }

    // 5. 클라이언트로 리다이렉트 (토큰 전달)
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('kakao_token', customToken);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Kakao auth error:', error);
    return NextResponse.redirect(new URL('/login?error=auth_error', request.url));
  }
}
