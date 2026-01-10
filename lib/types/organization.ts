// 조직/팀 관련 타입 정의

export type UserRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'pending' | 'approved' | 'rejected';

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
  // 조직 레벨 API 키 (암호화 저장)
  apiKeys?: {
    openai?: string;
    gemini?: string;
    naverClientId?: string;
    naverClientSecret?: string;
    naverAdsApiKey?: string;
    naverAdsSecretKey?: string;
    naverAdsCustomerId?: string;
  };
  // 초대 코드
  inviteCode?: string;
  inviteCodeExpiry?: string;
}

export interface OrganizationMember {
  id: string;
  odganizationId: string;
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  status: MemberStatus;
  invitedBy: string;
  invitedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface UserOrganization {
  organizationId: string;
  organizationName: string;
  role: UserRole;
  status: MemberStatus;
}

// Firestore에 저장될 확장된 사용자 정보
export interface ExtendedUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  organization?: UserOrganization;
  createdAt: string;
  updatedAt: string;
}
