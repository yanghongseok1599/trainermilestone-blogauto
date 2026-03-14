import { createSupabaseBrowserClient } from './supabase-client';

const supabase = createSupabaseBrowserClient();

export type ActivityType =
  | 'login'
  | 'keyword_search'
  | 'blog_generate'
  | 'image_generate'
  | 'preset_save'
  | 'plan_change'
  | 'payment'
  | 'seo_schedule';

export interface ActivityRecord {
  type: ActivityType;
  description: string;
  timestamp: Date;
  metadata?: Record<string, string | number>;
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  login: '로그인',
  keyword_search: '키워드 검색',
  blog_generate: '블로그 생성',
  image_generate: '이미지 생성',
  preset_save: '프리셋 저장',
  plan_change: '요금제 변경',
  payment: '결제',
  seo_schedule: 'SEO 스케줄',
};

/**
 * 사용자 활동 기록 저장
 */
export async function logActivity(
  userId: string,
  type: ActivityType,
  description: string,
  metadata?: Record<string, string | number>
): Promise<void> {
  if (!userId || userId === 'admin-ccv5') return;

  try {
    await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        type,
        description,
        metadata: metadata || {},
      });

    // 오래된 기록 정리 (30개 초과 시)
    const { data: allLogs } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (allLogs && allLogs.length > 30) {
      const idsToDelete = allLogs.slice(0, allLogs.length - 30).map((l: { id: string }) => l.id);
      await supabase
        .from('activity_logs')
        .delete()
        .in('id', idsToDelete);
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * 사용자 활동 기록 조회
 */
export async function getActivityLog(userId: string): Promise<ActivityRecord[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) return [];

    return data.map((r: { type: string; description: string; created_at: string; metadata?: Record<string, string | number> }) => ({
      type: r.type as ActivityType,
      description: r.description,
      timestamp: new Date(r.created_at),
      metadata: r.metadata,
    }));
  } catch (error) {
    console.error('Failed to get activity log:', error);
    return [];
  }
}

export { ACTIVITY_LABELS };
