/**
 * FBAS 2026 프롬프트 생성기 v4 (체류시간 전략 반영 버전)
 *
 * v3 대비 개선사항:
 * 6. 검색의도별 체류시간 전략 추가
 * 7. 스크롤 유도 구조 규칙 추가 (첫 3문장 결론, 중간 궁금증 장치)
 * 8. 문단 길이 강화 (모바일 3~4줄)
 * 9. 이미지 배치 원칙 (설명용만, 의미없는 나열 금지)
 *
 * v2 대비 개선사항:
 * 1. 키워드 반복 금지 규칙 추가 (업체명/브랜드명 3회 이내)
 * 2. 문단 시작 다양화 규칙 추가 (6가지 패턴 중 4가지 이상 혼용)
 * 3. 제목-본문 연결 규칙 추가
 * 4. 문체 네거티브 프롬프트 추가 (반복 패턴 금지)
 * 5. 톤 레퍼런스 (좋은 예/나쁜 예) 추가
 */

import { AppState, SearchIntent, LearningResult, ImageAnalysisResult } from '@/types';

// ============================================================
// 타입 정의
// ============================================================

export type ContentType =
  | 'center_intro'
  | 'customer_story'
  | 'exercise_info'
  | 'medical_info'
  | 'event_review'
  | 'staff_intro'
  | 'promotion';

export type WriterPerspective =
  | 'owner'
  | 'manager'
  | 'trainer'
  | 'fc';

export interface Facts {
  address?: string;
  hours?: string;
  parking?: string;
  priceTable?: string;
  areaPyeong?: string;
  machinesCount?: string;
  trainerCerts?: string;
  programList?: string;
  memberBefore?: string;
  memberAfter?: string;
  eventPeriod?: string;
  eventBenefit?: string;
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
  facts: Facts;
  customerStory?: {
    customerProfile: string;
    duration: string;
    initialProblem: string;
    trainerFeedback: string;
    hardMoment: string;
    changePoint: string;
  };
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
  experienceElements: number;
  infoElements: number;
}> = {
  center_intro: { name: '센터 소개형', experienceElements: 3, infoElements: 4 },
  customer_story: { name: '고객 경험 서사형', experienceElements: 5, infoElements: 2 },
  exercise_info: { name: '운동 정보형', experienceElements: 2, infoElements: 4 },
  medical_info: { name: '전문 정보형', experienceElements: 2, infoElements: 5 },
  event_review: { name: '행사/프로젝트형', experienceElements: 4, infoElements: 3 },
  staff_intro: { name: '트레이너 소개형', experienceElements: 4, infoElements: 3 },
  promotion: { name: '프로모션형', experienceElements: 2, infoElements: 4 },
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
  center_intro: `【첫 문단 공식 - 3문장 필수】
1문장: 이 센터가 어떤 사람에게 맞는지 (결론)
2문장: 다른 곳과 다른 차별점 1가지
3문장: 방문 전 알면 좋은 것 1가지`,

  customer_story: `【첫 문단 공식 - 3문장 필수】
1문장: 회원 프로필 (OO대 OO, OO 고민)
2문장: 처음 왔을 때 상태 (facts에 있는 수치 사용)
3문장: 지금은 어떻게 달라졌는지 (결론 먼저)`,

  exercise_info: `【첫 문단 공식 - 3문장 필수】
1문장: 이 운동이 필요한 사람 (타겟 명시)
2문장: 흔히 하는 실수 1가지
3문장: 오늘 알려줄 핵심 해결법`,

  medical_info: `【첫 문단 공식 - 3문장 필수】
1문장: 이 증상에 대한 흔한 오해 1가지
2문장: 실제 메커니즘 간략히
3문장: 운동으로 접근하는 방법 예고`,

  event_review: `【첫 문단 공식 - 3문장 필수】
1문장: 행사/프로젝트 이름과 결과 (숫자 포함)
2문장: 기획하게 된 계기 1가지
3문장: 참여자 반응 한마디 (직접 인용)`,

  staff_intro: `【첫 문단 공식 - 3문장 필수】
1문장: 트레이너 이름과 전문 분야
2문장: 이 일을 하게 된 계기 한마디
3문장: 어떤 분들이 찾아오시는지`,

  promotion: `【첫 문단 공식 - 3문장 필수】
1문장: 핵심 혜택 (가장 매력적인 것)
2문장: 대상과 기간
3문장: 신청 방법 (바로 행동 가능하게)`,
};

