import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Payment,
  UserSubscription,
  PaymentStatus,
  SubscriptionPlan,
  PLANS,
} from '@/types/payment';

// ==================== 결제 관련 ====================

// 결제 정보 저장
export async function createPayment(payment: Omit<Payment, 'createdAt'>): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const docRef = doc(db, 'payments', payment.id);
  await setDoc(docRef, {
    ...payment,
    createdAt: serverTimestamp(),
  });
}

// 결제 정보 조회
export async function getPayment(paymentId: string): Promise<Payment | null> {
  if (!db) return null;

  const docRef = doc(db, 'payments', paymentId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      approvedAt: data.approvedAt ? (data.approvedAt as Timestamp).toDate() : undefined,
      canceledAt: data.canceledAt ? (data.canceledAt as Timestamp).toDate() : undefined,
    } as Payment;
  }
  return null;
}

// 결제 상태 업데이트
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  additionalData?: Partial<Payment>
): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const docRef = doc(db, 'payments', paymentId);
  await updateDoc(docRef, {
    status,
    ...additionalData,
    updatedAt: serverTimestamp(),
  });
}

// 결제 승인 처리
export async function approvePayment(
  paymentId: string,
  paymentKey: string,
  tossResponse: Record<string, unknown>
): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const docRef = doc(db, 'payments', paymentId);
  await updateDoc(docRef, {
    status: 'DONE',
    paymentKey,
    approvedAt: serverTimestamp(),
    tossResponse,
  });
}

// 결제 취소 처리
export async function cancelPayment(
  paymentId: string,
  cancelReason: string,
  cancelAmount?: number
): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const docRef = doc(db, 'payments', paymentId);
  await updateDoc(docRef, {
    status: 'CANCELED',
    cancelReason,
    cancelAmount,
    canceledAt: serverTimestamp(),
  });
}

// 사용자 결제 내역 조회
export async function getUserPayments(userId: string): Promise<Payment[]> {
  if (!db) return [];

  const paymentsRef = collection(db, 'payments');
  const q = query(
    paymentsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);

  const payments: Payment[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    payments.push({
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      approvedAt: data.approvedAt ? (data.approvedAt as Timestamp).toDate() : undefined,
      canceledAt: data.canceledAt ? (data.canceledAt as Timestamp).toDate() : undefined,
    } as Payment);
  });

  return payments;
}

// ==================== 구독 관련 ====================

// 사용자 구독 정보 생성/업데이트
export async function updateUserSubscription(
  userId: string,
  subscriptionData: Partial<UserSubscription>
): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const docRef = doc(db, 'users', userId, 'subscription', 'current');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    await updateDoc(docRef, {
      ...subscriptionData,
      updatedAt: serverTimestamp(),
    });
  } else {
    // 새 구독 생성
    await setDoc(docRef, {
      oderId: userId,
      currentPlan: 'FREE',
      planStartDate: serverTimestamp(),
      planEndDate: getNextMonthDate(),
      blogCount: 0,
      imageAnalysisCount: 0,
      usageResetDate: getNextMonthDate(),
      isActive: true,
      autoRenew: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...subscriptionData,
    });
  }
}

// 사용자 구독 정보 조회
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  if (!db) return null;

  const docRef = doc(db, 'users', userId, 'subscription', 'current');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      ...data,
      planStartDate: (data.planStartDate as Timestamp)?.toDate() || new Date(),
      planEndDate: (data.planEndDate as Timestamp)?.toDate() || new Date(),
      usageResetDate: (data.usageResetDate as Timestamp)?.toDate() || new Date(),
      nextPaymentDate: data.nextPaymentDate ? (data.nextPaymentDate as Timestamp).toDate() : undefined,
      createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
    } as UserSubscription;
  }

  // 기본 무료 구독 생성
  await updateUserSubscription(userId, {
    currentPlan: 'FREE',
  });

  return getUserSubscription(userId);
}

// 플랜 업그레이드
export async function upgradePlan(
  userId: string,
  newPlan: SubscriptionPlan,
  paymentId: string
): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1);

  await updateUserSubscription(userId, {
    currentPlan: newPlan,
    planStartDate: now,
    planEndDate: endDate,
    lastPaymentId: paymentId,
    nextPaymentDate: endDate,
    isActive: true,
    autoRenew: true,
  });
}

// 사용량 증가
export async function incrementUsage(
  userId: string,
  type: 'blog' | 'imageAnalysis'
): Promise<{ allowed: boolean; remaining: number }> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    return { allowed: false, remaining: 0 };
  }

  const plan = PLANS[subscription.currentPlan];
  const limit = type === 'blog' ? plan.blogLimit : plan.imageLimit;
  const currentCount = type === 'blog' ? subscription.blogCount : subscription.imageAnalysisCount;

  // 무제한인 경우 (-1)
  if (limit === -1) {
    const field = type === 'blog' ? 'blogCount' : 'imageAnalysisCount';
    await updateUserSubscription(userId, {
      [field]: currentCount + 1,
    });
    return { allowed: true, remaining: -1 };
  }

  // 제한 확인
  if (currentCount >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // 사용량 증가
  const field = type === 'blog' ? 'blogCount' : 'imageAnalysisCount';
  await updateUserSubscription(userId, {
    [field]: currentCount + 1,
  });

  return { allowed: true, remaining: limit - currentCount - 1 };
}

