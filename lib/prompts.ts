/**
 * FBAS 2026 프롬프트 생성기 v2 (안정화 버전)
 *
 * 주요 개선사항:
 * 1. 프롬프트 내부 이모지/마크다운 완전 제거
 * 2. 사실성 가드레일 최상단 배치
 * 3. 비율 강제 → 필수 요소 개수로 변경
 * 4. 고정 수치 예시 → 자리표시자 템플릿으로 교체
 * 5. 요약 정보 조건부 출력
 * 6. 첫 문단 공식 유형별 고정
 * 7. 의료 정보 면책 규칙 추가
 * 8. facts 영역으로 사실 데이터 분리
 */

import { AppState, SearchIntent, LearningResult, ImageAnalysisResult } from '@/types';

// ============================================================
// 타입 정의
// ============================================================

export type ContentType =
  | 'center_intro'      // 센터 소개형
  | 'customer_story'    // 고객 경험 서사형
  | 'exercise_info'     // 운동 정보형
  | 'medical_info'      // 전문 정보형
  | 'event_review'      // 행사/프로젝트형
  | 'staff_intro'       // 트레이너 소개형
  | 'promotion';        // 프로모션형

export type WriterPerspective =
  | 'owner'      // 대표자
  | 'manager'    // 센터장
  | 'trainer'    // 트레이너
  | 'fc';        // FC

// 사실 데이터 (이 영역에 있는 값만 사실로 작성)
export interface Facts {
  address?: string;           // 주소
  hours?: string;             // 영업시간
  parking?: string;           // 주차 정보
  priceTable?: string;        // 가격표
  areaPyeong?: string;        // 평수
  machinesCount?: string;     // 기구 수
  trainerCerts?: string;      // 트레이너 자격증
  programList?: string;       // 프로그램 목록
  memberBefore?: string;      // 회원 전 상태 (수치)
  memberAfter?: string;       // 회원 후 상태 (수치)
  eventPeriod?: string;       // 이벤트 기간
  eventBenefit?: string;      // 이벤트 혜택
}

export interface ContentState {
  businessName: string;
  location: string;
  mainKeyword: string;
  subKeywords: string[];
  contentType: ContentType;
  writerPerspective: WriterPerspective;
  targetAudience?: string;
  uniquePoint?: string;
  customTitle?: string;

  // 사실 데이터 (필수!)
  facts: Facts;

  // 고객 스토리용
  customerStory?: {
    customerProfile: string;
    duration: string;
    initialProblem: string;
    trainerFeedback: string;
    hardMoment: string;
    changePoint: string;
  };

  // 직원 소개용
  staffInfo?: {
    name: string;
    position: string;
    career: string;
    specialty: string;
    philosophy: string;
  };
}

// ============================================================
// 글 유형별 정보
// ============================================================

export const CONTENT_TYPE_INFO: Record<ContentType, {
  name: string;
  experienceElements: number;  // 필수 경험 요소 개수
  infoElements: number;        // 필수 정보 요소 개수
}> = {
  center_intro: {
    name: '센터 소개형',
    experienceElements: 3,
    infoElements: 4,
  },
  customer_story: {
    name: '고객 경험 서사형',
    experienceElements: 5,
    infoElements: 2,
  },
  exercise_info: {
    name: '운동 정보형',
    experienceElements: 2,
    infoElements: 4,
  },
  medical_info: {
    name: '전문 정보형',
    experienceElements: 2,
    infoElements: 5,
  },
  event_review: {
    name: '행사/프로젝트형',
    experienceElements: 4,
    infoElements: 3,
  },
  staff_intro: {
    name: '트레이너 소개형',
    experienceElements: 4,
    infoElements: 3,
  },
  promotion: {
    name: '프로모션형',
    experienceElements: 2,
    infoElements: 4,
  },
};

// ============================================================
// 시점별 말투
// ============================================================

