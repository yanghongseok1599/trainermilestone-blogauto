// 결제 상태
export type PaymentStatus =
  | 'PENDING'      // 결제 대기
  | 'DONE'         // 결제 완료
  | 'CANCELED'     // 결제 취소
  | 'PARTIAL_CANCELED' // 부분 취소
  | 'FAILED'       // 결제 실패
  | 'EXPIRED';     // 결제 만료

// 결제 수단
export type PaymentMethod =
  | 'CARD'         // 카드
  | 'VIRTUAL_ACCOUNT' // 가상계좌
  | 'TRANSFER'     // 계좌이체
  | 'MOBILE'       // 휴대폰
  | 'EASY_PAY';    // 간편결제

// 구독 플랜
export type SubscriptionPlan =
  | 'FREE'         // 무료
  | 'STARTER'      // 스타터 (월 49,000원)
  | 'PRO'          // 프로 (월 99,000원)
  | 'BUSINESS'     // 비즈니스 (월 189,000원)
  | 'BETA';        // 베타 (3개월 무료, PRO 기능)

// 플랜 정보
export interface PlanInfo {
  id: SubscriptionPlan;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  features: string[];
  blogLimit: number;           // 월 블로그 생성 제한
  presetLimit: number;         // 프리셋 저장 제한
  imageLimit: number;          // 이미지 분석 제한
  imageGenerationLimit: number;      // 월 이미지 생성 제한 (유료 모델)
  dailyImageGenerationLimit: number; // 일일 이미지 생성 제한 (전체)
  dailyPaidImageGenerationLimit: number; // 일일 유료 모델 이미지 생성 제한
  tokenLimit: number;          // 월 토큰 제한
  dailyTokenLimit: number;     // 일일 토큰 제한
  scheduledPost: boolean;      // 예약 발행 기능
  teamMembers: number;         // 팀 멤버 수
  ragLearning: boolean;        // RAG 상위노출 학습 기능
}

// 플랜 설정
export const PLANS: Record<SubscriptionPlan, PlanInfo> = {
  FREE: {
    id: 'FREE',
    name: '무료',
    price: 0,
    period: 'monthly',
    features: [
      '월 3회 블로그 생성',
      '프리셋 3개 저장',
      '키워드 분석 3회/일',
      '월 50,000 토큰',
      '일 10,000 토큰',
    ],
    blogLimit: 3,
    presetLimit: 3,
    imageLimit: 3,
    imageGenerationLimit: 0,
    dailyImageGenerationLimit: 0,
    dailyPaidImageGenerationLimit: 0,
    tokenLimit: 50000,
    dailyTokenLimit: 10000,
    scheduledPost: false,
    teamMembers: 1,
    ragLearning: false,
  },
  STARTER: {
    id: 'STARTER',
    name: '스타터',
    price: 49000,
    period: 'monthly',
    features: [
      '월 20회 블로그 생성',
      '프리셋 10개 저장',
      '이미지 분석 20회/월',
      'AI 이미지 생성 50장/월 (유료 5장/일)',
      '비포애프터 에디터',
      '월 300,000 토큰',
      '일 30,000 토큰',
    ],
    blogLimit: 20,
    presetLimit: 10,
    imageLimit: 20,
    imageGenerationLimit: 50,
    dailyImageGenerationLimit: 5,
    dailyPaidImageGenerationLimit: 5,
    tokenLimit: 300000,
    dailyTokenLimit: 30000,
    scheduledPost: false,
    teamMembers: 1,
    ragLearning: false,
  },
  PRO: {
    id: 'PRO',
    name: '프로',
    price: 99000,
    period: 'monthly',
    features: [
      '월 100회 블로그 생성',
      '프리셋 무제한 저장',
      '상위노출 블로그 학습',
      '예약 발행 기능',
      '팀 협업 (1명)',
      '커스텀 프롬프트',
      'AI 이미지 생성 200장/월 (유료 5장/일 + 무료 25장/일)',
      '월 1,000,000 토큰',
      '일 100,000 토큰',
    ],
    blogLimit: 100,
    presetLimit: -1,
    imageLimit: -1,
    imageGenerationLimit: 200,
    dailyImageGenerationLimit: 30,
    dailyPaidImageGenerationLimit: 5,
    tokenLimit: 1000000,
    dailyTokenLimit: 100000,
    scheduledPost: true,
    teamMembers: 1,
    ragLearning: true,
  },
  BUSINESS: {
    id: 'BUSINESS',
    name: '비즈니스',
    price: 189000,
    period: 'monthly',
    features: [
      '무제한 블로그 생성',
      '모든 PRO 기능',
      '팀 협업 (3명)',
      '우선 지원',
      '전용 프롬프트 튜닝',
      'AI 이미지 생성 500장/월 (유료 10장/일 + 무료 40장/일)',
      '월 3,000,000 토큰',
      '일 300,000 토큰',
    ],
    blogLimit: -1,
    presetLimit: -1,
    imageLimit: -1,
    imageGenerationLimit: 500,
    dailyImageGenerationLimit: 50,
    dailyPaidImageGenerationLimit: 10,
    tokenLimit: 3000000,
    dailyTokenLimit: 300000,
    scheduledPost: true,
    teamMembers: 3,
    ragLearning: true,
  },
  BETA: {
    id: 'BETA',
    name: '베타',
    price: 0,
    period: 'monthly',
    features: [
      '월 100회 블로그 생성',
      '프리셋 무제한 저장',
      '상위노출 블로그 학습',
      '예약 발행 기능',
      '커스텀 프롬프트',
      'AI 이미지 생성 30장/월 (유료 2장/일 + 무료 4장/일)',
      '월 1,000,000 토큰',
      '일 100,000 토큰',
      '3개월 무료 체험',
    ],
    blogLimit: 100,
    presetLimit: -1,
    imageLimit: -1,
    imageGenerationLimit: 30,
    dailyImageGenerationLimit: 6,
    dailyPaidImageGenerationLimit: 2,
    tokenLimit: 1000000,
    dailyTokenLimit: 100000,
    scheduledPost: true,
    teamMembers: 1,
    ragLearning: true,
  },
};