// ============================================================
// [v3 신규] 문단 시작 다양화 패턴
// ============================================================

const PARAGRAPH_VARIETY_RULE = `──────────────────────────────────
【문단 시작 다양화 규칙】
──────────────────────────────────
각 섹션의 첫 문장은 아래 6가지 패턴 중 최소 4가지를 골고루 사용하세요.
같은 패턴을 연속 2회 사용하지 마세요.

1. 질문형: "혹시 ~해보신 적 있으세요?" / "왜 ~일까요?"
2. 일화형: "어느 날 한 회원분이~" / "얼마 전 있었던 일인데요"
3. 통계형: "10명 중 7명은~" / "실제로 ~라는 조사 결과가 있어요"
4. 비유형: "운동은 마치~" / "이건 마치 ~과 같아요"
5. 대화형: "솔직히 말하면~" / "사실 이건 좀 고민했는데요"
6. 반전형: "그런데 여기서 반전이~" / "근데 생각보다 달랐어요"`;

// ============================================================
// [v3 신규] 제목-본문 연결 규칙
// ============================================================

const TITLE_BODY_CONNECTION_RULE = `──────────────────────────────────
【제목-본문 연결 규칙】
──────────────────────────────────
1. 제목의 핵심 키워드가 첫 문단 1문장에 자연스럽게 등장해야 합니다.
2. 제목이 약속한 내용을 본문이 반드시 이행해야 합니다.
   예: 제목이 "3개월 변화"면 본문에 3개월 변화 과정이 있어야 함.
3. 제목에 없는 내용이 본문의 주제가 되면 안 됩니다.`;

// ============================================================
// [v3 신규] 문체 네거티브 프롬프트
// ============================================================

const STYLE_NEGATIVE_PROMPT = `──────────────────────────────────
【문체 금지 사항 - 이걸 어기면 AI가 쓴 티가 납니다】
──────────────────────────────────
1. 모든 문단을 "저희 센터에서는~"으로 시작 금지
2. 연속 문단이 같은 단어/구문으로 시작 금지
3. "~합니다/~입니다" 경어체만 반복 금지 (대화체 30% 섞기)
   예: "~거든요", "~더라고요", "~싶었어요" 등 자연스러운 종결어미 혼용
4. 같은 접속사("또한", "특히", "이러한") 연속 사용 금지
5. 업체명/브랜드명/책 이름은 전체 글에서 최대 3회까지만 언급
6. 한 문장에 수식어 3개 이상 나열 금지
   나쁜 예: "체계적이고 전문적이며 신뢰할 수 있는 프로그램"
   좋은 예: "검증된 프로그램"`;

// ============================================================
// [v3 신규] 톤 레퍼런스
// ============================================================

// ============================================================
// [v4 신규] 체류시간 전략 규칙
// ============================================================

const DWELL_TIME_STRATEGY = `──────────────────────────────────
【체류시간 증가 전략 - 핵심 규칙】
──────────────────────────────────
체류시간은 글의 양이 아니라 "검색의도 충족도"에 비례합니다.
사진 많다고, 글 길다고 체류시간이 늘지 않습니다.

1. 검색의도별 글 구성:
   - 위치형 ("OO동 헬스장"): 위치·가격·영업시간·사진 → 핵심만 빠르게
   - 정보형 ("스쿼트 무릎 통증"): 원인·해결법·단계별 설명 → 깊이 있게
   - 거래형 ("헬스장 3개월 가격"): 가격표·할인조건·비교 → 비교 가능하게

2. 의미있는 체류시간 기준:
   - 30초 미만 = 이탈 (안 읽은 것)
   - 60초 이상 = 의미 있는 체류
   - 90초 이상 = 좋은 신호 (몰입)

3. 진짜 체류 = 시간 + 스크롤 행동:
   - 창 띄워놓고 안 읽는 것은 의미 없음
   - 스크롤이 아래로 꾸준히 내려가면서 머무른 것이 진짜 체류`;

// ============================================================
// [v4 신규] 스크롤 유도 구조 규칙
// ============================================================