export const PERSPECTIVE_GUIDE: Record<WriterPerspective, {
  name: string;
  tone: string;
  firstPerson: string;
}> = {
  owner: {
    name: '대표자',
    tone: '센터의 비전과 철학을 담아 따뜻하고 진정성 있게',
    firstPerson: '저희 센터 / 제가 이 센터를 만들 때',
  },
  manager: {
    name: '센터장',
    tone: '현장을 가장 잘 아는 관리자로서 실질적이고 구체적으로',
    firstPerson: '저희 센터 / 제가 현장에서 보면',
  },
  trainer: {
    name: '트레이너',
    tone: '전문가로서 회원 변화를 함께한 경험을 생생하게',
    firstPerson: '제가 담당한 회원분 / 저는 트레이너로서',
  },
  fc: {
    name: 'FC(상담사)',
    tone: '상담 경험을 바탕으로 고객 니즈를 잘 아는 따뜻한 안내자',
    firstPerson: '상담하다 보면 / 저희 센터를 찾아주시는 분들',
  },
};

// ============================================================
// 첫 문단 공식 (유형별 고정 슬롯)
// ============================================================

const FIRST_PARAGRAPH_FORMULA: Record<ContentType, string> = {
  center_intro: `
【첫 문단 공식 - 3문장 필수】
1문장: 이 센터가 어떤 사람에게 맞는지 (결론)
2문장: 다른 곳과 다른 차별점 1가지
3문장: 방문 전 알면 좋은 것 1가지`,

  customer_story: `
【첫 문단 공식 - 3문장 필수】
1문장: 회원 프로필 (OO대 OO, OO 고민)
2문장: 처음 왔을 때 상태 (facts에 있는 수치 사용)
3문장: 지금은 어떻게 달라졌는지 (결론 먼저)`,

  exercise_info: `
【첫 문단 공식 - 3문장 필수】
1문장: 이 운동이 필요한 사람 (타겟 명시)
2문장: 흔히 하는 실수 1가지
3문장: 오늘 알려줄 핵심 해결법`,

  medical_info: `
【첫 문단 공식 - 3문장 필수】
1문장: 이 증상에 대한 흔한 오해 1가지
2문장: 실제 메커니즘 간략히
3문장: 운동으로 접근하는 방법 예고`,

  event_review: `
【첫 문단 공식 - 3문장 필수】
1문장: 행사/프로젝트 이름과 결과 (숫자 포함)
2문장: 기획하게 된 계기 1가지
3문장: 참여자 반응 한마디 (직접 인용)`,

  staff_intro: `
【첫 문단 공식 - 3문장 필수】
1문장: 트레이너 이름과 전문 분야
2문장: 이 일을 하게 된 계기 한마디
3문장: 어떤 분들이 찾아오시는지`,

  promotion: `
【첫 문단 공식 - 3문장 필수】
1문장: 핵심 혜택 (가장 매력적인 것)
2문장: 대상과 기간
3문장: 신청 방법 (바로 행동 가능하게)`,
};

// ============================================================
// 메인 프롬프트 생성 함수
// ============================================================