// 결제 정보 (Firestore 저장용)
export interface Payment {
  id: string;                    // 결제 고유 ID
  oderId: string;               // 주문 ID (토스 orderId)
  userId: string;                // 사용자 ID
  paymentKey?: string;           // 토스 paymentKey

  // 결제 정보
  amount: number;                // 결제 금액
  method?: PaymentMethod;        // 결제 수단
  status: PaymentStatus;         // 결제 상태

  // 상품 정보
  plan: SubscriptionPlan;        // 구독 플랜
  planName: string;              // 플랜 이름

  // 시간 정보
  createdAt: Date;               // 생성 시간
  approvedAt?: Date;             // 승인 시간
  canceledAt?: Date;             // 취소 시간

  // 취소 정보
  cancelReason?: string;         // 취소 사유
  cancelAmount?: number;         // 취소 금액

  // 토스 응답 원본
  tossResponse?: Record<string, unknown>;
}

// 사용자 구독 정보
export interface UserSubscription {
  oderId: string;                // 사용자 ID

  // 현재 플랜
  currentPlan: SubscriptionPlan;
  planStartDate: Date;           // 플랜 시작일
  planEndDate: Date;             // 플랜 종료일

  // 사용량
  blogCount: number;             // 이번 달 블로그 생성 횟수
  imageAnalysisCount: number;    // 이번 달 이미지 분석 횟수
  imageGenerationCount: number;       // 이번 달 유료 이미지 생성 횟수
  dailyImageGenerationCount: number;  // 오늘 전체 이미지 생성 횟수
  dailyPaidImageGenerationCount: number; // 오늘 유료 모델 이미지 생성 횟수
  dailyImageGenerationResetDate: Date; // 일일 이미지 생성 리셋 날짜
  tokenUsage: number;            // 이번 달 토큰 사용량
  dailyTokenUsage: number;       // 오늘 토큰 사용량
  dailyTokenResetDate: Date;     // 일일 토큰 리셋 날짜
  usageResetDate: Date;          // 월간 사용량 리셋 날짜

  // 결제 정보
  lastPaymentId?: string;        // 마지막 결제 ID
  nextPaymentDate?: Date;        // 다음 결제 예정일

  // 상태
  isActive: boolean;             // 구독 활성화 여부
  autoRenew: boolean;            // 자동 갱신 여부

  createdAt: Date;
  updatedAt: Date;
}

// 결제 요청 데이터
export interface PaymentRequest {
  orderId: string;
  amount: number;
  orderName: string;
  customerName: string;
  customerEmail: string;
  plan: SubscriptionPlan;
}

// 결제 승인 요청
export interface PaymentApprovalRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

// 결제 취소 요청
export interface PaymentCancelRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number;
}