const SCROLL_ENGAGEMENT_RULE = `──────────────────────────────────
【스크롤 유도 구조 - 끝까지 읽게 만드는 법】
──────────────────────────────────
1. 첫 3문장에 답을 줘라:
   - 검색의도에 대한 결론을 먼저 제시
   - "이 글에 내 답이 있구나" 확신시키면 계속 읽음
   - 결론 없이 서론만 길면 3초 만에 이탈

2. 문단을 짧게 끊어라:
   - 한 문단 3~4줄 이내 (모바일 기준 한 화면)
   - 6줄 이상 문단은 무조건 분리
   - 빽빽한 글 = 스크롤 포기

3. 중간에 궁금증 장치를 넣어라:
   - "그런데 여기서 많은 분들이 실수하는 게 있어요"
   - "솔직히 이건 알려드릴지 고민했는데요"
   - 섹션 3~4개마다 1개씩 배치 (총 2~3개)

4. 이미지는 "설명 보조" 용도만:
   - 의미 없는 분위기 사진 나열 금지
   - 핵심을 설명하는 사진만 배치 (예: 자세 교정 전후, 기구 사용법)
   - 이미지 10장보다 설명하는 이미지 3장이 체류시간 높음

5. 마지막에 행동 유도 (CTA):
   - "궁금하시면 댓글 남겨주세요"
   - "더 자세한 내용은 상담 시 안내드려요"
   - 체류 + 재방문까지 연결`;

const TONE_REFERENCE = `──────────────────────────────────
【톤 레퍼런스 - 이런 느낌으로 쓰세요】
──────────────────────────────────
좋은 예 (자연스럽고 몰입되는 글):
"솔직히 처음엔 반신반의했어요. 그런데 3개월 뒤, 거울 앞에서 '이게 나야?' 싶었다는 거예요."
"상담하다 보면 이런 분들이 꽤 많거든요. 운동은 하고 싶은데, 어디서부터 시작해야 할지 막막한 거죠."
"그날 회원분이 한마디 하셨어요. '선생님, 계단 올라가는데 안 힘들어요.' 이 한마디에 저도 모르게 웃었어요."

나쁜 예 (AI가 쓴 티가 나는 글):
"저희 센터에서는 체계적인 프로그램을 통해 회원님의 변화를 도모합니다."
"양홍석 대표의 트레이너 마일스톤에서 강조하듯, 올바른 운동은 매우 중요합니다."
"이러한 접근은 회원분들이 신체적 건강뿐만 아니라 정신적 활력을 경험하도록 돕습니다."`;

// ============================================================
// 이미지 분석 관련 함수
// ============================================================

function mergeImageFacts(baseFacts: Facts, imageFacts: Partial<Facts>): Facts {
  const merged = { ...baseFacts };
  for (const [key, value] of Object.entries(imageFacts)) {
    const k = key as keyof Facts;
    if (!merged[k] && value) {
      merged[k] = value;
    } else if (merged[k] && value && k === 'machinesCount') {
      merged[k] = `${merged[k]} (사진 확인: ${value})`;
    }
  }
  return merged;
}

function buildImageAnalysisContext(state: AppState): string {
  const analyzed = state.images.filter(img => img.analysis || img.analysisJson);
  if (analyzed.length === 0) return '';

  let context = `──────────────────────────────────
【업로드 사진 분석 결과】
──────────────────────────────────
`;

  analyzed.forEach((img, idx) => {
    const j = img.analysisJson;
    if (j) {
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
      context += `[사진 ${idx + 1}] ${img.analysis}\n\n`;
    }
  });

  context += `──────────────────────────────────
위 사진 분석 내용 중 구체적 수치(기구 수, 가격, 자격증명)는 facts에 병합되어 사실로 작성됩니다.
null 항목은 본문에 포함하지 마세요.
각 사진의 추천 섹션에 맞는 위치에 [이미지: 사진 내용 설명] 형식으로 배치하세요.
──────────────────────────────────
`;

  return context;
}

// ============================================================
// 메인 프롬프트 생성 함수 (v3)
// ============================================================