export function generateFBAS2026Prompt(state: ContentState): string {
  const contentInfo = CONTENT_TYPE_INFO[state.contentType];
  const perspective = PERSPECTIVE_GUIDE[state.writerPerspective];
  const firstParaFormula = FIRST_PARAGRAPH_FORMULA[state.contentType];

  // facts 정리
  const factsSection = buildFactsSection(state.facts);

  // 조건부 요약 정보
  const summarySection = buildSummarySection(state);

  return `당신은 2026년 네이버 알고리즘에 최적화된 피트니스 블로그 전문 작가입니다.

────────────────────────────────
【최우선 규칙: 사실성 가드레일】
────────────────────────────────

아래 규칙을 어기면 전체 글이 무효 처리됩니다.

1. 주소, 영업시간, 주차요금, 가격, 평수, 기구 수, 할인율, 자격증, 전후 수치 등 사실 데이터는 아래 【입력된 사실 정보】에 있을 때만 작성합니다.

2. 【입력된 사실 정보】에 없는 항목은 임의로 생성하지 않고, 해당 위치에 "상담 시 안내" 또는 "방문 시 확인"으로 표기합니다.

3. 임의 수치, 임의 후기, 임의 의학적 단정은 절대 금지입니다.

4. 회원 후기를 작성할 때, 【입력된 사실 정보】의 전후 수치가 없으면 구체적 숫자 대신 "눈에 띄는 변화", "확실히 달라진 느낌" 등 정성적 표현을 사용합니다.

────────────────────────────────
【입력된 사실 정보】 - 이 값만 사실로 작성 가능
────────────────────────────────
${factsSection}

────────────────────────────────
【기본 정보】
────────────────────────────────

업체명: ${state.businessName}
위치: ${state.location}
메인 키워드: ${state.mainKeyword}
보조 키워드: ${state.subKeywords.filter(k => k).join(', ') || '없음'}
글 유형: ${contentInfo.name}
글쓴이 시점: ${perspective.name}
${state.targetAudience ? `타겟 독자: ${state.targetAudience}` : ''}
${state.uniquePoint ? `핵심 차별점: ${state.uniquePoint}` : ''}
${state.customTitle ? `지정 제목: ${state.customTitle}` : ''}

${state.customerStory ? buildCustomerStorySection(state.customerStory) : ''}
${state.staffInfo ? buildStaffSection(state.staffInfo) : ''}

────────────────────────────────
【글쓴이 시점: ${perspective.name}】
────────────────────────────────

말투: ${perspective.tone}
1인칭: ${perspective.firstPerson}

────────────────────────────────
【필수 요소 개수】 - 비율 대신 개수로 체크
────────────────────────────────

경험 서사 요소 ${contentInfo.experienceElements}개 필수:
- 실제 상황 묘사 (언제, 어디서, 누가)
- 직접 인용 ("OOO라고 하셨어요")
- 감정/갈등 (힘들었던 순간, 고민)
- 전환점 (변화가 느껴진 순간)
- 결과/깨달음

정보 요소 ${contentInfo.infoElements}개 필수:
- 프로그램/서비스 설명
- 이용 흐름/절차
- 시설/장비 안내
- 문의/예약 방법
- 가격/혜택 (facts에 있을 때만)

────────────────────────────────
${firstParaFormula}
────────────────────────────────

────────────────────────────────
【${contentInfo.name} 본문 구조】
────────────────────────────────
${getContentStructure(state.contentType)}

${state.contentType === 'medical_info' ? `
────────────────────────────────
【의료 정보 면책 규칙】
────────────────────────────────

1. "치료", "완치", "100% 개선" 등 의학적 단정 표현 금지
2. "OO에 효과적입니다" 대신 "OO에 도움이 될 수 있습니다" 사용
3. 글 마지막에 반드시 포함: "통증이 심하거나 지속되면 전문 의료기관 상담을 권장합니다"
` : ''}

────────────────────────────────
【출력 규칙 3가지】
────────────────────────────────

1. 마크다운 금지: ** / ## / 이모지 절대 사용 금지
2. 인사말 금지: "안녕하세요" 없이 바로 본론 시작
3. 【섹션제목】 형식 + ──────────────────────────────── 구분선 사용

────────────────────────────────
【출력 형식】
────────────────────────────────

${state.customTitle ? `【제목】\n${state.customTitle}` : `【제목 후보 3개】
- 지역 + 핵심 키워드 + 구체적 결과
- 타겟 + 기간 + 변화
- 질문형 또는 숫자 포함형`}

────────────────────────────────

【첫 문단】
(위 첫 문단 공식대로 3문장)

[이미지: 대표 사진 - 구체적 설명]

────────────────────────────────

(본문 섹션들 - 섹션당 이미지 1개씩)

────────────────────────────────

${summarySection}

────────────────────────────────
【자리표시자 예시】 - 이 형식으로 작성하되, 값은 facts 기반으로
────────────────────────────────

${getPlaceholderExample(state.contentType, state.writerPerspective)}

────────────────────────────────
【최종 검수 체크 5가지】
────────────────────────────────

글 완성 후 아래 5가지를 확인하세요:

1. 첫 문단 3문장 안에 결론/핵심이 있는가?
2. 과장/단정 표현("최고", "완치", "100%")이 없는가?
3. facts에 없는 수치/정보가 생성되지 않았는가?
4. 섹션이 최소 5개 이상인가?
5. 문의/예약 유도(CTA)가 1개 이상 있는가?

────────────────────────────────

2500자 이상 작성.
이미지는 섹션당 1개씩 자연스럽게 배치.`;
}

// ============================================================
// 헬퍼 함수들
// ============================================================

