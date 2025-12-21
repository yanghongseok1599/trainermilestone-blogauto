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
  | 'BASIC'        // 기본 (월 9,900원)
  | 'PRO'          // 프로 (월 29,900원)
  | 'ENTERPRISE';  // 엔터프라이즈 (문의)

// 플랜 정보
export interface PlanInfo {
  id: SubscriptionPlan;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  features: string[];
  blogLimit: number;      // 월 블로그 생성 제한
  presetLimit: number;    // 프리셋 저장 제한
  imageLimit: number;     // 이미지 분석 제한
}

// 플랜 설정
export const PLANS: Record<SubscriptionPlan, PlanInfo> = {
  FREE: {
    id: 'FREE',
    name: '무료',
    price: 0,
    period: 'monthly',
    features: [
      '월 5회 블로그 생성',
      '프리셋 3개 저장',
      '이미지 분석 5회/월',
    ],
    blogLimit: 5,
    presetLimit: 3,
    imageLimit: 5,
  },
  BASIC: {
    id: 'BASIC',
    name: '베이직',
    price: 9900,
    period: 'monthly',
    features: [
      '월 30회 블로그 생성',
      '프리셋 10개 저장',
      '이미지 분석 30회/월',
      '이메일 지원',
    ],
    blogLimit: 30,
    presetLimit: 10,
    imageLimit: 30,
  },
  PRO: {
    id: 'PRO',
    name: '프로',
    price: 29900,
    period: 'monthly',
    features: [
      '무제한 블로그 생성',
      '프리셋 무제한 저장',
      '이미지 분석 무제한',
      '우선 지원',
      '커스텀 프롬프트',
    ],
    blogLimit: -1, // -1 = unlimited
    presetLimit: -1,
    imageLimit: -1,
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: '엔터프라이즈',
    price: 0, // 문의
    period: 'monthly',
    features: [
      '모든 PRO 기능',
      '전담 매니저',
      'API 제공',
      '맞춤 교육',
    ],
    blogLimit: -1,
    presetLimit: -1,
    imageLimit: -1,
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
  usageResetDate: Date;          // 사용량 리셋 날짜

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