export function generateFBAS2026Prompt(state: ContentState): string {
  const contentInfo = CONTENT_TYPE_INFO[state.contentType];
  const perspective = PERSPECTIVE_GUIDE[state.writerPerspective];
  const firstParaFormula = FIRST_PARAGRAPH_FORMULA[state.contentType];
  const factsSection = buildFactsSection(state.facts);
  const summarySection = buildSummarySection(state);

  return `당신은 2026년 네이버 알고리즘에 최적화된 피트니스 블로그 전문 작가입니다.
──────────────────────────────────
【최우선 규칙: 사실성 가드레일】
──────────────────────────────────
아래 규칙을 어기면 전체 글이 무효 처리됩니다.

1. 주소, 영업시간, 주차요금, 가격, 평수, 기구 수, 할인율, 자격증, 전후 수치 등
   사실 데이터는 아래 【입력된 사실 정보】에 있을 때만 작성합니다.
2. 【입력된 사실 정보】에 없는 항목은 임의로 생성하지 않고,
   해당 위치에 "상담 시 안내" 또는 "방문 시 확인"으로 표기합니다.
3. 임의 수치, 임의 후기, 임의 의학적 단정은 절대 금지입니다.
4. 회원 후기를 작성할 때, 【입력된 사실 정보】의 전후 수치가 없으면
   구체적 숫자 대신 "눈에 띄는 변화", "확실히 달라진 느낌" 등 정성적 표현을 사용합니다.

${DWELL_TIME_STRATEGY}

${SCROLL_ENGAGEMENT_RULE}

${STYLE_NEGATIVE_PROMPT}

${TONE_REFERENCE}

${TITLE_BODY_CONNECTION_RULE}

${PARAGRAPH_VARIETY_RULE}

──────────────────────────────────
【입력된 사실 정보】 - 이 값만 사실로 작성 가능
──────────────────────────────────
${factsSection}

──────────────────────────────────
【기본 정보】
──────────────────────────────────
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

──────────────────────────────────
【글쓴이 시점: ${perspective.name}】
──────────────────────────────────
말투: ${perspective.tone}
1인칭: ${perspective.firstPerson}

──────────────────────────────────
【필수 요소 개수】 - 비율 대신 개수로 체크
──────────────────────────────────
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

──────────────────────────────────
${firstParaFormula}
──────────────────────────────────

──────────────────────────────────
【${contentInfo.name} 본문 구조】
──────────────────────────────────
${getContentStructure(state.contentType)}

${state.contentType === 'medical_info' ? `──────────────────────────────────
【의료 정보 면책 규칙】
──────────────────────────────────
1. "치료", "완치", "100% 개선" 등 의학적 단정 표현 금지
2. "OO에 효과적입니다" 대신 "OO에 도움이 될 수 있습니다" 사용
3. 글 마지막에 반드시 포함: "통증이 심하거나 지속되면 전문 의료기관 상담을 권장합니다"` : ''}

──────────────────────────────────
【출력 규칙 9가지】
──────────────────────────────────
1. 마크다운 금지: ** / ## / 이모지 절대 사용 금지
2. 인사말 금지: "안녕하세요" 없이 바로 본론 시작
3. 【섹션제목】 형식 + ──────────────────────────────── 구분선 사용
4. 키워드 반복 금지: 연속 문단이 같은 단어/구문으로 시작 금지.
   업체명/브랜드명/책이름은 전체 글에서 3회 이내만 언급.
5. 문단 길이: 한 문단은 3~4줄 이내(모바일 한 화면). 5줄 이상 금지.
6. 종결어미 다양화: "~합니다"만 쓰지 말고 "~거든요", "~더라고요", "~싶었어요" 등 자연스러운 어미 30% 이상 섞기.
7. 첫 3문장 결론 필수: 검색의도에 대한 답을 첫 문단에서 제시. 서론만 길면 이탈.
8. 궁금증 장치: 본문 중간에 "그런데 여기서~", "솔직히 이건~" 같은 스크롤 유도 문장 2~3개 배치.
9. 이미지 원칙: 의미 없는 분위기 사진 나열 금지. 핵심 설명 보조 이미지만 배치.

──────────────────────────────────
【출력 형식】
──────────────────────────────────
${state.customTitle
    ? `【제목】 ${state.customTitle}`
    : `【제목 후보 3개】
- 지역 + 핵심 키워드 + 구체적 결과
- 타겟 + 기간 + 변화
- 질문형 또는 숫자 포함형`}
────────────────────────────────────
【첫 문단】 (위 첫 문단 공식대로 3문장)
[이미지: 대표 사진 - 구체적 설명]
────────────────────────────────────
(본문 섹션들 - 섹션당 이미지 1개씩)
────────────────────────────────────
${summarySection}
────────────────────────────────────

【자리표시자 예시】 - 이 형식으로 작성하되, 값은 facts 기반으로
────────────────────────────────────
${getPlaceholderExample(state.contentType, state.writerPerspective)}
────────────────────────────────────

【최종 검수 체크 10가지】
────────────────────────────────────
글 완성 후 아래 10가지를 확인하세요:
1. 첫 문단 3문장 안에 검색의도에 대한 결론/핵심이 있는가?
2. 과장/단정 표현("최고", "완치", "100%")이 없는가?
3. facts에 없는 수치/정보가 생성되지 않았는가?
4. 섹션이 최소 5개 이상인가?
5. 문의/예약 유도(CTA)가 1개 이상 있는가?
6. 연속 문단이 같은 단어로 시작하지 않는가?
7. 업체명/브랜드명이 3회 이내로 언급되었는가?
8. 모든 문단이 3~4줄 이내인가? (5줄 이상 문단 분리)
9. 중간에 궁금증 유도 장치가 2개 이상 있는가?
10. 이미지가 의미 없는 나열이 아닌 설명 보조 역할인가?
────────────────────────────────────
2500자 이상 작성. 이미지는 섹션당 1개씩 자연스럽게 배치.`;
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
  return `──────────────────────────────────
【회원 스토리 정보】
──────────────────────────────────
회원 프로필: ${story.customerProfile}
기간: ${story.duration}
초기 문제: ${story.initialProblem}
트레이너 피드백 (직접 인용): "${story.trainerFeedback}"
힘들었던 순간: ${story.hardMoment}
변화 느낀 순간: ${story.changePoint}`;
}