function buildFactsSection(facts: Facts): string {
  const lines: string[] = [];

  if (facts.address) lines.push(`주소: ${facts.address}`);
  if (facts.hours) lines.push(`영업시간: ${facts.hours}`);
  if (facts.parking) lines.push(`주차: ${facts.parking}`);
  if (facts.priceTable) lines.push(`가격: ${facts.priceTable}`);
  if (facts.areaPyeong) lines.push(`규모: ${facts.areaPyeong}`);
  if (facts.machinesCount) lines.push(`기구: ${facts.machinesCount}`);
  if (facts.trainerCerts) lines.push(`트레이너 자격: ${facts.trainerCerts}`);
  if (facts.programList) lines.push(`프로그램: ${facts.programList}`);
  if (facts.memberBefore) lines.push(`회원 전 상태: ${facts.memberBefore}`);
  if (facts.memberAfter) lines.push(`회원 후 상태: ${facts.memberAfter}`);
  if (facts.eventPeriod) lines.push(`이벤트 기간: ${facts.eventPeriod}`);
  if (facts.eventBenefit) lines.push(`이벤트 혜택: ${facts.eventBenefit}`);

  return lines.length > 0
    ? lines.join('\n')
    : '(입력된 사실 정보 없음 - 수치/가격 등은 "상담 시 안내"로 표기)';
}

function buildCustomerStorySection(story: ContentState['customerStory']): string {
  if (!story) return '';

  return `
────────────────────────────────
【회원 스토리 정보】
────────────────────────────────
회원 프로필: ${story.customerProfile}
기간: ${story.duration}
초기 문제: ${story.initialProblem}
트레이너 피드백 (직접 인용): "${story.trainerFeedback}"
힘들었던 순간: ${story.hardMoment}
변화 느낀 순간: ${story.changePoint}`;
}

function buildStaffSection(staff: ContentState['staffInfo']): string {
  if (!staff) return '';

  return `
────────────────────────────────
【트레이너 정보】
────────────────────────────────
이름: ${staff.name}
직책: ${staff.position}
경력: ${staff.career}
전문 분야: ${staff.specialty}
트레이닝 철학: ${staff.philosophy}`;
}

function buildSummarySection(state: ContentState): string {
  const { facts, businessName, location } = state;

  const lines: string[] = [
    `【${businessName} 요약 정보】`,
    '',
    `업체명: ${businessName}`,
    `위치: ${location}`,
  ];

  // 조건부 출력 - facts에 있을 때만
  if (facts.hours) {
    lines.push(`영업시간: ${facts.hours}`);
  } else {
    lines.push(`영업시간: 상담 시 안내`);
  }

  if (facts.parking) {
    lines.push(`주차: ${facts.parking}`);
  } else {
    lines.push(`주차: 방문 시 확인`);
  }

  if (facts.priceTable) {
    lines.push(`가격: ${facts.priceTable}`);
  } else {
    lines.push(`가격: 상담 시 안내`);
  }

  if (state.uniquePoint) {
    lines.push(`특징: ${state.uniquePoint}`);
  }

  return lines.join('\n');
}

function getContentStructure(contentType: ContentType): string {
  const structures: Record<ContentType, string> = {
    center_intro: `
1. 첫인상/분위기 (경험적 도입)
2. 시설 둘러보기 (공간별)
3. 프로그램/서비스
4. 가격 안내 (facts 기반, 없으면 "상담 시 안내")
5. 찾아오는 길
6. 이런 분께 추천`,

    customer_story: `
1. 회원 소개 + 결론 먼저 (어떻게 달라졌는지)
2. 처음 왔을 때 상태 (facts 수치 사용)
3. 트레이너 피드백 (직접 인용 필수)
4. 중간에 힘들었던 순간
5. 변화가 느껴진 순간 (구체적 상황)
6. 현재 상태 + 회원 한마디`,

    exercise_info: `
1. 이 운동이 필요한 분
2. 운동 방법 (단계별)
3. 흔한 실수와 교정법
4. 기대 효과
5. 저희 센터에서는 이렇게 진행해요`,

    medical_info: `
1. 이런 분들이 많이 오세요 (공감)
2. 원인과 메커니즘 (전문 지식)
3. 운동이 도움되는 이유
4. 추천 운동/관리법
5. 저희 센터의 접근법
6. 의료기관 상담 권고 (필수)`,

    event_review: `
1. 행사/프로젝트 소개 + 결과
2. 기획하게 된 이유
3. 진행 과정
4. 참여자 반응 (직접 인용)
5. 성과 및 다음 계획`,

    staff_intro: `
1. 트레이너 프로필
2. 이 일을 시작한 계기
3. 트레이닝 철학/스타일
4. 기억에 남는 회원 에피소드
5. 이런 분들께 추천`,

    promotion: `
1. 핵심 혜택 (가장 매력적인 것)
2. 상세 내용 및 조건
3. 대상 및 기간
4. 신청 방법
5. 이전 참여자 후기 (있을 때만)`,
  };

  return structures[contentType];
}

