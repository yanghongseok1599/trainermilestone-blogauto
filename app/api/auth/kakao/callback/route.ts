import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('[Kakao Callback] Starting...');
  console.log('[Kakao Callback] Origin:', request.nextUrl.origin);

  if (error) {
    console.error('[Kakao Callback] Kakao returned error:', error);
    return NextResponse.redirect(new URL('/login?error=kakao_auth_failed', request.url));
  }

  if (!code) {
    console.error('[Kakao Callback] No code provided');
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    const KAKAO_REST_API_KEY = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
    const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
    // 카카오 콘솔에 등록된 Redirect URI와 정확히 일치해야 함
    const REDIRECT_URI = 'https://trainermilestone-blogbooster.vercel.app/api/auth/kakao/callback';

    console.log('[Kakao Callback] REST API Key exists:', !!KAKAO_REST_API_KEY);
    console.log('[Kakao Callback] Client Secret exists:', !!KAKAO_CLIENT_SECRET);
    console.log('[Kakao Callback] Redirect URI:', REDIRECT_URI);

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
      const errorText = await tokenResponse.text();
      console.error('[Kakao Callback] Token response error:', errorText);
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

    console.log('[Kakao Callback] Getting Firebase Admin...');
    console.log('[Kakao Callback] FIREBASE_ADMIN_PRIVATE_KEY exists:', !!process.env.FIREBASE_ADMIN_PRIVATE_KEY);
    console.log('[Kakao Callback] FIREBASE_ADMIN_CLIENT_EMAIL exists:', !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL);

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth) {
      console.error('[Kakao Callback] Firebase Admin not initialized');
      return NextResponse.redirect(new URL('/login?error=firebase_error', request.url));
    }

    console.log('[Kakao Callback] Firebase Admin initialized successfully');

    // Firebase Custom Token 생성
    let customToken: string;
    try {
      customToken = await adminAuth.createCustomToken(uid, {
        provider: 'kakao',
        email,
        displayName,
      });
      console.log('[Kakao Callback] Custom token created successfully');
    } catch (tokenError) {
      console.error('[Kakao Callback] Custom token creation failed:', tokenError);
      return NextResponse.redirect(new URL('/login?error=token_create_failed', request.url));
    }

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
