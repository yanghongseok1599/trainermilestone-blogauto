import { getAdminDb } from './firebase-admin';
import { PLANS, SubscriptionPlan } from '@/types/payment';
import { FieldValue } from 'firebase-admin/firestore';

// 무료 모델 ID 목록
const FREE_MODELS = ['gemini-2.5-flash-image'];

// 관리자 userId (무제한 이용)
const ADMIN_USER_ID = 'admin-ccv5';

/**
 * 서버에서 사용자 구독 정보를 조회
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSubscription(userId: string): Promise<Record<string, any> | null> {
  const db = getAdminDb();
  if (!db) return null;

  const docRef = db.doc(`users/${userId}/subscription/current`);
  const snap = await docRef.get();

  if (!snap.exists) {
    // 기본 무료 구독 생성
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);
    const defaultSub = {
      oderId: userId,
      currentPlan: 'FREE' as SubscriptionPlan,
      planStartDate: now,
      planEndDate: endDate,
      blogCount: 0,
      imageAnalysisCount: 0,
      imageGenerationCount: 0,
      dailyPaidImageGenerationCount: 0,
      dailyImageGenerationResetDate: now,
      tokenUsage: 0,
      dailyTokenUsage: 0,
      dailyTokenResetDate: now,
      usageResetDate: endDate,
      isActive: true,
      autoRenew: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await docRef.set(defaultSub);
    return { ...defaultSub, id: snap.id };
  }

  return { ...snap.data(), id: snap.id };
}

/**
 * 이미지 생성 사용량 체크 및 증가 (서버 전용)
 * @returns { allowed, reason? } - allowed가 false이면 reason에 사유 포함
 */
export async function checkAndIncrementImageUsage(
  userId: string,
  model: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (userId === ADMIN_USER_ID) return { allowed: true };

  const db = getAdminDb();
  if (!db) return { allowed: false, reason: 'DB 미초기화' };

  const sub = await getSubscription(userId);
  if (!sub) return { allowed: false, reason: '구독 정보 없음' };

  const plan = PLANS[sub.currentPlan as SubscriptionPlan];
  const isFreeModel = FREE_MODELS.includes(model);

  // 일일 리셋 체크
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resetDate = sub.dailyImageGenerationResetDate?.toDate?.()
    ?? (sub.dailyImageGenerationResetDate ? new Date(sub.dailyImageGenerationResetDate) : null);

  let dailyPaidCount = sub.dailyPaidImageGenerationCount || 0;
  const needsReset = !resetDate || resetDate < today;

  if (needsReset) {
    dailyPaidCount = 0;
  }

  const docRef = db.doc(`users/${userId}/subscription/current`);

  if (isFreeModel) {
    // 무료 모델: 제한 없음 (일일 합산 한도 제거됨)
    return { allowed: true };
  }

  // 유료 모델
  const monthlyCount = sub.imageGenerationCount || 0;

  // 플랜에서 유료 이미지 미지원
  if (plan.imageGenerationLimit === 0) {
    return { allowed: false, reason: '현재 플랜에서는 유료 모델 사용이 지원되지 않습니다' };
  }

  // 월 한도 체크
  if (monthlyCount >= plan.imageGenerationLimit) {
    return { allowed: false, reason: `월간 유료 이미지 한도(${plan.imageGenerationLimit}장)를 초과했습니다` };
  }

  // 유료 일일 한도 체크
  if (dailyPaidCount >= plan.dailyPaidImageGenerationLimit) {
    return { allowed: false, reason: `일일 유료 모델 한도(${plan.dailyPaidImageGenerationLimit}장)를 초과했습니다` };
  }

  // 카운트 증가 (유료: 월간 + 일일유료)
  const updateData: Record<string, unknown> = {
    imageGenerationCount: monthlyCount + 1,
    dailyPaidImageGenerationCount: dailyPaidCount + 1,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (needsReset) {
    updateData.dailyImageGenerationResetDate = today;
  }
  await docRef.update(updateData);

  return { allowed: true };
}

/**
 * 토큰 사용량 체크 및 증가 (서버 전용)
 */
export async function checkAndIncrementTokenUsageServer(
  userId: string,
  tokensUsed: number
): Promise<{ allowed: boolean; reason?: string }> {
  if (userId === ADMIN_USER_ID) return { allowed: true };

  const db = getAdminDb();
  if (!db) return { allowed: false, reason: 'DB 미초기화' };

  const sub = await getSubscription(userId);
  if (!sub) return { allowed: false, reason: '구독 정보 없음' };

  const plan = PLANS[sub.currentPlan as SubscriptionPlan];
  const currentUsage = sub.tokenUsage || 0;

  // 일일 리셋 체크
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyResetDate = sub.dailyTokenResetDate?.toDate?.()
    ?? (sub.dailyTokenResetDate ? new Date(sub.dailyTokenResetDate) : null);

  let dailyUsage = sub.dailyTokenUsage || 0;
  const needsReset = !dailyResetDate || dailyResetDate < today;

  if (needsReset) {
    dailyUsage = 0;
  }

  // 일일 한도 체크
  if (dailyUsage + tokensUsed > plan.dailyTokenLimit) {
    return { allowed: false, reason: `일일 토큰 한도(${plan.dailyTokenLimit.toLocaleString()})를 초과했습니다` };
  }

  // 월간 한도 체크
  if (currentUsage + tokensUsed > plan.tokenLimit) {
    return { allowed: false, reason: `월간 토큰 한도(${plan.tokenLimit.toLocaleString()})를 초과했습니다` };
  }

  // 사용량 증가
  const docRef = db.doc(`users/${userId}/subscription/current`);
  const updateData: Record<string, unknown> = {
    tokenUsage: currentUsage + tokensUsed,
    dailyTokenUsage: dailyUsage + tokensUsed,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (needsReset) {
    updateData.dailyTokenResetDate = today;
  }
  await docRef.update(updateData);

  return { allowed: true };
}

/**
 * 블로그/이미지분석 사용량 체크 및 증가 (서버 전용)
 */
export async function checkAndIncrementUsageServer(
  userId: string,
  type: 'blog' | 'imageAnalysis'
): Promise<{ allowed: boolean; reason?: string }> {
  if (userId === ADMIN_USER_ID) return { allowed: true };

  const db = getAdminDb();
  if (!db) return { allowed: false, reason: 'DB 미초기화' };

  const sub = await getSubscription(userId);
  if (!sub) return { allowed: false, reason: '구독 정보 없음' };

  const plan = PLANS[sub.currentPlan as SubscriptionPlan];
  const limit = type === 'blog' ? plan.blogLimit : plan.imageLimit;
  const currentCount = type === 'blog' ? (sub.blogCount || 0) : (sub.imageAnalysisCount || 0);

  if (limit === -1) {
    // 무제한
    const field = type === 'blog' ? 'blogCount' : 'imageAnalysisCount';
    const docRef = db.doc(`users/${userId}/subscription/current`);
    await docRef.update({ [field]: currentCount + 1, updatedAt: FieldValue.serverTimestamp() });
    return { allowed: true };
  }

  if (currentCount >= limit) {
    const label = type === 'blog' ? '블로그 생성' : '이미지 분석';
    return { allowed: false, reason: `월간 ${label} 한도(${limit}회)를 초과했습니다` };
  }

  const field = type === 'blog' ? 'blogCount' : 'imageAnalysisCount';
  const docRef = db.doc(`users/${userId}/subscription/current`);
  await docRef.update({ [field]: currentCount + 1, updatedAt: FieldValue.serverTimestamp() });

  return { allowed: true };
}