function getPlaceholderExample(contentType: ContentType, perspective: WriterPerspective): string {
  if (contentType === 'customer_story' && perspective === 'trainer') {
    return `"제가 담당한 회원분 중 기억에 남는 분이 계세요.

[회원 프로필] OO대 OO이셨는데, 처음 오셨을 때 [facts의 전 상태 수치]였어요.
[초기 문제]로 고민이 많으셨죠.

'[트레이너 피드백 직접 인용]'이라고 말씀드렸어요.

[기간]차쯤 '[힘들었던 순간 - 회원 말 직접 인용]'이라고 하셔서
[트레이너가 한 설명/격려]라고 말씀드렸어요.

[변화 시점]에 '[변화 느낀 순간 - 회원 말 직접 인용]'

지금은 [facts의 후 상태 수치, 없으면 정성적 표현]
이런 변화를 함께 만들어가는 게 이 일의 보람이에요."

(위 [괄호] 부분을 실제 입력값으로 대체)`;
  }

  if (contentType === 'center_intro' && perspective === 'owner') {
    return `"이 공간을 만들 때 가장 중요하게 생각한 게 있어요.

'[핵심 철학/비전 한 문장]'

[이 철학이 나온 배경 - 개인 경험]

그래서 저희 센터는 [차별점]을 만들려고 노력해요.

[facts에 시설 규모가 있으면] 규모는 [평수], [기구 수] 정도예요.
[없으면] 규모는 방문하시면 직접 확인하실 수 있어요.

많은 분들이 '[회원들이 자주 하는 말 - 직접 인용]'라고 하세요."

(위 [괄호] 부분을 실제 입력값으로 대체, facts에 없으면 해당 문장 생략)`;
  }

  if (contentType === 'medical_info') {
    return `"[증상명]으로 상담 오시는 분들이 정말 많아요.

많은 분들이 '[흔한 오해]'라고 생각하시는데,
실제로는 [정확한 메커니즘 설명]이에요.

해부학적으로 보면 [원리 설명 - 전문 용어 + 쉬운 설명]

그래서 저는 [증상명] 회원분들께 [접근법]을 먼저 안내드려요.

실제로 이 방법으로 [정성적 결과 - "많이 좋아지셨다", "편해졌다고 하신다"]

단, 통증이 심하거나 지속되면 전문 의료기관 상담을 권장합니다."

(의학적 단정 금지, 의료기관 권고 필수)`;
  }

  // 기본 템플릿
  return `"[첫 문단 공식에 따른 3문장]

[이미지: 구체적 설명]

────────────────────────────────

[본문 섹션 1]
[경험 요소: 실제 상황 + 직접 인용]

[이미지: 해당 섹션 관련]

────────────────────────────────

[본문 섹션 2]
[정보 요소: facts 기반 데이터]

..."

(각 섹션에 경험 요소와 정보 요소를 필수 개수만큼 배치)`;
}

// ============================================================
// 라이트 모드 (토큰 절약용)
// ============================================================

export function generateFBAS2026PromptLite(state: ContentState): string {
  const contentInfo = CONTENT_TYPE_INFO[state.contentType];
  const perspective = PERSPECTIVE_GUIDE[state.writerPerspective];
  const factsSection = buildFactsSection(state.facts);

  return `2026 네이버 SEO 피트니스 블로그.

【최우선 규칙】
- facts에 있는 값만 사실로 작성
- 없는 수치/가격은 "상담 시 안내"로 표기
- 임의 수치 생성 절대 금지

【facts】
${factsSection}

【기본정보】
업체: ${state.businessName} (${state.location})
키워드: ${state.mainKeyword}
글유형: ${contentInfo.name}
시점: ${perspective.name}
${state.customTitle ? `제목: ${state.customTitle}` : ''}

【필수요소】
경험서사 ${contentInfo.experienceElements}개 (상황, 인용, 감정, 전환점)
정보 ${contentInfo.infoElements}개 (프로그램, 절차, 시설, 문의방법)

【규칙 3가지】
1. 마크다운/** 이모지 금지
2. 인사말 없이 바로 시작
3. 【섹션】 + ──── 구분선 사용

【출력】
${state.customTitle ? `【제목】${state.customTitle}` : '【제목】3개'}
────
【첫문단】3문장 (결론-차별점-안내)
────
【본문】섹션당 이미지 1개
────
【요약】업체명/위치/영업시간(facts 기반)/가격(facts 기반)

2000자 이상.`;
}

