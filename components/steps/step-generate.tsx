'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Wand2, ArrowLeft, Check, Sparkles, Search, BookOpen, CreditCard, Navigation, MapPin, Star, Edit3, User, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FitnessCategory } from '@/types';
import { generate333Prompt } from '@/lib/prompts';
import { SearchIntent, SEARCH_INTENT_INFO, ImageData } from '@/types';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

// Lucide 아이콘 매핑
const INTENT_ICONS = {
  BookOpen,
  CreditCard,
  Navigation,
  MapPin
} as const;

const FEATURES = [
  { name: '333법칙', color: 'bg-[#f72c5b]/10 text-[#f72c5b] border-[#f72c5b]/30' },
  { name: '데이터베이스화', color: 'bg-[#111111]/10 text-[#111111] border-[#111111]/30' },
  { name: 'Q&A 형식', color: 'bg-[#6366f1]/10 text-[#6366f1] border-[#6366f1]/30' },
  { name: '속성값 명시', color: 'bg-[#f7a600]/10 text-[#f7a600] border-[#f7a600]/30' },
  { name: '요약표', color: 'bg-[#ec4899]/10 text-[#ec4899] border-[#ec4899]/30' },
  { name: '문맥 일치도', color: 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30' },
  { name: '체크리스트', color: 'bg-[#f97316]/10 text-[#f97316] border-[#f97316]/30' },
  { name: 'CTA 최적화', color: 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30' },
];

const SEARCH_INTENTS: SearchIntent[] = ['location', 'information', 'transaction', 'navigation'];

// 추천 결과 타입
interface RecommendationResult {
  intent: SearchIntent | null;
  reason: string;
  matchedKeywords: string[];
  scores: Record<SearchIntent, number>;
}

// 이미지 분석 결과의 의미를 파악하여 추천 검색 의도 결정
function getRecommendedIntent(images: ImageData[]): RecommendationResult {
  const analysisTexts = images
    .filter(img => img.analysis)
    .map(img => img.analysis || '')
    .join(' ');

  if (!analysisTexts) {
    return { intent: null, reason: '', matchedKeywords: [], scores: { location: 0, information: 0, transaction: 0, navigation: 0 } };
  }

  // 이미지 유형별 패턴 감지 (가중치 적용)
  const patterns = {
    // 자격증/전문성 관련 (장소형 - 업체 차별점 강조)
    certification: {
      keywords: ['자격증', '인증', '수료', '수료증', '자격', '전문성', '전문적', '신뢰', '권위', '교육', '이수', '성취', '공인', '국가', '체육지도자', '생활스포츠', '강사자격', '코치자격', '트레이너 자격', '라이센스'],
      weight: 3,
      intent: 'location' as SearchIntent,
      description: '자격증/전문성 인증'
    },
    // 트레이너/강사 소개 (장소형 - 인적 자원 어필)
    trainer: {
      keywords: ['트레이너', '강사', '코치', '선생님', '대표', '원장', '소개', '프로필', '경력', '이력'],
      weight: 2,
      intent: 'location' as SearchIntent,
      description: '트레이너/강사 소개'
    },
    // 시설/환경 (장소형)
    facility: {
      keywords: ['시설', '내부', '인테리어', '공간', '기구', '장비', '환경', '쾌적', '청결', '깨끗', '넓', '최신', '샤워실', '락커', '탈의실'],
      weight: 2,
      intent: 'location' as SearchIntent,
      description: '시설/환경'
    },
    // 후기/결과 (장소형 - 신뢰 구축)
    review: {
      keywords: ['후기', '비포', '애프터', '변화', '결과', '수강생', '회원', '성공', '감량', '증량', '다이어트'],
      weight: 2,
      intent: 'location' as SearchIntent,
      description: '회원 후기/결과'
    },
    // 운동 방법/정보 (정보형)
    exercise: {
      keywords: ['운동 방법', '자세', '동작', '폼', '가이드', '팁', '루틴', '프로그램 설명', '효과', '원리', '주의사항'],
      weight: 2,
      intent: 'information' as SearchIntent,
      description: '운동 방법/정보'
    },
    // 가격/이벤트 (거래형)
    price: {
      keywords: ['가격', '비용', '요금', '할인', '이벤트', '프로모션', '회원권', '패키지', '혜택', '무료', '특가', '오픈', '등록'],
      weight: 3,
      intent: 'transaction' as SearchIntent,
      description: '가격/이벤트 정보'
    },
    // 위치/찾아오는 길 (이동형)
    navigation: {
      keywords: ['외관', '건물', '입구', '간판', '찾아오', '오시는', '주차', '주소', '약도', '지도', '교통', '역', '출구', '도보'],
      weight: 3,
      intent: 'navigation' as SearchIntent,
      description: '위치/찾아오는 길'
    }
  };

  // 점수 계산
  const scores: Record<SearchIntent, number> = {
    location: 0,
    information: 0,
    transaction: 0,
    navigation: 0
  };

  const detectedPatterns: { name: string; description: string; keywords: string[] }[] = [];

  Object.entries(patterns).forEach(([name, pattern]) => {
    const matchedKeywords: string[] = [];
    pattern.keywords.forEach(kw => {
      if (analysisTexts.includes(kw)) {
        matchedKeywords.push(kw);
      }
    });

    if (matchedKeywords.length > 0) {
      scores[pattern.intent] += matchedKeywords.length * pattern.weight;
      detectedPatterns.push({
        name,
        description: pattern.description,
        keywords: matchedKeywords
      });
    }
  });

  // 가장 높은 점수를 가진 의도 반환
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    return { intent: null, reason: '분석된 이미지에서 특징을 찾지 못했습니다', matchedKeywords: [], scores };
  }

  const recommended = Object.entries(scores).find(([, score]) => score === maxScore)?.[0] as SearchIntent;

  // 추천 근거 생성 (감지된 패턴 기반)
  const intentNames: Record<SearchIntent, string> = {
    location: '장소형',
    information: '정보형',
    transaction: '거래형',
    navigation: '이동형'
  };

  const intentReasons: Record<SearchIntent, string> = {
    location: '업체의 강점과 차별점을 부각하여 "여기가 좋겠다"라는 확신을 주는',
    information: '운동 방법과 정보를 알려주어 전문성을 어필하는',
    transaction: '가격과 혜택 정보로 등록/구매 결정을 유도하는',
    navigation: '찾아오는 방법을 상세히 안내하여 방문을 유도하는'
  };

  // 감지된 주요 패턴들로 근거 생성
  const topPatterns = detectedPatterns
    .sort((a, b) => b.keywords.length - a.keywords.length)
    .slice(0, 2);

  const patternDescriptions = topPatterns.map(p => p.description).join(', ');
  const allMatchedKeywords = topPatterns.flatMap(p => p.keywords);
  const uniqueMatched = [...new Set(allMatchedKeywords)].slice(0, 4);

  const reason = `이미지에서 ${patternDescriptions} 관련 내용(${uniqueMatched.join(', ')})이 감지되어, ${intentReasons[recommended]} ${intentNames[recommended]} 글쓰기를 추천합니다.`;

  return { intent: recommended, reason, matchedKeywords: uniqueMatched, scores };
}

// 업종별 페르소나 & 타겟 추천
interface PersonaTargetRecommendation {
  personas: { label: string; description: string }[];
  targets: { label: string; description: string }[];
}

function getPersonaTargetRecommendation(category: FitnessCategory, targetAudience: string): PersonaTargetRecommendation {
  const categoryPersonas: Record<FitnessCategory, { label: string; description: string }[]> = {
    '헬스장': [
      { label: '센터장/대표', description: '이 헬스장을 운영하는 센터장(대표) 시점' },
      { label: '트레이너', description: '회원들을 직접 지도하는 전문 트레이너 시점' },
      { label: 'FC(상담사)', description: '회원 상담과 등록을 담당하는 FC 시점' },
    ],
    '필라테스': [
      { label: '원장', description: '필라테스 스튜디오를 운영하는 원장 시점' },
      { label: '강사', description: '회원을 1:1로 지도하는 전문 강사 시점' },
      { label: 'FC(상담사)', description: '회원 상담과 등록을 담당하는 FC 시점' },
    ],
    'PT샵': [
      { label: '대표 트레이너', description: 'PT샵을 운영하는 대표 트레이너 시점' },
      { label: '담당 트레이너', description: '회원을 직접 지도하는 전문 트레이너 시점' },
      { label: 'FC(상담사)', description: '회원 상담과 등록을 담당하는 FC 시점' },
    ],
    '요가': [
      { label: '원장', description: '요가 스튜디오를 운영하는 원장 시점' },
      { label: '강사', description: '요가 지도사 자격을 가진 강사 시점' },
      { label: 'FC(상담사)', description: '회원 상담과 등록을 담당하는 FC 시점' },
    ],
    '크로스핏': [
      { label: '박스 대표', description: '크로스핏 박스를 운영하는 대표 시점' },
      { label: '코치', description: '크로스핏 박스의 전문 코치 시점' },
      { label: 'FC(상담사)', description: '회원 상담과 등록을 담당하는 FC 시점' },
    ],
    '복싱': [
      { label: '관장', description: '복싱장을 운영하는 관장 시점' },
      { label: '코치', description: '복싱 지도 경력이 있는 코치 시점' },
      { label: 'FC(상담사)', description: '회원 상담과 등록을 담당하는 FC 시점' },
    ],
  };

  const categoryTargets: Record<FitnessCategory, { label: string; description: string }[]> = {
    '헬스장': [
      { label: '헬스장 찾는 직장인', description: '퇴근 후 운동할 헬스장을 찾는 20-30대 직장인' },
      { label: '운동 초보자', description: '처음 헬스장을 등록하려는 운동 초보자' },
      { label: '이직한 직장인', description: '새 직장 근처 헬스장을 찾는 직장인' },
    ],
    '필라테스': [
      { label: '체형 교정 관심자', description: '거북목, 척추측만 등 체형 교정이 필요한 직장인' },
      { label: '산후 여성', description: '출산 후 몸 관리가 필요한 30대 여성' },
      { label: '필라테스 입문자', description: '필라테스를 처음 시작하려는 20-40대 여성' },
    ],
    'PT샵': [
      { label: '다이어트 결심자', description: '이번에는 꼭 성공하겠다고 결심한 다이어터' },
      { label: '바디프로필 준비자', description: '바디프로필 촬영을 목표로 하는 20-30대' },
      { label: '운동 재시작자', description: '오래 쉬다가 다시 운동을 시작하려는 사람' },
    ],
    '요가': [
      { label: '스트레스 해소 필요자', description: '업무 스트레스 해소가 필요한 직장인' },
      { label: '유연성 개선 희망자', description: '몸이 뻣뻣해서 유연성을 기르고 싶은 사람' },
      { label: '명상 관심자', description: '요가와 명상에 관심 있는 30-50대' },
    ],
    '크로스핏': [
      { label: '강도 높은 운동 원하는 자', description: '일반 헬스장이 지루한 20-30대 남녀' },
      { label: '체력 증진 목표자', description: '전반적인 체력과 지구력을 키우고 싶은 사람' },
      { label: '커뮤니티 원하는 자', description: '함께 운동하는 커뮤니티를 원하는 사람' },
    ],
    '복싱': [
      { label: '스트레스 해소 원하는 자', description: '때리면서 스트레스 풀고 싶은 직장인' },
      { label: '다이어트 운동 찾는 자', description: '재미있게 살 빼는 운동을 찾는 사람' },
      { label: '자기방어 배우고 싶은 자', description: '호신술에 관심 있는 20-30대' },
    ],
  };

  // 타겟 고객 정보가 있으면 첫 번째로 추가
  const targets = [...categoryTargets[category]];
  if (targetAudience) {
    targets.unshift({ label: `${targetAudience}`, description: `업체 정보에 입력한 타겟 고객: ${targetAudience}` });
  }

  return {
    personas: categoryPersonas[category],
    targets: targets.slice(0, 4),
  };
}

export function StepGenerate() {
  const store = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);

  // 이미지 분석 기반 추천 의도 계산
  const recommendation = useMemo(() => {
    return getRecommendedIntent(store.images);
  }, [store.images]);

  // 페르소나 & 타겟 추천
  const personaTargetRec = useMemo(() => {
    return getPersonaTargetRecommendation(store.category, store.targetAudience);
  }, [store.category, store.targetAudience]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.info('블로그 글을 생성하고 있습니다...');

    try {
      const prompt = generate333Prompt(store);
      const endpoint = store.apiProvider === 'gemini' ? '/api/gemini/generate' : '/api/openai/generate';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: store.apiKey,
          prompt,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      store.setGeneratedContent(data.content);
      store.setCurrentStep(4);
      toast.success('블로그 글이 생성되었습니다!');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
      toast.error('생성 실패: ' + errorMessage);
    }

    setIsGenerating(false);
  };

  return (
    <Card className="border border-[#eeeeee] shadow-lg bg-white">
      <CardHeader className="space-y-1 pb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#f7a600]/10 text-[#f7a600]">
            <Wand2 className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl text-[#111111]">블로그 글 생성</CardTitle>
        </div>
        <CardDescription className="text-base text-[#6b7280]">입력한 정보를 확인하고 생성 버튼을 눌러주세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="bg-[#f72c5b]/5 border border-[#f72c5b]/20 rounded-2xl p-5">
          <h3 className="font-semibold text-[#f72c5b] mb-4 flex items-center gap-2">
            <Check className="w-4 h-4" />
            입력 정보 요약
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-[#9ca3af]">업종</p>
              <p className="font-medium text-[#111111]">{store.category}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#9ca3af]">업체명</p>
              <p className="font-medium text-[#111111]">{store.businessName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#9ca3af]">메인 키워드</p>
              <p className="font-medium text-[#f72c5b]">{store.mainKeyword}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#9ca3af]">보조 키워드</p>
              <p className="font-medium text-[#111111]">{store.subKeywords.filter(k => k).join(', ') || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#9ca3af]">테일 키워드</p>
              <p className="font-medium text-[#6366f1]">{store.tailKeywords.filter(k => k).join(', ') || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#9ca3af]">타겟 고객</p>
              <p className="font-medium text-[#111111]">{store.targetAudience || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#9ca3af]">이미지</p>
              <p className="font-medium text-[#111111]">{store.images.length}장 업로드</p>
            </div>
          </div>
        </div>

        {/* Custom Title Input */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            제목 직접 입력 (선택)
          </h3>
          <div className="space-y-2">
            <Input
              value={store.customTitle}
              onChange={(e) => store.setCustomTitle(e.target.value)}
              placeholder="예: 강남역 헬스장 가격 비교, 3개월 다녀본 솔직 후기"
              className="h-12 bg-white border-[#eeeeee] focus:border-[#f72c5b] text-base"
            />
            <p className="text-xs text-[#9ca3af]">
              원하는 제목을 직접 입력하면 해당 제목으로 글이 생성됩니다. 비워두면 AI가 제목을 추천합니다.
            </p>
          </div>
        </div>

        {/* Keyword Editing Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
            <Edit3 className="w-4 h-4" />
            키워드 수정 (생성 전 수정 가능)
          </h3>

          {/* Main Keyword */}
          <div className="space-y-2">
            <label className="text-xs text-[#9ca3af]">메인 키워드</label>
            <Input
              value={store.mainKeyword}
              onChange={(e) => store.setMainKeyword(e.target.value)}
              placeholder="예: 강남역 헬스장"
              className="h-11 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
            />
          </div>

          {/* Sub Keywords */}
          <div className="space-y-2">
            <label className="text-xs text-[#9ca3af]">보조 키워드</label>
            <div className="grid grid-cols-3 gap-2">
              {store.subKeywords.map((keyword, idx) => (
                <Input
                  key={`sub-${idx}`}
                  value={keyword}
                  onChange={(e) => {
                    const newKeywords = [...store.subKeywords];
                    newKeywords[idx] = e.target.value;
                    store.setSubKeywords(newKeywords);
                  }}
                  placeholder={`보조 키워드 ${idx + 1}`}
                  className="h-10 bg-white border-[#eeeeee] focus:border-[#f72c5b] text-sm"
                />
              ))}
            </div>
          </div>

          {/* Tail Keywords */}
          <div className="space-y-2">
            <label className="text-xs text-[#9ca3af]">테일 키워드 (롱테일)</label>
            <div className="grid grid-cols-3 gap-2">
              {store.tailKeywords.map((keyword, idx) => (
                <Input
                  key={`tail-${idx}`}
                  value={keyword}
                  onChange={(e) => {
                    const newKeywords = [...store.tailKeywords];
                    newKeywords[idx] = e.target.value;
                    store.setTailKeywords(newKeywords);
                  }}
                  placeholder={`테일 키워드 ${idx + 1}`}
                  className="h-10 bg-white border-[#eeeeee] focus:border-[#6366f1] text-sm"
                />
              ))}
            </div>
            <p className="text-xs text-[#9ca3af]">예: 강남역 헬스장 가격, 강남역 PT 후기, 강남역 피트니스 추천</p>
          </div>
        </div>

        {/* Persona & Target Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
            <User className="w-4 h-4" />
            글쓴이(페르소나) & 독자(타겟) 설정
          </h3>

          {/* Writer Persona */}
          <div className="space-y-2">
            <label className="text-xs text-[#9ca3af] flex items-center gap-1">
              <User className="w-3 h-3" />
              누가 쓴 글인가요? (글쓴이 페르소나)
            </label>
            <Textarea
              value={store.writerPersona}
              onChange={(e) => store.setWriterPersona(e.target.value)}
              placeholder="예: 이 센터를 운영하는 대표 트레이너입니다. / 10년 경력의 피트니스 트레이너입니다."
              className="min-h-[60px] bg-white border-[#eeeeee] focus:border-[#f72c5b] text-sm resize-none"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {personaTargetRec.personas.map((persona, idx) => (
                <button
                  key={idx}
                  onClick={() => store.setWriterPersona(persona.description)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full border transition-all',
                    store.writerPersona === persona.description
                      ? 'bg-[#f72c5b] text-white border-[#f72c5b]'
                      : 'bg-white text-[#6b7280] border-[#eeeeee] hover:border-[#f72c5b]/50'
                  )}
                >
                  {idx === 0 && <Star className="w-3 h-3 inline mr-1 text-[#f7a600]" />}
                  {persona.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Reader */}
          <div className="space-y-2">
            <label className="text-xs text-[#9ca3af] flex items-center gap-1">
              <Target className="w-3 h-3" />
              누가 읽을 글인가요? (타겟 독자)
            </label>
            <Textarea
              value={store.targetReader}
              onChange={(e) => store.setTargetReader(e.target.value)}
              placeholder="예: 강남역 근처에서 퇴근 후 운동할 헬스장을 찾고 있는 20-30대 직장인"
              className="min-h-[60px] bg-white border-[#eeeeee] focus:border-[#10b981] text-sm resize-none"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {personaTargetRec.targets.map((target, idx) => (
                <button
                  key={idx}
                  onClick={() => store.setTargetReader(target.description)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full border transition-all',
                    store.targetReader === target.description
                      ? 'bg-[#10b981] text-white border-[#10b981]'
                      : 'bg-white text-[#6b7280] border-[#eeeeee] hover:border-[#10b981]/50'
                  )}
                >
                  {idx === 0 && <Star className="w-3 h-3 inline mr-1 text-[#f7a600]" />}
                  {target.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search Intent Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
            <Search className="w-4 h-4" />
            검색 의도 선택 (글쓰기 유형)
          </h3>
          {/* AI 추천 표시 */}
          {recommendation.intent && recommendation.reason && (
            <div className="bg-[#f7a600]/10 border border-[#f7a600]/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Star className="w-4 h-4 text-[#f7a600] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-[#111111] font-medium">AI 추천</p>
                  <p className="text-xs text-[#6b7280] mt-1">{recommendation.reason}</p>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {SEARCH_INTENTS.map((intent) => {
              const info = SEARCH_INTENT_INFO[intent];
              const isSelected = store.searchIntent === intent;
              const isRecommended = recommendation.intent === intent;
              const IconComponent = INTENT_ICONS[info.iconName];
              return (
                <button
                  key={intent}
                  onClick={() => store.setSearchIntent(intent)}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all duration-200 relative',
                    isSelected
                      ? 'border-[#f72c5b] bg-[#f72c5b]/5'
                      : isRecommended
                        ? 'border-[#f7a600] bg-[#f7a600]/5'
                        : 'border-[#eeeeee] bg-white hover:border-[#f72c5b]/50'
                  )}
                >
                  {isRecommended && (
                    <div className="absolute -top-2 -right-2 bg-[#f7a600] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      AI 추천
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <IconComponent className={cn(
                      'w-5 h-5',
                      isSelected ? 'text-[#f72c5b]' : isRecommended ? 'text-[#f7a600]' : 'text-[#6b7280]'
                    )} />
                    <span className={cn(
                      'font-semibold',
                      isSelected ? 'text-[#f72c5b]' : 'text-[#111111]'
                    )}>
                      {info.name}
                    </span>
                  </div>
                  <p className="text-xs text-[#6b7280] mb-2">{info.description}</p>
                  <p className="text-xs text-[#9ca3af]">{info.strategy}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            적용되는 최적화 기능
          </h3>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((feature) => (
              <Badge
                key={feature.name}
                variant="outline"
                className={feature.color + ' border px-3 py-1'}
              >
                {feature.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* AI Model Info */}
        <div className="bg-[#f9fafb] rounded-xl p-4 border border-[#eeeeee]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#111111] flex items-center justify-center text-lg font-bold text-white">
              {store.apiProvider === 'gemini' ? 'G' : 'O'}
            </div>
            <div>
              <p className="font-medium text-[#111111]">
                {store.apiProvider === 'gemini' ? 'Google Gemini' : 'OpenAI ChatGPT'}
              </p>
              <p className="text-sm text-[#9ca3af]">AI 텍스트 생성 모델</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="h-12 px-6 border-[#eeeeee] hover:bg-[#f5f5f5] text-[#111111]"
            onClick={() => store.setCurrentStep(2)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            이전
          </Button>
          <Button
            className="flex-1 h-14 text-lg font-bold bg-[#f72c5b] hover:bg-[#d91a4a] text-white transition-all duration-300 shadow-xl shadow-[#f72c5b]/30"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                AI가 글을 작성하고 있습니다...
              </>
            ) : (
              <>
                <Wand2 className="w-6 h-6 mr-3" />
                블로그 글 생성하기
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
