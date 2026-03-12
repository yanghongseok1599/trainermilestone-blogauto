import { createSupabaseBrowserClient } from './supabase-client';

const supabase = createSupabaseBrowserClient();

const DAILY_LIMIT = 3;
const ADMIN_USER_ID = 'admin-ccv5';

// 임시 키워드 검색 제한 해제 목록 (만료일 이후 자동 무효)
const TEMPORARY_LIMIT_OVERRIDES: Record<string, { limit: number; expiresAt: string }> = {
  'dytpq1019@gmail.com': { limit: 100, expiresAt: '2026-03-15' }, // 이번 주 일요일까지
};

function getDailyLimit(userId: string, email?: string): number {
  if (email) {
    const override = TEMPORARY_LIMIT_OVERRIDES[email];
    if (override && new Date() <= new Date(override.expiresAt + 'T23:59:59')) {
      return override.limit;
    }
  }
  return DAILY_LIMIT;
}

export interface UsageRecord {
  userId: string;
  date: string;
  count: number;
  lastUsed: Date;
}

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 사용량 확인 및 증가
 */
export async function checkAndIncrementUsage(userId: string, email?: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  if (userId === ADMIN_USER_ID) return { allowed: true, remaining: 999, limit: 999 };

  const today = getTodayString();
  const limit = getDailyLimit(userId, email);

  try {
    const { data: existing } = await supabase
      .from('keyword_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (!existing) {
      // 오늘 첫 사용
      await supabase
        .from('keyword_usage')
        .insert({
          user_id: userId,
          date: today,
          count: 1,
        });
      return { allowed: true, remaining: limit - 1, limit };
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, limit };
    }

    // 사용량 증가
    await supabase
      .from('keyword_usage')
      .update({
        count: existing.count + 1,
        last_used: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('date', today);

    return { allowed: true, remaining: limit - existing.count - 1, limit };
  } catch (error) {
    console.error('Usage check error:', error);
    throw error;
  }
}

/**
 * 현재 사용량 조회
 */
export async function getUsageToday(userId: string, email?: string): Promise<{ count: number; remaining: number; limit: number }> {
  if (userId === ADMIN_USER_ID) return { count: 0, remaining: 999, limit: 999 };

  const today = getTodayString();
  const limit = getDailyLimit(userId, email);

  try {
    const { data } = await supabase
      .from('keyword_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (!data) {
      return { count: 0, remaining: limit, limit };
    }

    return { count: data.count, remaining: Math.max(0, limit - data.count), limit };
  } catch (error) {
    console.error('Usage get error:', error);
    throw error;
  }
}