// ============================================================
// 수정 프롬프트
// ============================================================

export function generateModifyPrompt(originalContent: string, userRequest: string): string {
  return `블로그 글 수정.

【수정 요청】${userRequest}

【기존 글】
${originalContent}

【규칙】
1. facts에 없는 수치 추가 금지
2. 이미지 프롬프트 유지
3. 구분선 유지
4. 마크다운/이모지 금지

전체 글 출력.`;
}

// ============================================================
// AppState → ContentState 어댑터 (기존 컴포넌트 호환용)
// ============================================================

// 검색의도 → 글 유형 매핑
function searchIntentToContentType(intent: SearchIntent): ContentType {
  const mapping: Record<SearchIntent, ContentType> = {
    location: 'center_intro',
    information: 'exercise_info',
    transaction: 'promotion',
    navigation: 'center_intro',
  };
  return mapping[intent];
}

// 페르소나 텍스트 → WriterPerspective 매핑
function parseWriterPerspective(persona: string): WriterPerspective {
  if (!persona) return 'owner';
  const lower = persona.toLowerCase();
  if (lower.includes('트레이너') || lower.includes('강사') || lower.includes('코치')) return 'trainer';
  if (lower.includes('센터장') || lower.includes('관리')) return 'manager';
  if (lower.includes('fc') || lower.includes('상담')) return 'fc';
  return 'owner';
}

// AppState의 attributes에서 Facts 추출
function extractFacts(attributes: Record<string, string>): Facts {
  const facts: Facts = {};

  for (const [key, value] of Object.entries(attributes)) {
    if (!value) continue;
    const k = key.toLowerCase();

    if (k.includes('주소') || k.includes('위치')) facts.address = value;
    else if (k.includes('영업') || k.includes('시간') || k.includes('운영')) facts.hours = value;
    else if (k.includes('주차')) facts.parking = value;
    else if (k.includes('가격') || k.includes('요금') || k.includes('회원권') || k.includes('비용')) facts.priceTable = value;
    else if (k.includes('평') || k.includes('규모') || k.includes('면적')) facts.areaPyeong = value;
    else if (k.includes('기구') || k.includes('머신') || k.includes('장비')) facts.machinesCount = value;
    else if (k.includes('자격') || k.includes('인증') || k.includes('자격증')) facts.trainerCerts = value;
    else if (k.includes('프로그램') || k.includes('수업') || k.includes('클래스')) facts.programList = value;
    else if (k.includes('이벤트') || k.includes('할인') || k.includes('혜택')) facts.eventBenefit = value;
  }

  return facts;
}

// AppState를 ContentState로 변환
function appStateToContentState(state: AppState): ContentState {
  return {
    businessName: state.businessName,
    location: state.mainKeyword, // 메인 키워드가 보통 "지역+업종" 형태
    mainKeyword: state.mainKeyword,
    subKeywords: state.subKeywords,
    contentType: (state.contentType as ContentType) || searchIntentToContentType(state.searchIntent),
    writerPerspective: parseWriterPerspective(state.writerPersona),
    targetAudience: state.targetAudience || state.targetReader,
    uniquePoint: state.uniquePoint,
    customTitle: state.customTitle,
    facts: (() => {
      const baseFacts = extractFacts(state.attributes);
      // 이미지 분석 JSON에서 추출한 facts를 병합
      const imageResults = state.images
        .map(img => img.analysisJson)
        .filter((j): j is ImageAnalysisResult => !!j);
      if (imageResults.length === 0) return baseFacts;
      const imageFacts = extractFactsFromImageAnalysis(imageResults);
      return mergeImageFacts(baseFacts, imageFacts);
    })(),
  };
}

// ============================================================
// 기존 호환 함수들 (step-generate.tsx, step-result.tsx에서 사용)
// ============================================================

// ============================================================
// 이미지 분석 JSON → Facts 승격/병합
// ============================================================

