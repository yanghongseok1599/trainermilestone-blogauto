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

// 사용량 리셋 (월간)
export async function resetMonthlyUsage(userId: string): Promise<void> {
  if (!db) throw new Error('Firestore가 초기화되지 않았습니다');

  await updateUserSubscription(userId, {
    blogCount: 0,
    imageAnalysisCount: 0,
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