function buildStaffSection(staff: ContentState['staffInfo']): string {
  if (!staff) return '';
  return `──────────────────────────────────
【트레이너 정보】
──────────────────────────────────
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
    center_intro: `1. 첫인상/분위기 (경험적 도입)
2. 시설 둘러보기 (공간별)
3. 프로그램/서비스
4. 가격 안내 (facts 기반, 없으면 "상담 시 안내")
5. 찾아오는 길
6. 이런 분께 추천`,
    customer_story: `1. 회원 소개 + 결론 먼저 (어떻게 달라졌는지)
2. 처음 왔을 때 상태 (facts 수치 사용)
3. 트레이너 피드백 (직접 인용 필수)
4. 중간에 힘들었던 순간
5. 변화가 느껴진 순간 (구체적 상황)
6. 현재 상태 + 회원 한마디`,
    exercise_info: `1. 이 운동이 필요한 분
2. 운동 방법 (단계별)
3. 흔한 실수와 교정법
4. 기대 효과
5. 저희 센터에서는 이렇게 진행해요`,
    medical_info: `1. 이런 분들이 많이 오세요 (공감)
2. 원인과 메커니즘 (전문 지식)
3. 운동이 도움되는 이유
4. 추천 운동/관리법
5. 저희 센터의 접근법
6. 의료기관 상담 권고 (필수)`,
    event_review: `1. 행사/프로젝트 소개 + 결과
2. 기획하게 된 이유
3. 진행 과정
4. 참여자 반응 (직접 인용)
5. 성과 및 다음 계획`,
    staff_intro: `1. 트레이너 프로필
2. 이 일을 시작한 계기
3. 트레이닝 철학/스타일
4. 기억에 남는 회원 에피소드
5. 이런 분들께 추천`,
    promotion: `1. 핵심 혜택 (가장 매력적인 것)
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
많은 분들이 '[흔한 오해]'라고 생각하시는데, 실제로는 [정확한 메커니즘 설명]이에요.
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
// 라이트 모드 (토큰 절약용) - v3 개선
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

【문체 규칙】
- 연속 문단 같은 단어로 시작 금지
- 업체명 3회 이내 언급
- 종결어미 다양화 (~거든요, ~더라고요 30% 섞기)
- "저희 센터에서는~" 반복 시작 금지

【체류시간 규칙】
- 첫 3문장에 검색의도 답 제시 (결론 먼저)
- 문단 3~4줄 이내 (모바일 가독성)
- 중간에 궁금증 장치 2개 이상 ("그런데 여기서~")
- 이미지는 설명 보조만, 의미없는 나열 금지

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
5. 연속 문단 같은 단어로 시작 금지
6. 업체명 3회 이내

전체 글 출력.`;
}

// ============================================================
// 참고 글 컨텍스트
// ============================================================

function buildReferenceTextContext(referenceText: string, lite = false): string {
  if (!referenceText || !referenceText.trim()) return '';

  const maxLen = lite ? 2000 : 5000;
  const truncated = referenceText.trim().slice(0, maxLen);

  if (lite) {
    return `【참고글】아래 글의 구조만 참고하여 새 글 작성. 내용 복사 금지.\n${truncated}\n\n`;
  }

  return `──────────────────────────────────
【참고 글 구조 분석】
──────────────────────────────────
아래는 사용자가 참고하고 싶어하는 블로그 글입니다.
이 글의 "구조와 흐름"을 분석하여 새 글 작성에 반영하세요.

[참고 글 원문]
${truncated}
${referenceText.length > maxLen ? '\n(이하 생략...)' : ''}

──────────────────────────────────
【참고 글 활용 규칙】
──────────────────────────────────
1. 구조만 참고: 섹션 배치, 흐름(도입→본문→마무리 순서), 문단 길이 패턴을 분석하여 비슷하게 구성
2. 내용은 새로 작성: 참고 글의 구체적 사실(가격, 위치, 이름, 후기 등)은 절대 복사하지 마세요
3. 사용자의 업체 정보로 대체: 아래 【입력된 사실 정보】와 【기본 정보】만을 사실로 사용
4. 문체 참고 가능: 종결어미 패턴, 대화체 비율 등은 참고하되, 동일한 문장 사용 금지
5. 사실성 가드레일 우선: 참고 글에 있는 수치/주장이라도 facts에 없으면 작성 금지
──────────────────────────────────
`;
}

// ============================================================
// 통합 함수들
// ============================================================

export function generate333Prompt(state: AppState): string {
  const contentState = appStateToContentState(state);
  const basePrompt = generateFBAS2026Prompt(contentState);
  const imageContext = buildImageAnalysisContext(state);
  const referenceContext = buildReferenceTextContext(state.referenceText);

  const parts = [referenceContext, imageContext, basePrompt].filter(Boolean);
  return parts.join('\n');
}

export function generate333PromptLite(state: AppState): string {
  const contentState = appStateToContentState(state);
  const basePrompt = generateFBAS2026PromptLite(contentState);
  const referenceContext = buildReferenceTextContext(state.referenceText, true);
  const analyzed = state.images.filter(img => img.analysis);

  let result = basePrompt;

  if (analyzed.length > 0) {
    const imageLines = analyzed.map((img, idx) =>
      `[사진${idx + 1}] ${img.analysis?.slice(0, 200) || ''}`
    ).join('\n');
    result = `【사진분석】\n${imageLines}\n\n${result}`;
  }

  if (referenceContext) {
    result = `${referenceContext}${result}`;
  }

  return result;
}

// PRO 기능: 상위노출 블로그 학습 컨텍스트
export function generateTopBlogsLearningContext(learningResult: LearningResult | null): string {
  if (!learningResult || learningResult.successfulBlogs === 0) {
    return '';
  }

  const { analysis, blogs } = learningResult;

  let context = `──────────────────────────────────
【PRO 기능】 "${learningResult.keyword}" 상위노출 블로그 ${learningResult.successfulBlogs}개 분석 결과
──────────────────────────────────

상위노출 블로그 평균 통계:
- 평균 글자수: ${analysis.avgWordCount.toLocaleString()}자 (이 정도 분량으로 작성 필요)
- 평균 섹션 수: ${analysis.avgSections}개
- 평균 이미지 수: ${analysis.avgImages}개

상위노출 제목 패턴: ${analysis.titlePatterns.join(', ') || '일반형'}
상위노출 글의 공통 구조: ${analysis.commonStructures.join(', ') || '자유 형식'}
`;

  context += `\n【상위 블로그 구조 참고】\n`;

  blogs.slice(0, 3).forEach((blog, idx) => {
    context += `${idx + 1}. "${blog.title}"
- 글자수: ${blog.wordCount.toLocaleString()}자
- 섹션: ${blog.structure.sectionCount}개
- 이미지: ${blog.structure.imageCount}개
- FAQ 포함: ${blog.structure.hasFAQ ? '예' : '아니오'}
- 가격표 포함: ${blog.structure.hasTable ? '예' : '아니오'}
- 관련 키워드: ${blog.keywords.slice(0, 5).join(', ')}
`;
  });

  context += `──────────────────────────────────
중요: 위 분석 결과를 참고하되, 표절이 아닌 완전히 새롭고 독창적인 콘텐츠를 작성하세요.
──────────────────────────────────
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
──────────────────────────────────
${basePrompt}`;
}

// ============================================================
// AppState → ContentState 어댑터
// ============================================================

function searchIntentToContentType(intent: SearchIntent): ContentType {
  const mapping: Record<SearchIntent, ContentType> = {
    location: 'center_intro',
    information: 'exercise_info',
    transaction: 'promotion',
    navigation: 'center_intro',
  };
  return mapping[intent];
}

function parseWriterPerspective(persona: string): WriterPerspective {
  if (!persona) return 'owner';
  const lower = persona.toLowerCase();
  if (lower.includes('트레이너') || lower.includes('강사') || lower.includes('코치')) return 'trainer';
  if (lower.includes('센터장') || lower.includes('관리')) return 'manager';
  if (lower.includes('fc') || lower.includes('상담')) return 'fc';
  return 'owner';
}

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

function extractFactsFromImageAnalysis(results: ImageAnalysisResult[]): Partial<Facts> {
  const imageFacts: Partial<Facts> = {};

  for (const r of results) {
    if (r.equipment && r.equipment.length > 0) {
      const equipStr = r.equipment
        .map(e => e.count ? `${e.name} ${e.count}대` : e.name)
        .join(', ');
      if (equipStr) {
        imageFacts.machinesCount = imageFacts.machinesCount
          ? `${imageFacts.machinesCount}, ${equipStr}`
          : equipStr;
      }
    }

    const priceTexts = [
      ...r.numbersFound || [],
      ...(r.textFound || []).filter(t => t.type === 'price').map(t => t.raw),
    ];
    if (priceTexts.length > 0) {
      imageFacts.priceTable = imageFacts.priceTable
        ? `${imageFacts.priceTable}, ${priceTexts.join(', ')}`
        : priceTexts.join(', ');
    }

    if (r.certificates && r.certificates.length > 0) {
      const certStr = r.certificates
        .map(c => [c.name, c.issuer, c.person].filter(Boolean).join(' / '))
        .join('; ');
      if (certStr) {
        imageFacts.trainerCerts = imageFacts.trainerCerts
          ? `${imageFacts.trainerCerts}; ${certStr}`
          : certStr;
      }
    }

    const signTexts = (r.textFound || []).filter(t => t.type === 'sign').map(t => t.raw);
    if (signTexts.length > 0 && !imageFacts.address) {
      const addressLike = signTexts.find(t =>
        /[시군구동로길]/.test(t) || /\d{1,3}층/.test(t)
      );
      if (addressLike) imageFacts.address = addressLike;
    }

    if (r.spaceSize && !imageFacts.areaPyeong) {
      imageFacts.areaPyeong = `사진 기준 ${r.spaceSize}`;
    }
  }

  return imageFacts;
}

function appStateToContentState(state: AppState): ContentState {
  return {
    businessName: state.businessName,
    location: state.mainKeyword,
    mainKeyword: state.mainKeyword,
    subKeywords: state.subKeywords,
    contentType: (state.contentType as ContentType) || searchIntentToContentType(state.searchIntent),
    writerPerspective: parseWriterPerspective(state.writerPersona),
    targetAudience: state.targetAudience || state.targetReader,
    uniquePoint: state.uniquePoint,
    customTitle: state.customTitle,
    facts: (() => {
      const baseFacts = extractFacts(state.attributes);
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