// 이미지 분석 결과에서 Facts로 승격 가능한 항목을 추출
function extractFactsFromImageAnalysis(results: ImageAnalysisResult[]): Partial<Facts> {
  const imageFacts: Partial<Facts> = {};

  for (const r of results) {
    // 기구/장비 → machinesCount (명확한 수량이 있는 것만)
    if (r.equipment && r.equipment.length > 0) {
      const equipStr = r.equipment
        .map(e => e.count ? `${e.name} ${e.count}대` : e.name)
        .join(', ');
      if (equipStr) {
        imageFacts.machinesCount = imageFacts.machinesCount
          ? `${imageFacts.machinesCount}, ${equipStr}` : equipStr;
      }
    }

    // 가격 정보 → priceTable
    const priceTexts = [
      ...r.numbersFound || [],
      ...(r.textFound || []).filter(t => t.type === 'price').map(t => t.raw),
    ];
    if (priceTexts.length > 0) {
      imageFacts.priceTable = imageFacts.priceTable
        ? `${imageFacts.priceTable}, ${priceTexts.join(', ')}` : priceTexts.join(', ');
    }

    // 자격증 → trainerCerts
    if (r.certificates && r.certificates.length > 0) {
      const certStr = r.certificates
        .map(c => [c.name, c.issuer, c.person].filter(Boolean).join(' / '))
        .join('; ');
      if (certStr) {
        imageFacts.trainerCerts = imageFacts.trainerCerts
          ? `${imageFacts.trainerCerts}; ${certStr}` : certStr;
      }
    }

    // 간판/텍스트에서 주소 추출
    const signTexts = (r.textFound || []).filter(t => t.type === 'sign').map(t => t.raw);
    if (signTexts.length > 0 && !imageFacts.address) {
      const addressLike = signTexts.find(t =>
        /[시군구동로길]/.test(t) || /\d{1,3}층/.test(t)
      );
      if (addressLike) imageFacts.address = addressLike;
    }

    // 면적/규모 → areaPyeong
    if (r.spaceSize && !imageFacts.areaPyeong) {
      imageFacts.areaPyeong = `사진 기준 ${r.spaceSize}`;
    }
  }

  return imageFacts;
}

// 기존 facts에 이미지 facts를 병합 (기존 facts 우선, 이미지는 보조)
function mergeImageFacts(baseFacts: Facts, imageFacts: Partial<Facts>): Facts {
  const merged = { ...baseFacts };
  for (const [key, value] of Object.entries(imageFacts)) {
    const k = key as keyof Facts;
    if (!merged[k] && value) {
      // 기존에 없는 항목만 이미지에서 채움
      merged[k] = value;
    } else if (merged[k] && value && k === 'machinesCount') {
      // 기구 수는 이미지 정보로 보강
      merged[k] = `${merged[k]} (사진 확인: ${value})`;
    }
  }
  return merged;
}

// 이미지 분석 JSON을 프롬프트 컨텍스트로 변환
function buildImageAnalysisContext(state: AppState): string {
  const analyzed = state.images.filter(img => img.analysis || img.analysisJson);
  if (analyzed.length === 0) return '';

  let context = `\n────────────────────────────────\n【업로드 사진 분석 결과】\n────────────────────────────────\n\n`;

  analyzed.forEach((img, idx) => {
    const j = img.analysisJson;
    if (j) {
      // JSON 기반 구조화된 출력
      const lines: string[] = [`[사진 ${idx + 1}]`];
      if (j.placeType) lines.push(`장소: ${j.placeType}`);
      if (j.equipment?.length) {
        lines.push(`기구: ${j.equipment.map(e => e.count ? `${e.name} ${e.count}대` : e.name).join(', ')}`);
      }
      if (j.spaceSize) lines.push(`규모: ${j.spaceSize}`);
      if (j.people?.exists && j.people.description) lines.push(`인물: ${j.people.description}`);
      if (j.textFound?.length) {
        lines.push(`텍스트: ${j.textFound.map(t => t.raw).join(' / ')}`);
      }
      if (j.numbersFound?.length) lines.push(`숫자/가격: ${j.numbersFound.join(', ')}`);
      if (j.certificates?.length) {
        lines.push(`자격증: ${j.certificates.map(c => `${c.name}(${c.issuer})`).join(', ')}`);
      }
      if (j.brandLogo?.length) lines.push(`브랜드: ${j.brandLogo.join(', ')}`);
      if (j.mood?.impression) lines.push(`분위기: ${j.mood.impression}`);
      if (j.recommendedSection) lines.push(`추천 섹션: ${j.recommendedSection}`);
      if (j.claimSupport) lines.push(`활용: ${j.claimSupport}`);
      context += lines.join('\n') + '\n\n';
    } else if (img.analysis) {
      // 폴백: 자유 텍스트
      context += `[사진 ${idx + 1}]\n${img.analysis}\n\n`;
    }
  });

  context += `────────────────────────────────
위 사진 분석 내용 중 구체적 수치(기구 수, 가격, 자격증명)는 facts에 병합되어 사실로 작성됩니다.
null 항목은 본문에 포함하지 마세요.
각 사진의 추천 섹션에 맞는 위치에 [이미지: 사진 내용 설명] 형식으로 배치하세요.
────────────────────────────────\n\n`;

  return context;
}

