import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

// Server-side only Firebase Admin initialization
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    // 환경변수에서 서비스 계정 정보 로드
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
      console.warn('Firebase Admin: Project ID not found');
      return null;
    }

    try {
      // 개발 환경에서는 Application Default Credentials 사용
      // 프로덕션에서는 서비스 계정 키 사용
      if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
        adminApp = initializeApp({
          credential: cert({
            projectId: projectId,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      } else {
        // 서비스 계정 없이 프로젝트 ID만으로 초기화 (개발용)
        adminApp = initializeApp({
          projectId: projectId,
        });
      }

      adminDb = getFirestore(adminApp);
      adminAuth = getAuth(adminApp);
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
      return null;
    }
  } else {
    adminApp = getApps()[0];
    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
  }

  return { app: adminApp, db: adminDb, auth: adminAuth };
}

// Export lazy-initialized instances
export function getAdminDb(): Firestore | null {
  if (!adminDb) {
    initializeFirebaseAdmin();
  }
  return adminDb;
}

export function getAdminAuth(): Auth | null {
  if (!adminAuth) {
    initializeFirebaseAdmin();
  }
  return adminAuth;
}

// Verify Firebase ID token (for API routes)
export async function verifyIdToken(token: string): Promise<{ uid: string; email?: string } | null> {
  const auth = getAdminAuth();
  if (!auth) return null;

  try {
    const decodedToken = await auth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}
