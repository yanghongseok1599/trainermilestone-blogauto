import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export type ActivityType =
  | 'login'           // 로그인
  | 'keyword_search'  // 키워드 검색
  | 'blog_generate'   // 블로그 생성
  | 'image_generate'  // 이미지 생성
  | 'preset_save'     // 프리셋 저장
  | 'plan_change'     // 요금제 변경
  | 'payment'         // 결제
  | 'seo_schedule';   // SEO 스케줄 설정

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
 * 사용자 활동 기록 저장 (최근 30개 유지)
 */
export async function logActivity(
  userId: string,
  type: ActivityType,
  description: string,
  metadata?: Record<string, string | number>
): Promise<void> {
  if (!db || !userId || userId === 'admin-ccv5') return;

  try {
    const activityRef = doc(db, 'users', userId, 'activity', 'log');
    const snap = await getDoc(activityRef);

    const newRecord = {
      type,
      description,
      timestamp: Timestamp.fromDate(new Date()),
      metadata: metadata || {},
    };

    let records: any[] = [];
    if (snap.exists()) {
      records = snap.data().records || [];
    }

    records.push(newRecord);
    // 최근 30개만 유지
    if (records.length > 30) {
      records = records.slice(-30);
    }

    await setDoc(activityRef, { records, updatedAt: Timestamp.fromDate(new Date()) });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * 사용자 활동 기록 조회
 */
export async function getActivityLog(userId: string): Promise<ActivityRecord[]> {
  if (!db || !userId) return [];

  try {
    const activityRef = doc(db, 'users', userId, 'activity', 'log');
    const snap = await getDoc(activityRef);

    if (!snap.exists()) return [];

    const records = snap.data().records || [];
    return records.map((r: any) => ({
      type: r.type,
      description: r.description,
      timestamp: r.timestamp instanceof Timestamp ? r.timestamp.toDate() : new Date(r.timestamp),
      metadata: r.metadata,
    })).reverse(); // 최신순
  } catch (error) {
    console.error('Failed to get activity log:', error);
    return [];
  }
}

export { ACTIVITY_LABELS };
