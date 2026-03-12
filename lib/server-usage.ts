import { supabaseAdmin } from './supabase-admin';
import { PLANS, SubscriptionPlan } from '@/types/payment';

// 무료 모델 ID 목록
const FREE_MODELS = ['gemini-2.5-flash-image'];

// 관리자 userId (무제한 이용)
const ADMIN_USER_ID = 'admin-ccv5';

/**
 * 서버에서 사용자 구독 정보를 조회
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSubscription(userId: string): Promise<Record<string, any> | null> {
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // 기본 무료 구독 생성
    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    const defaultSub = {
      user_id: userId,
      current_plan: 'FREE' as SubscriptionPlan,
      plan_start_date: now.toISOString(),
      plan_end_date: endDate.toISOString(),
      blog_count: 0,
      image_analysis_count: 0,
      image_generation_count: 0,
      daily_paid_image_generation_count: 0,
      daily_image_generation_reset_date: now.toISOString(),
      token_usage: 0,
      daily_token_usage: 0,
      daily_token_reset_date: now.toISOString(),
      usage_reset_date: endDate.toISOString(),
      is_active: true,
      auto_renew: false,
    };

    const { data: newSub } = await supabaseAdmin
      .from('subscriptions')
      .upsert(defaultSub, { onConflict: 'user_id' })
      .select()
      .single();

    return newSub || defaultSub;
  }

  return data;
}

/**
 * 이미지 생성 사용량 체크 및 증가 (서버 전용)
 */
export async function checkAndIncrementImageUsage(
  userId: string,
  model: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (userId === ADMIN_USER_ID) return { allowed: true };

  const sub = await getSubscription(userId);
  if (!sub) return { allowed: false, reason: '구독 정보 없음' };

  const plan = PLANS[sub.current_plan as SubscriptionPlan];
  const isFreeModel = FREE_MODELS.includes(model);

  // 일일 리셋 체크
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resetDate = sub.daily_image_generation_reset_date
    ? new Date(sub.daily_image_generation_reset_date)
    : null;

  let dailyPaidCount = sub.daily_paid_image_generation_count || 0;
  const needsReset = !resetDate || resetDate < today;

  if (needsReset) {
    dailyPaidCount = 0;
  }

  if (isFreeModel) {
    return { allowed: true };
  }

  // 유료 모델
  const monthlyCount = sub.image_generation_count || 0;

  if (plan.imageGenerationLimit === 0) {
    return { allowed: false, reason: '현재 플랜에서는 유료 모델 사용이 지원되지 않습니다' };
  }

  if (monthlyCount >= plan.imageGenerationLimit) {
    return { allowed: false, reason: `월간 유료 이미지 한도(${plan.imageGenerationLimit}장)를 초과했습니다` };
  }

  if (dailyPaidCount >= plan.dailyPaidImageGenerationLimit) {
    return { allowed: false, reason: `일일 유료 모델 한도(${plan.dailyPaidImageGenerationLimit}장)를 초과했습니다` };
  }

  // 카운트 증가
  const updateData: Record<string, unknown> = {
    image_generation_count: monthlyCount + 1,
    daily_paid_image_generation_count: dailyPaidCount + 1,
  };
  if (needsReset) {
    updateData.daily_image_generation_reset_date = today.toISOString();
  }

  await supabaseAdmin
    .from('subscriptions')
    .update(updateData)
    .eq('user_id', userId);

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

  const sub = await getSubscription(userId);
  if (!sub) return { allowed: false, reason: '구독 정보 없음' };

  const plan = PLANS[sub.current_plan as SubscriptionPlan];
  const currentUsage = sub.token_usage || 0;

  // 일일 리셋 체크
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyResetDate = sub.daily_token_reset_date
    ? new Date(sub.daily_token_reset_date)
    : null;

  let dailyUsage = sub.daily_token_usage || 0;
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
  const updateData: Record<string, unknown> = {
    token_usage: currentUsage + tokensUsed,
    daily_token_usage: dailyUsage + tokensUsed,
  };
  if (needsReset) {
    updateData.daily_token_reset_date = today.toISOString();
  }

  await supabaseAdmin
    .from('subscriptions')
    .update(updateData)
    .eq('user_id', userId);

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

  const sub = await getSubscription(userId);
  if (!sub) return { allowed: false, reason: '구독 정보 없음' };

  const plan = PLANS[sub.current_plan as SubscriptionPlan];
  const limit = type === 'blog' ? plan.blogLimit : plan.imageLimit;
  const field = type === 'blog' ? 'blog_count' : 'image_analysis_count';
  const currentCount = sub[field] || 0;

  if (limit === -1) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ [field]: currentCount + 1 })
      .eq('user_id', userId);
    return { allowed: true };
  }

  if (currentCount >= limit) {
    const label = type === 'blog' ? '블로그 생성' : '이미지 분석';
    return { allowed: false, reason: `월간 ${label} 한도(${limit}회)를 초과했습니다` };
  }

  await supabaseAdmin
    .from('subscriptions')
    .update({ [field]: currentCount + 1 })
    .eq('user_id', userId);

  return { allowed: true };
}
