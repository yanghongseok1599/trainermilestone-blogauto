import { createSupabaseBrowserClient } from './supabase-client';

const supabase = createSupabaseBrowserClient();

const DAILY_LIMIT = 3;
const ADMIN_USER_ID = 'admin-ccv5';

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
export async function checkAndIncrementUsage(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  if (userId === ADMIN_USER_ID) return { allowed: true, remaining: 999, limit: 999 };

  const today = getTodayString();
  const limit = DAILY_LIMIT;

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
export async function getUsageToday(userId: string): Promise<{ count: number; remaining: number; limit: number }> {
  if (userId === ADMIN_USER_ID) return { count: 0, remaining: 999, limit: 999 };

  const today = getTodayString();
  const limit = DAILY_LIMIT;

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