export function generate333Prompt(state: AppState): string {
  const contentState = appStateToContentState(state);
  const basePrompt = generateFBAS2026Prompt(contentState);
  const imageContext = buildImageAnalysisContext(state);

  if (!imageContext) return basePrompt;

  return `${imageContext}${basePrompt}`;
}

export function generate333PromptLite(state: AppState): string {
  const contentState = appStateToContentState(state);
  const basePrompt = generateFBAS2026PromptLite(contentState);
  const analyzed = state.images.filter(img => img.analysis);

  if (analyzed.length === 0) return basePrompt;

  // 라이트 모드에서는 간결하게
  const imageLines = analyzed.map((img, idx) =>
    `[사진${idx + 1}] ${img.analysis?.slice(0, 200) || ''}`
  ).join('\n');

  return `【사진분석】\n${imageLines}\n\n${basePrompt}`;
}

// PRO 기능: 상위노출 블로그 학습 컨텍스트
export function generateTopBlogsLearningContext(learningResult: LearningResult | null): string {
  if (!learningResult || learningResult.successfulBlogs === 0) {
    return '';
  }

  const { analysis, blogs } = learningResult;

  let context = `
────────────────────────────────
【PRO 기능】 "${learningResult.keyword}" 상위노출 블로그 ${learningResult.successfulBlogs}개 분석 결과
────────────────────────────────

상위노출 블로그 평균 통계:
- 평균 글자수: ${analysis.avgWordCount.toLocaleString()}자 (이 정도 분량으로 작성 필요)
- 평균 섹션 수: ${analysis.avgSections}개
- 평균 이미지 수: ${analysis.avgImages}개

상위노출 제목 패턴: ${analysis.titlePatterns.join(', ') || '일반형'}
상위노출 글의 공통 구조: ${analysis.commonStructures.join(', ') || '자유 형식'}

`;

  context += `【상위 블로그 구조 참고】\n`;
  blogs.slice(0, 3).forEach((blog, idx) => {
    context += `
${idx + 1}. "${blog.title}"
   - 글자수: ${blog.wordCount.toLocaleString()}자
   - 섹션: ${blog.structure.sectionCount}개
   - 이미지: ${blog.structure.imageCount}개
   - FAQ 포함: ${blog.structure.hasFAQ ? '예' : '아니오'}
   - 가격표 포함: ${blog.structure.hasTable ? '예' : '아니오'}
   - 관련 키워드: ${blog.keywords.slice(0, 5).join(', ')}
`;
  });

  context += `
────────────────────────────────
중요: 위 분석 결과를 참고하되, 표절이 아닌 완전히 새롭고 독창적인 콘텐츠를 작성하세요.
────────────────────────────────

`;

  return context;
}

export function generate333PromptWithLearning(state: AppState): string {
  const basePrompt = generate333Prompt(state);
  const learningContext = generateTopBlogsLearningContext(state.topBlogsLearning);

  if (!learningContext) {
    return basePrompt;
  }

  return `${learningContext}

위 상위노출 분석 결과를 참고하여 아래 요청대로 블로그 글을 작성해주세요.

────────────────────────────────

${basePrompt}`;
}

// ============================================================
// Export
// ============================================================

export default {
  generateFBAS2026Prompt,
  generateFBAS2026PromptLite,
  generateModifyPrompt,
  generate333Prompt,
  generate333PromptLite,
  generate333PromptWithLearning,
  CONTENT_TYPE_INFO,
  PERSPECTIVE_GUIDE,
};
