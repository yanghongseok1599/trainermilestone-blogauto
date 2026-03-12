import { createSupabaseBrowserClient } from './supabase-client';
import {
  Payment,
  PaymentMethod,
  UserSubscription,
  PaymentStatus,
  SubscriptionPlan,
  PLANS,
} from '@/types/payment';

const supabase = createSupabaseBrowserClient();

// ==================== 결제 관련 ====================

// 결제 정보 저장
export async function createPayment(payment: Omit<Payment, 'createdAt'>): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .insert({
      id: payment.id,
      order_id: payment.orderId,
      user_id: payment.userId,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      plan: payment.plan,
      plan_name: payment.planName,
    });

  if (error) throw new Error(`결제 정보 저장 실패: ${error.message}`);
}

// 결제 정보 조회
export async function getPayment(paymentId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (error || !data) return null;
  return mapPaymentRow(data);
}

// 결제 상태 업데이트
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  additionalData?: Partial<Payment>
): Promise<void> {
  const updateData: Record<string, unknown> = { status };
  if (additionalData?.paymentKey) updateData.payment_key = additionalData.paymentKey;
  if (additionalData?.method) updateData.method = additionalData.method;

  const { error } = await supabase
    .from('payments')
    .update(updateData)
    .eq('id', paymentId);

  if (error) throw new Error(`결제 상태 업데이트 실패: ${error.message}`);
}

// 결제 승인 처리
export async function approvePayment(
  paymentId: string,
  paymentKey: string,
  tossResponse: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'DONE',
      payment_key: paymentKey,
      approved_at: new Date().toISOString(),
      toss_response: tossResponse,
    })
    .eq('id', paymentId);

  if (error) throw new Error(`결제 승인 실패: ${error.message}`);
}

// 결제 취소 처리
export async function cancelPayment(
  paymentId: string,
  cancelReason: string,
  cancelAmount?: number
): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'CANCELED',
      cancel_reason: cancelReason,
      cancel_amount: cancelAmount,
      canceled_at: new Date().toISOString(),
    })
    .eq('id', paymentId);

  if (error) throw new Error(`결제 취소 실패: ${error.message}`);
}

// 사용자 결제 내역 조회
export async function getUserPayments(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(mapPaymentRow);
}

// ==================== 구독 관련 ====================

// 사용자 구독 정보 생성/업데이트
export async function updateUserSubscription(
  userId: string,
  subscriptionData: Partial<UserSubscription>
): Promise<void> {
  // camelCase → snake_case 변환
  const dbData: Record<string, unknown> = { user_id: userId };

  if (subscriptionData.currentPlan !== undefined) dbData.current_plan = subscriptionData.currentPlan;
  if (subscriptionData.planStartDate !== undefined) dbData.plan_start_date = subscriptionData.planStartDate instanceof Date ? subscriptionData.planStartDate.toISOString() : subscriptionData.planStartDate;
  if (subscriptionData.planEndDate !== undefined) dbData.plan_end_date = subscriptionData.planEndDate instanceof Date ? subscriptionData.planEndDate.toISOString() : subscriptionData.planEndDate;
  if (subscriptionData.blogCount !== undefined) dbData.blog_count = subscriptionData.blogCount;
  if (subscriptionData.imageAnalysisCount !== undefined) dbData.image_analysis_count = subscriptionData.imageAnalysisCount;
  if (subscriptionData.imageGenerationCount !== undefined) dbData.image_generation_count = subscriptionData.imageGenerationCount;
  if (subscriptionData.dailyPaidImageGenerationCount !== undefined) dbData.daily_paid_image_generation_count = subscriptionData.dailyPaidImageGenerationCount;
  if (subscriptionData.dailyImageGenerationResetDate !== undefined) dbData.daily_image_generation_reset_date = subscriptionData.dailyImageGenerationResetDate instanceof Date ? subscriptionData.dailyImageGenerationResetDate.toISOString() : subscriptionData.dailyImageGenerationResetDate;
  if (subscriptionData.tokenUsage !== undefined) dbData.token_usage = subscriptionData.tokenUsage;
  if (subscriptionData.dailyTokenUsage !== undefined) dbData.daily_token_usage = subscriptionData.dailyTokenUsage;
  if (subscriptionData.dailyTokenResetDate !== undefined) dbData.daily_token_reset_date = subscriptionData.dailyTokenResetDate instanceof Date ? subscriptionData.dailyTokenResetDate.toISOString() : subscriptionData.dailyTokenResetDate;
  if (subscriptionData.usageResetDate !== undefined) dbData.usage_reset_date = subscriptionData.usageResetDate instanceof Date ? subscriptionData.usageResetDate.toISOString() : subscriptionData.usageResetDate;
  if (subscriptionData.lastPaymentId !== undefined) dbData.last_payment_id = subscriptionData.lastPaymentId;
  if (subscriptionData.nextPaymentDate !== undefined) dbData.next_payment_date = subscriptionData.nextPaymentDate instanceof Date ? subscriptionData.nextPaymentDate.toISOString() : subscriptionData.nextPaymentDate;
  if (subscriptionData.isActive !== undefined) dbData.is_active = subscriptionData.isActive;
  if (subscriptionData.autoRenew !== undefined) dbData.auto_renew = subscriptionData.autoRenew;

  const { error } = await supabase
    .from('subscriptions')
    .upsert(dbData, { onConflict: 'user_id' });

  if (error) throw new Error(`구독 업데이트 실패: ${error.message}`);
}

// 사용자 구독 정보 조회
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // 기본 무료 구독 생성
    await updateUserSubscription(userId, { currentPlan: 'FREE' });
    return getUserSubscription(userId);
  }

  return mapSubscriptionRow(data);
}

