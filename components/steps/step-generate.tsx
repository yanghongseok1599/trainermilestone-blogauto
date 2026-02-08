'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Wand2, ArrowLeft, Check, Sparkles, Star, Edit3, User, Target, AlertTriangle, ExternalLink, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FitnessCategory } from '@/types';
import { generate333Prompt, CONTENT_TYPE_INFO, ContentType } from '@/lib/prompts';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { generateRagContext, generateSimpleRagContext } from '@/lib/embedding-service';
import { isSupabaseConfigured } from '@/lib/supabase';
import { validateGeneratedContent } from '@/lib/post-validate';
import { getMyTeamMembership, getTeamOwnerApiSettings } from '@/lib/team-service';
import { loadApiSettings, saveApiSettings } from '@/lib/firestore-service';

const FEATURES = [
  { name: '333법칙', color: 'bg-[#f72c5b]/10 text-[#f72c5b] border-[#f72c5b]/30' },
  { name: '데이터베이스화', color: 'bg-[#111111]/10 text-[#111111] border-[#111111]/30' },
  { name: 'Q&A 형식', color: 'bg-[#f72c5b]/10 text-[#f72c5b] border-[#f72c5b]/30' },
  { name: '속성값 명시', color: 'bg-[#111111]/10 text-[#111111] border-[#111111]/30' },
  { name: '요약표', color: 'bg-[#f72c5b]/10 text-[#f72c5b] border-[#f72c5b]/30' },
  { name: '문맥 일치도', color: 'bg-[#111111]/10 text-[#111111] border-[#111111]/30' },
  { name: '체크리스트', color: 'bg-[#f72c5b]/10 text-[#f72c5b] border-[#f72c5b]/30' },
  { name: 'CTA 최적화', color: 'bg-[#111111]/10 text-[#111111] border-[#111111]/30' },
];

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
    '바레': [
      { label: '원장', description: '바레 스튜디오를 운영하는 원장 시점' },
      { label: '강사', description: '바레 전문 강사 시점' },
      { label: 'FC(상담사)', description: '회원 상담과 등록을 담당하는 FC 시점' },
    ],
    '기타': [
      { label: '대표/원장', description: '해당 시설을 운영하는 대표 시점' },
      { label: '전문 강사/코치', description: '회원을 지도하는 전문 강사 시점' },
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
    '바레': [
      { label: '체형 교정 관심자', description: '자세 교정과 체형 관리에 관심 있는 여성' },
      { label: '바레 입문자', description: '바레를 처음 시작하려는 20-40대 여성' },
      { label: '발레 기초 배우고 싶은 자', description: '발레 동작 기반 운동에 관심 있는 사람' },
    ],
    '기타': [
      { label: '운동 시설 찾는 사람', description: '주변에서 해당 운동 시설을 찾는 사람' },
      { label: '운동 입문자', description: '해당 운동을 처음 시작하려는 사람' },
      { label: '운동 재시작자', description: '오래 쉬다가 다시 운동을 시작하려는 사람' },
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

import { ImageData } from '@/types';

// 이미지 분석 결과를 사람이 읽을 수 있는 요약으로 변환
function buildAnalysisSummary(images: ImageData[]): string {
  return images
    .filter(img => img.analysis && !img.analysis.startsWith('분석 실패') && !img.analysis.startsWith('분석 오류'))
    .map((img, idx) => {
      const j = img.analysisJson;
      if (j) {
        const lines: string[] = [`[사진${idx + 1}]`];
        if (j.placeType) lines.push(`장소: ${j.placeType}`);
        if (j.equipment.length > 0) {
          lines.push(`기구: ${j.equipment.map(e => e.count ? `${e.name} ${e.count}대` : e.name).join(', ')}`);
        }
        if (j.spaceSize) lines.push(`규모: ${j.spaceSize}`);
        if (j.people?.exists && j.people.description) lines.push(`인물: ${j.people.description}`);
        if (j.textFound.length > 0) {
          lines.push(`텍스트: ${j.textFound.map(t => t.raw).join(' / ')}`);
        }
        if (j.brandLogo.length > 0) lines.push(`브랜드: ${j.brandLogo.join(', ')}`);
        if (j.mood?.impression) lines.push(`분위기: ${j.mood.impression}`);
        if (j.claimSupport) lines.push(`활용: ${j.claimSupport}`);
        return lines.join(', ');
      }
      return `[사진${idx + 1}] ${(img.analysis || '').slice(0, 300)}`;
    }).join('\n');
}

export function StepGenerate() {
  const store = useAppStore();
  const { user, getAuthHeaders } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [showQuotaError, setShowQuotaError] = useState(false);
  const keywordGenRef = useRef(false);

  // Firestore에서 저장된 API 키 로드
  useEffect(() => {
    const loadKey = async () => {
      if (user && !store.userApiKey) {
        try {
          const settings = await loadApiSettings(user.uid);
          if (settings?.apiKey) {
            store.setUserApiKey(settings.apiKey);
          }
        } catch { /* ignore */ }
      }
    };
    loadKey();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // 페르소나 & 타겟 추천
  const personaTargetRec = useMemo(() => {
    return getPersonaTargetRecommendation(store.category, store.targetAudience);
  }, [store.category, store.targetAudience]);

  // 키워드 자동 생성 함수
  const generateKeywords = useCallback(async () => {
    if (!store.mainKeyword.trim()) return;

    setIsGeneratingKeywords(true);
    try {
      // API 키 결정: 개인 키 > 팀 소유자 키
      let resolvedApiKey = store.userApiKey || '';
      if (!resolvedApiKey && user) {
        try {
          const membership = await getMyTeamMembership(user.uid);
          if (membership) {
            const ownerSettings = await getTeamOwnerApiSettings(membership.ownerId);
            if (ownerSettings?.apiKey) resolvedApiKey = ownerSettings.apiKey;
          }
        } catch { /* ignore */ }
      }

      const authHeaders = await getAuthHeaders();
      const kwEndpoint = store.apiProvider === 'gemini' ? '/api/gemini/keywords' : '/api/openai/keywords';
      const categoryName = store.category === '기타' && store.customCategoryName ? store.customCategoryName : store.category;
      const analysisSummary = buildAnalysisSummary(store.images);

      // 최대 3회 시도 (서버에서 모델 폴백 처리, 클라이언트는 429 시 대기 후 재시도)
      const retryDelays = [0, 20000, 30000];
      for (let retry = 0; retry < 3; retry++) {
        if (retryDelays[retry] > 0) {
          const delaySec = retryDelays[retry] / 1000;
          toast.info(`키워드 생성 재시도 중... (${delaySec}초 대기)`);
          await new Promise(r => setTimeout(r, retryDelays[retry]));
        }

        const kwResponse = await fetch(kwEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            mainKeyword: store.mainKeyword,
            category: categoryName,
            businessName: store.businessName,
            imageContext: store.imageAnalysisContext || '',
            imageAnalysis: analysisSummary,
            ...(resolvedApiKey ? { apiKey: resolvedApiKey } : {}),
          }),
        });

        if (kwResponse.status === 429) {
          console.warn(`Keyword gen 429, retry ${retry + 1}/3`);
          continue;
        }

        if (!kwResponse.ok) {
          const errData = await kwResponse.json().catch(() => ({ error: `HTTP ${kwResponse.status}` }));
          // 429가 아닌 다른 에러면 재시도하지 않음
          toast.error(`키워드 생성 실패: ${errData.error}`);
          break;
        }

        const kwData = await kwResponse.json();
        if (!kwData.error) {
          const sub = Array.isArray(kwData.subKeywords) ? kwData.subKeywords.map(String) : [];
          while (sub.length < 3) sub.push('');
          store.setSubKeywords(sub.slice(0, 3));

          const tail = Array.isArray(kwData.tailKeywords) ? kwData.tailKeywords.map(String) : [];
          while (tail.length < 3) tail.push('');
          store.setTailKeywords(tail.slice(0, 3));

          if (kwData.titles?.length > 0) store.setCustomTitle(kwData.titles[0]);
          toast.success('키워드와 제목이 자동 생성되었습니다');
          setIsGeneratingKeywords(false);
          return;
        } else {
          toast.error(`키워드 생성 실패: ${kwData.error}`);
          break;
        }
      }
    } catch (err) {
      console.error('키워드 생성 실패:', err);
    }
    setIsGeneratingKeywords(false);
    toast.error('키워드 자동 생성 실패. 아래에서 직접 입력하거나 재시도 버튼을 눌러주세요.');
  }, [store, user, getAuthHeaders]);

  // step 2 진입 시 키워드가 비어있으면 자동 생성
  useEffect(() => {
    if (keywordGenRef.current) return;
    const hasKeywords = store.subKeywords.some(k => k.trim());
    if (!hasKeywords && store.mainKeyword.trim()) {
      keywordGenRef.current = true;
      generateKeywords();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    setIsGenerating(true);
    toast.info('블로그 글을 생성하고 있습니다...');

    try {
      const prompt = generate333Prompt(store);
      const endpoint = store.apiProvider === 'gemini' ? '/api/gemini/generate' : '/api/openai/generate';

      // API 키 결정: 개인 키 > 팀 소유자 키
      let resolvedApiKey = store.userApiKey || '';
      if (!resolvedApiKey && user) {
        try {
          const membership = await getMyTeamMembership(user.uid);
          if (membership) {
            const ownerSettings = await getTeamOwnerApiSettings(membership.ownerId);
            if (ownerSettings?.apiKey) {
              resolvedApiKey = ownerSettings.apiKey;
            }
          }
        } catch (teamError) {
          console.error('Team API key fetch failed:', teamError);
        }
      }

      // RAG 컨텍스트 생성 (로그인 사용자만)
      let ragContext = '';
      if (user) {
        try {
          if (isSupabaseConfigured()) {
            ragContext = await generateRagContext(
              user.uid,
              store.mainKeyword,
              store.category,
              resolvedApiKey,
              store.apiProvider
            );
          } else {
            ragContext = await generateSimpleRagContext(user.uid);
          }
        } catch (ragError) {
          console.error('RAG context generation failed:', ragError);
        }
      }

      const authHeaders = await getAuthHeaders();

      // 블로그 생성도 429 대비 최대 2회 시도
      let data: { content?: string; error?: string } = {};
      for (let genRetry = 0; genRetry < 2; genRetry++) {
        if (genRetry > 0) {
          toast.info('API 한도 초과로 20초 후 재시도합니다...');
          await new Promise(r => setTimeout(r, 20000));
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            prompt,
            ragContext,
            ...(resolvedApiKey ? { apiKey: resolvedApiKey } : {}),
          }),
        });

        if (response.status === 429) {
          console.warn(`Blog generation 429, retry ${genRetry + 1}/2`);
          continue;
        }

        data = await response.json();
        break;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.content) {
        throw new Error('생성된 콘텐츠가 없습니다. 다시 시도해주세요.');
      }

      // 후처리 검증
      const validation = validateGeneratedContent(data.content);
      const finalContent = validation.autoFixed || data.content;

      store.setGeneratedContent(finalContent);
      store.setCurrentStep(3);

      if (validation.autoFixed) {
        toast.success(`블로그 글 생성 완료! (마크다운/이모지 자동 제거됨, 품질 ${validation.score}점)`);
      } else if (validation.issues.length > 0) {
        const warnings = validation.issues.filter(i => i.type === 'warning').length;
        toast.success(`블로그 글 생성 완료! (품질 ${validation.score}점, 주의사항 ${warnings}건)`);
      } else {
        toast.success('블로그 글이 생성되었습니다!');
      }

      // 활동 기록
      if (user) {
        import('@/lib/activity-log').then(({ logActivity }) => {
          logActivity(user.uid, 'blog_generate', `"${store.mainKeyword}" 블로그 생성 (품질 ${validation.score}점)`);
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';

      if (errorMessage.toLowerCase().includes('할당량') || errorMessage.toLowerCase().includes('quota') || errorMessage.includes('한도') || errorMessage.includes('429')) {
        setShowQuotaError(true);
      } else {
        toast.error('생성 실패: ' + errorMessage);
      }
    }

    setIsGenerating(false);
  };

  return (
    <>
    {/* API 할당량 초과 알림 다이얼로그 */}
    <Dialog open={showQuotaError} onOpenChange={setShowQuotaError}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#f72c5b]/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-[#f72c5b]" />
            </div>
            <DialogTitle className="text-xl">API 할당량 초과</DialogTitle>
          </div>
          <DialogDescription className="text-base text-[#6b7280]">
            무료 API 할당량이 초과되었습니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-[#f72c5b]/10 rounded-lg p-4 border border-[#f72c5b]/30">
            <h4 className="font-semibold text-[#111111] mb-2">해결 방법</h4>
            <ul className="text-sm text-[#6b7280] space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#f72c5b] font-bold">1.</span>
                <span><strong>잠시 후 재시도</strong> - 약 1분 후 다시 시도해주세요</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#f72c5b] font-bold">2.</span>
                <span><strong>새 API 키 발급</strong> - 다른 계정으로 API 키를 발급받으세요</span>
              </li>
            </ul>
          </div>

          <Button
            className="w-full h-12 bg-[#111111] hover:bg-[#333333] text-white"
            onClick={() => window.open('https://aistudio.google.com/apikey', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Google AI Studio에서 새 API 키 발급
          </Button>

          <Button
            variant="outline"
            className="w-full h-10 border-[#eeeeee]"
            onClick={() => setShowQuotaError(false)}
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <Card className="border border-[#eeeeee] shadow-lg bg-white">
      <CardHeader className="space-y-1 pb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#f72c5b]/10 text-[#f72c5b]">
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
              <p className="font-medium text-[#111111]">{store.category === '기타' && store.customCategoryName ? store.customCategoryName : store.category}</p>
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
              <p className="font-medium text-[#111111]">{store.tailKeywords.filter(k => k).join(', ') || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#9ca3af]">타겟 고객</p>
              <p className="font-medium text-[#111111]">{store.targetAudience || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#9ca3af]">이미지</p>
              <p className="font-medium text-[#111111]">{store.images.length}장 업로드</p>
            </div>
            {store.referenceText.trim() && (
              <div className="space-y-1">
                <p className="text-xs text-[#9ca3af]">참고 글</p>
                <p className="font-medium text-[#111111]">{store.referenceText.length.toLocaleString()}자 입력됨</p>
              </div>
            )}
          </div>
        </div>

        {/* Content Type Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
            <FileText className="w-4 h-4" />
            글 유형 선택
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.entries(CONTENT_TYPE_INFO) as [ContentType, { name: string; experienceElements: number; infoElements: number }][]).map(([key, info]) => (
              <button
                key={key}
                onClick={() => store.setContentType(key)}
                className={cn(
                  'flex flex-col items-start gap-1 px-3 py-3 rounded-xl border text-left transition-all',
                  store.contentType === key
                    ? 'bg-[#f72c5b]/10 border-[#f72c5b] text-[#f72c5b]'
                    : 'bg-white border-[#eeeeee] text-[#6b7280] hover:border-[#f72c5b]/50'
                )}
              >
                <span className="text-sm font-medium">{info.name}</span>
                <span className="text-[10px] opacity-70">
                  경험 {info.experienceElements} : 정보 {info.infoElements}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-[#9ca3af]">
            글 유형에 따라 경험 서사와 정보의 비율이 달라집니다
          </p>
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              키워드 수정 (생성 전 수정 가능)
            </h3>
            {isGeneratingKeywords ? (
              <span className="text-xs text-[#f72c5b] flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                키워드 자동 생성 중...
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-[#f72c5b] hover:bg-[#f72c5b]/10 h-7 px-2"
                onClick={() => { keywordGenRef.current = false; generateKeywords(); }}
                disabled={isGenerating}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                AI 키워드 생성
              </Button>
            )}
          </div>

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
                  className="h-10 bg-white border-[#eeeeee] focus:border-[#f72c5b] text-sm"
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
                  {idx === 0 && <Star className="w-3 h-3 inline mr-1 text-[#f72c5b]" />}
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
              className="min-h-[60px] bg-white border-[#eeeeee] focus:border-[#f72c5b] text-sm resize-none"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {personaTargetRec.targets.map((target, idx) => (
                <button
                  key={idx}
                  onClick={() => store.setTargetReader(target.description)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full border transition-all',
                    store.targetReader === target.description
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'bg-white text-[#6b7280] border-[#eeeeee] hover:border-[#111111]/50'
                  )}
                >
                  {idx === 0 && <Star className="w-3 h-3 inline mr-1 text-[#f72c5b]" />}
                  {target.label}
                </button>
              ))}
            </div>
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

        {/* AI Model Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI 모델 선택
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => store.setApiProvider('gemini')}
              className={cn(
                'rounded-xl p-4 border text-left transition-all',
                store.apiProvider === 'gemini'
                  ? 'bg-[#f72c5b]/10 border-[#f72c5b] ring-1 ring-[#f72c5b]/30'
                  : 'bg-[#f9fafb] border-[#eeeeee] hover:border-[#f72c5b]/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white',
                  store.apiProvider === 'gemini' ? 'bg-[#f72c5b]' : 'bg-[#9ca3af]'
                )}>
                  G
                </div>
                <div>
                  <p className="font-medium text-[#111111]">Google Gemini</p>
                  <p className="text-xs text-[#9ca3af]">Gemini 2.5 Flash (추천)</p>
                </div>
              </div>
              {store.apiProvider === 'gemini' && (
                <div className="mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#f72c5b]" />
                  <span className="text-xs text-[#f72c5b] font-medium">선택됨</span>
                </div>
              )}
            </button>
            <button
              onClick={() => store.setApiProvider('openai')}
              className={cn(
                'rounded-xl p-4 border text-left transition-all',
                store.apiProvider === 'openai'
                  ? 'bg-[#111111]/10 border-[#111111] ring-1 ring-[#111111]/30'
                  : 'bg-[#f9fafb] border-[#eeeeee] hover:border-[#111111]/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white',
                  store.apiProvider === 'openai' ? 'bg-[#111111]' : 'bg-[#9ca3af]'
                )}>
                  O
                </div>
                <div>
                  <p className="font-medium text-[#111111]">OpenAI ChatGPT</p>
                  <p className="text-xs text-[#9ca3af]">GPT-4o mini (저렴)</p>
                </div>
              </div>
              {store.apiProvider === 'openai' && (
                <div className="mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#111111]" />
                  <span className="text-xs text-[#111111] font-medium">선택됨</span>
                </div>
              )}
            </button>
          </div>

          {/* 내 API 키 설정 */}
          <div className="mt-3 p-3 rounded-xl bg-[#f9fafb] border border-[#eeeeee]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-[#6b7280]">
                내 API 키 (선택사항)
              </p>
              {store.userApiKey && (
                <span className="text-xs text-[#03C75A] flex items-center gap-1">
                  <Check className="w-3 h-3" /> 키 저장됨
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={store.apiProvider === 'gemini' ? 'Gemini API 키 입력' : 'OpenAI API 키 입력'}
                value={store.userApiKey}
                onChange={(e) => store.setUserApiKey(e.target.value)}
                onBlur={async () => {
                  if (store.userApiKey.trim() && user) {
                    try {
                      await saveApiSettings(user.uid, store.apiProvider, store.userApiKey.trim());
                      toast.success('API 키가 저장되었습니다');
                    } catch { /* ignore */ }
                  }
                }}
                className="flex-1 h-9 text-sm bg-white border-[#eeeeee] focus:border-[#f72c5b]"
              />
              {store.userApiKey && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-[#9ca3af] hover:text-red-500"
                  onClick={async () => {
                    store.setUserApiKey('');
                    if (user) {
                      try {
                        await saveApiSettings(user.uid, store.apiProvider, '');
                      } catch { /* ignore */ }
                    }
                    toast.success('API 키가 삭제되었습니다');
                  }}
                >
                  삭제
                </Button>
              )}
            </div>
            <p className="text-[10px] text-[#9ca3af] mt-1.5">
              내 API 키를 입력하면 사이트 한도 제한 없이 무제한 사용 가능합니다
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="h-12 px-6 border-[#eeeeee] hover:bg-[#f5f5f5] text-[#111111]"
            onClick={() => store.setCurrentStep(1)}
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
    </>
  );
}
