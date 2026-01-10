import { FitnessCategory, SearchIntent } from './index';

// 글 유형
export type PostType =
  | 'center_intro'  // 센터 소개
  | 'equipment'     // 기구 소개
  | 'program'       // 프로그램 소개
  | 'trainer'       // 강사 소개
  | 'review';       // 회원 후기/변화

// 글 유형 정보
export const POST_TYPE_INFO: Record<PostType, {
  name: string;
  description: string;
  cycleDays: number;  // 권장 발행 주기 (일)
}> = {
  center_intro: {
    name: '센터 소개',
    description: '시설 변경, 시즌 이벤트 반영',
    cycleDays: 30,  // 월 1회
  },
  equipment: {
    name: '기구 소개',
    description: '스미스머신, 케이블머신 등 시리즈 콘텐츠',
    cycleDays: 7,   // 주 1회
  },
  program: {
    name: '프로그램 소개',
    description: '자세교정, 재활운동 등 심층 가이드',
    cycleDays: 7,   // 주 1회
  },
  trainer: {
    name: '강사 소개',
    description: '자격증, 경력, 전문 분야',
    cycleDays: 15,  // 월 2회
  },
  review: {
    name: '회원 후기',
    description: '비포애프터, 인터뷰',
    cycleDays: 7,   // 주 1회
  },
};

// 저장된 글
export interface SavedPost {
  id: string;
  title: string;
  content: string;
  category: FitnessCategory;
  postType: PostType;
  searchIntent: SearchIntent;
  mainKeyword: string;
  businessName: string;
  imagePrompts: { korean: string; english: string }[];
  createdAt: Date;
  updatedAt: Date;
}

// SEO 스케줄 항목
export interface SeoScheduleItem {
  lastPublished: Date | null;
  nextDue: Date | null;
}

// SEO 스케줄
export interface SeoSchedule {
  center_intro: SeoScheduleItem;
  equipment: SeoScheduleItem;
  program: SeoScheduleItem;
  trainer: SeoScheduleItem;
  review: SeoScheduleItem;
}

// 알림 상태
export type AlertStatus = 'overdue' | 'due_soon' | 'ok';

// SEO 알림
export interface SeoAlert {
  postType: PostType;
  status: AlertStatus;
  daysRemaining: number;  // 양수: 남은 일수, 음수: 지난 일수
  lastPublished: Date | null;
}

// 알림 상태 계산
export function calculateAlertStatus(daysRemaining: number): AlertStatus {
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= 2) return 'due_soon';
  return 'ok';
}

// 다음 발행일 계산
export function calculateNextDue(lastPublished: Date | null, cycleDays: number): Date {
  if (!lastPublished) {
    return new Date(); // 한 번도 발행하지 않았으면 오늘이 마감
  }
  const nextDue = new Date(lastPublished);
  nextDue.setDate(nextDue.getDate() + cycleDays);
  return nextDue;
}

// 남은 일수 계산
export function calculateDaysRemaining(nextDue: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(nextDue);
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