// 토큰 사용량 확인 및 증가 (월간 + 일일 제한 모두 체크)
export async function checkAndIncrementTokenUsage(
  userId: string,
  tokensUsed: number
): Promise<{
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  dailyRemaining: number;
  dailyUsed: number;
  dailyLimit: number;
  reason?: 'monthly' | 'daily';
}> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    return { allowed: false, remaining: 0, used: 0, limit: 0, dailyRemaining: 0, dailyUsed: 0, dailyLimit: 0 };
  }

  const plan = PLANS[subscription.currentPlan];
  const tokenLimit = plan.tokenLimit;
  const dailyTokenLimit = plan.dailyTokenLimit;
  const currentUsage = subscription.tokenUsage || 0;

  // 일일 토큰 사용량 체크 및 리셋
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyResetDate = subscription.dailyTokenResetDate ? new Date(subscription.dailyTokenResetDate) : null;

  let dailyUsage = subscription.dailyTokenUsage || 0;

  // 날짜가 바뀌면 일일 사용량 리셋
  if (!dailyResetDate || dailyResetDate < today) {
    dailyUsage = 0;
    await updateUserSubscription(userId, {
      dailyTokenUsage: 0,
      dailyTokenResetDate: today,
    });
  }

  // 일일 토큰 제한 확인
  if (dailyUsage + tokensUsed > dailyTokenLimit) {
    return {
      allowed: false,
      remaining: Math.max(0, tokenLimit - currentUsage),
      used: currentUsage,
      limit: tokenLimit,
      dailyRemaining: Math.max(0, dailyTokenLimit - dailyUsage),
      dailyUsed: dailyUsage,
      dailyLimit: dailyTokenLimit,
      reason: 'daily'
    };
  }

  // 월간 토큰 제한 확인
  if (currentUsage + tokensUsed > tokenLimit) {
    return {
      allowed: false,
      remaining: Math.max(0, tokenLimit - currentUsage),
      used: currentUsage,
      limit: tokenLimit,
      dailyRemaining: Math.max(0, dailyTokenLimit - dailyUsage),
      dailyUsed: dailyUsage,
      dailyLimit: dailyTokenLimit,
      reason: 'monthly'
    };
  }

  // 토큰 사용량 증가 (월간 + 일일)
  await updateUserSubscription(userId, {
    tokenUsage: currentUsage + tokensUsed,
    dailyTokenUsage: dailyUsage + tokensUsed,
  });

  return {
    allowed: true,
    remaining: tokenLimit - currentUsage - tokensUsed,
    used: currentUsage + tokensUsed,
    limit: tokenLimit,
    dailyRemaining: dailyTokenLimit - dailyUsage - tokensUsed,
    dailyUsed: dailyUsage + tokensUsed,
    dailyLimit: dailyTokenLimit
  };
}

// 토큰 사용량 조회 (월간 + 일일)
export async function getTokenUsage(userId: string): Promise<{
  used: number;
  remaining: number;
  limit: number;
  dailyUsed: number;
  dailyRemaining: number;
  dailyLimit: number;
}> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    return { used: 0, remaining: 0, limit: 0, dailyUsed: 0, dailyRemaining: 0, dailyLimit: 0 };
  }

  const plan = PLANS[subscription.currentPlan];
  const tokenLimit = plan.tokenLimit;
  const dailyTokenLimit = plan.dailyTokenLimit;
  const currentUsage = subscription.tokenUsage || 0;

  // 일일 토큰 사용량 체크
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyResetDate = subscription.dailyTokenResetDate ? new Date(subscription.dailyTokenResetDate) : null;
  let dailyUsage = subscription.dailyTokenUsage || 0;

  // 날짜가 바뀌면 일일 사용량은 0으로 표시
  if (!dailyResetDate || dailyResetDate < today) {
    dailyUsage = 0;
  }

  return {
    used: currentUsage,
    remaining: Math.max(0, tokenLimit - currentUsage),
    limit: tokenLimit,
    dailyUsed: dailyUsage,
    dailyRemaining: Math.max(0, dailyTokenLimit - dailyUsage),
    dailyLimit: dailyTokenLimit
  };
}

// 예약 발행 권한 확인
export async function canUseScheduledPost(userId: string): Promise<boolean> {
  if (!db) return false;

  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  const plan = PLANS[subscription.currentPlan];
  return plan.scheduledPost;
}

// RAG 학습 기능 권한 확인
export async function canUseRagLearning(userId: string): Promise<boolean> {
  if (!db) return false;

  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  const plan = PLANS[subscription.currentPlan];
  return plan.ragLearning;
}

// 사용량 리셋 (월간)
export async function resetMonthlyUsage(userId: string): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  await updateUserSubscription(userId, {
    blogCount: 0,
    imageAnalysisCount: 0,
    tokenUsage: 0,
    usageResetDate: getNextMonthDate(),
  });
}

// 구독 취소
export async function cancelSubscription(userId: string): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  await updateUserSubscription(userId, {
    autoRenew: false,
  });
}

// ==================== 유틸리티 ====================

// 다음 달 날짜 계산
function getNextMonthDate(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

// 주문 ID 생성
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `ORDER_${timestamp}_${randomStr}`.toUpperCase();
}

// 결제 ID 생성
export function generatePaymentId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `PAY_${timestamp}_${randomStr}`.toUpperCase();
}
