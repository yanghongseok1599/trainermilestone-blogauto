import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

const DAILY_LIMIT = 3;
const ADMIN_USER_ID = 'admin-ccv5';

export interface UsageRecord {
  userId: string;
  date: string; // YYYY-MM-DD format
  count: number;
  lastUsed: Date;
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 사용량 확인 및 증가
 * @returns { allowed: boolean, remaining: number }
 */
export async function checkAndIncrementUsage(userId: string): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  if (userId === ADMIN_USER_ID) return { allowed: true, remaining: 999, limit: 999 };

  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const today = getTodayString();
  const usageRef = doc(db, 'keyword_usage', `${userId}_${today}`);

  try {
    const usageDoc = await getDoc(usageRef);

    if (!usageDoc.exists()) {
      // 오늘 첫 사용
      await setDoc(usageRef, {
        userId,
        date: today,
        count: 1,
        lastUsed: serverTimestamp(),
      });
      return { allowed: true, remaining: DAILY_LIMIT - 1, limit: DAILY_LIMIT };
    }

    const data = usageDoc.data() as UsageRecord;

    if (data.count >= DAILY_LIMIT) {
      // 한도 초과
      return { allowed: false, remaining: 0, limit: DAILY_LIMIT };
    }

    // 사용량 증가
    await updateDoc(usageRef, {
      count: increment(1),
      lastUsed: serverTimestamp(),
    });

    return { allowed: true, remaining: DAILY_LIMIT - data.count - 1, limit: DAILY_LIMIT };
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

  if (!db) {
    throw new Error('Firestore not initialized');
  }

  const today = getTodayString();
  const usageRef = doc(db, 'keyword_usage', `${userId}_${today}`);

  try {
    const usageDoc = await getDoc(usageRef);

    if (!usageDoc.exists()) {
      return { count: 0, remaining: DAILY_LIMIT, limit: DAILY_LIMIT };
    }

    const data = usageDoc.data() as UsageRecord;
    return { count: data.count, remaining: Math.max(0, DAILY_LIMIT - data.count), limit: DAILY_LIMIT };
  } catch (error) {
    console.error('Usage get error:', error);
    throw error;
  }
}