// 플랜 업그레이드
export async function upgradePlan(
  userId: string,
  newPlan: SubscriptionPlan,
  paymentId: string
): Promise<void> {
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
  const subscription = await getUserSubscription(userId);
  if (!subscription) return { allowed: false, remaining: 0 };

  const plan = PLANS[subscription.currentPlan];
  const limit = type === 'blog' ? plan.blogLimit : plan.imageLimit;
  const currentCount = type === 'blog' ? subscription.blogCount : subscription.imageAnalysisCount;

  if (limit === -1) {
    const field = type === 'blog' ? 'blogCount' : 'imageAnalysisCount';
    await updateUserSubscription(userId, { [field]: currentCount + 1 });
    return { allowed: true, remaining: -1 };
  }

  if (currentCount >= limit) return { allowed: false, remaining: 0 };

  const field = type === 'blog' ? 'blogCount' : 'imageAnalysisCount';
  await updateUserSubscription(userId, { [field]: currentCount + 1 });
  return { allowed: true, remaining: limit - currentCount - 1 };
}

// 토큰 사용량 확인 및 증가
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
  const subscription = await getUserSubscription(userId);
  if (!subscription) {
    return { allowed: false, remaining: 0, used: 0, limit: 0, dailyRemaining: 0, dailyUsed: 0, dailyLimit: 0 };
  }

  const plan = PLANS[subscription.currentPlan];
  const tokenLimit = plan.tokenLimit;
  const dailyTokenLimit = plan.dailyTokenLimit;
  const currentUsage = subscription.tokenUsage || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyResetDate = subscription.dailyTokenResetDate ? new Date(subscription.dailyTokenResetDate) : null;

  let dailyUsage = subscription.dailyTokenUsage || 0;

  if (!dailyResetDate || dailyResetDate < today) {
    dailyUsage = 0;
    await updateUserSubscription(userId, {
      dailyTokenUsage: 0,
      dailyTokenResetDate: today,
    });
  }

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

// 토큰 사용량 조회
export async function getTokenUsage(userId: string): Promise<{
  used: number;
  remaining: number;
  limit: number;
  dailyUsed: number;
  dailyRemaining: number;
  dailyLimit: number;
}> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return { used: 0, remaining: 0, limit: 0, dailyUsed: 0, dailyRemaining: 0, dailyLimit: 0 };

  const plan = PLANS[subscription.currentPlan];
  const tokenLimit = plan.tokenLimit;
  const dailyTokenLimit = plan.dailyTokenLimit;
  const currentUsage = subscription.tokenUsage || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyResetDate = subscription.dailyTokenResetDate ? new Date(subscription.dailyTokenResetDate) : null;
  let dailyUsage = subscription.dailyTokenUsage || 0;

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
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;
  return PLANS[subscription.currentPlan].scheduledPost;
}

// RAG 학습 기능 권한 확인
export async function canUseRagLearning(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;
  return PLANS[subscription.currentPlan].ragLearning;
}

// 사용량 리셋 (월간)
export async function resetMonthlyUsage(userId: string): Promise<void> {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await updateUserSubscription(userId, {
    blogCount: 0,
    imageAnalysisCount: 0,
    tokenUsage: 0,
    usageResetDate: nextMonth,
  });
}

// 구독 취소
export async function cancelSubscription(userId: string): Promise<void> {
  await updateUserSubscription(userId, { autoRenew: false });
}

// ==================== 유틸리티 ====================

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

// Helper: DB row → Payment
function mapPaymentRow(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    userId: row.user_id as string,
    paymentKey: row.payment_key as string | undefined,
    amount: row.amount as number,
    method: row.method as PaymentMethod | undefined,
    status: row.status as PaymentStatus,
    plan: row.plan as SubscriptionPlan,
    planName: row.plan_name as string,
    cancelReason: row.cancel_reason as string | undefined,
    cancelAmount: row.cancel_amount as number | undefined,
    tossResponse: row.toss_response as Record<string, unknown> | undefined,
    createdAt: new Date(row.created_at as string),
    approvedAt: row.approved_at ? new Date(row.approved_at as string) : undefined,
    canceledAt: row.canceled_at ? new Date(row.canceled_at as string) : undefined,
  };
}

// Helper: DB row → UserSubscription
function mapSubscriptionRow(row: Record<string, unknown>): UserSubscription {
  return {
    userId: row.user_id as string,
    currentPlan: row.current_plan as SubscriptionPlan,
    planStartDate: new Date(row.plan_start_date as string),
    planEndDate: new Date(row.plan_end_date as string),
    blogCount: (row.blog_count as number) || 0,
    imageAnalysisCount: (row.image_analysis_count as number) || 0,
    imageGenerationCount: (row.image_generation_count as number) || 0,
    dailyPaidImageGenerationCount: (row.daily_paid_image_generation_count as number) || 0,
    dailyImageGenerationResetDate: row.daily_image_generation_reset_date ? new Date(row.daily_image_generation_reset_date as string) : undefined,
    tokenUsage: (row.token_usage as number) || 0,
    dailyTokenUsage: (row.daily_token_usage as number) || 0,
    dailyTokenResetDate: row.daily_token_reset_date ? new Date(row.daily_token_reset_date as string) : undefined,
    usageResetDate: new Date(row.usage_reset_date as string),
    lastPaymentId: row.last_payment_id as string | undefined,
    nextPaymentDate: row.next_payment_date ? new Date(row.next_payment_date as string) : undefined,
    isActive: (row.is_active as boolean) ?? true,
    autoRenew: (row.auto_renew as boolean) ?? false,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
