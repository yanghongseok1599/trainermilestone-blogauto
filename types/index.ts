export type FitnessCategory =
  | '헬스장'
  | '필라테스'
  | 'PT샵'
  | '요가'
  | '크로스핏'
  | '복싱';

export type ApiProvider = 'gemini' | 'openai';

export type SearchIntent = 'information' | 'transaction' | 'navigation' | 'location';

export const SEARCH_INTENT_INFO: Record<SearchIntent, {
  name: string;
  description: string;
  strategy: string;
  iconName: 'BookOpen' | 'CreditCard' | 'Navigation' | 'MapPin';
}> = {
  information: {
    name: '정보형',
    description: '"알고 싶다" (예: 헬스장 효과, 운동 방법)',
    strategy: '서론 짧게, 정의/방법/리스트 형태로 핵심 요약',
    iconName: 'BookOpen'
  },
  transaction: {
    name: '거래형',
    description: '"하고 싶다/사고 싶다" (예: PT 등록, 회원권 구매)',
    strategy: '가격 비교표, 할인 정보, 등록 방법 최상단 배치',
    iconName: 'CreditCard'
  },
  navigation: {
    name: '이동형',
    description: '"가고 싶다" (예: 헬스장 위치, 찾아가는 법)',
    strategy: '구체적 경로, 주차 정보, 대중교통 안내',
    iconName: 'Navigation'
  },
  location: {
    name: '장소형',
    description: '"어디가 좋을까" (예: 강남 헬스장 추천)',
    strategy: '위치, 주차, 영업시간, 가격표 등 플레이스 정보 상세 정리',
    iconName: 'MapPin'
  }
};

export interface ImageData {
  id: string;
  file: File;
  dataUrl: string;
  base64: string;
  mimeType: string;
  analysis?: string;
}

export interface Preset {
  id: string;
  name: string;
  category: FitnessCategory;
  businessName: string;
  mainKeyword: string;
  subKeywords: string[];
  tailKeywords?: string[];
  targetAudience: string;
  uniquePoint: string;
  attributes: Record<string, string>;
  customAttributes?: string[];
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface AppState {
  // Step 관리
  currentStep: number;
  setCurrentStep: (step: number) => void;

  // API 설정
  apiProvider: ApiProvider;
  apiKey: string;
  setApiProvider: (provider: ApiProvider) => void;
  setApiKey: (key: string) => void;

  // 업체 정보
  category: FitnessCategory;
  businessName: string;
  mainKeyword: string;
  subKeywords: string[];
  tailKeywords: string[];
  setMainKeyword: (keyword: string) => void;
  setSubKeywords: (keywords: string[]) => void;
  setTailKeywords: (keywords: string[]) => void;
  targetAudience: string;
  uniquePoint: string;
  attributes: Record<string, string>;
  customAttributes: string[];
  setCategory: (category: FitnessCategory) => void;
  setBusinessInfo: (info: Partial<AppState>) => void;
  setAttribute: (key: string, value: string) => void;
  setAttributes: (attrs: Record<string, string>) => void;
  setPlaceInfo: (info: { category?: FitnessCategory; businessName?: string; mainKeyword?: string; attributes?: Record<string, string> }) => void;
  deleteAttribute: (key: string) => void;
  addCustomAttribute: (key: string) => void;
  removeCustomAttribute: (key: string) => void;
  setCustomAttributes: (attrs: string[]) => void;

  // 라벨 수정 & 속성 숨김
  attributeLabels: Record<string, string>;
  hiddenAttributes: string[];
  setAttributeLabel: (key: string, label: string) => void;
  hideAttribute: (key: string) => void;
  showAttribute: (key: string) => void;
  setHiddenAttributes: (attrs: string[]) => void;
  setAttributeLabels: (labels: Record<string, string>) => void;

  // 이미지
  images: ImageData[];
  imageAnalysisContext: string;
  addImage: (image: ImageData) => void;
  removeImage: (id: string) => void;
  updateImageAnalysis: (id: string, analysis: string) => void;
  setImageAnalysisContext: (context: string) => void;

  // 결과
  generatedContent: string;
  setGeneratedContent: (content: string) => void;

  // 검색 의도
  searchIntent: SearchIntent;
  setSearchIntent: (intent: SearchIntent) => void;

  // 페르소나 & 타겟
  writerPersona: string;
  targetReader: string;
  setWriterPersona: (persona: string) => void;
  setTargetReader: (target: string) => void;

  // 리셋
  reset: () => void;
}
