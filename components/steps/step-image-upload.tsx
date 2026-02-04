'use client';

import { useCallback, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Upload, X, Loader2, ImageIcon, Sparkles, ArrowRight, ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { getMyTeamMembership, getTeamOwnerApiSettings } from '@/lib/team-service';

/**
 * 이미지를 Canvas로 리사이즈 & 압축하여 base64 반환
 * 최대 1200px, JPEG quality 0.7 → Vercel 4.5MB 제한 내 유지
 */
function compressImage(file: File, maxSize = 1200, quality = 0.7): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context failed')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];
      resolve({ dataUrl, base64, mimeType: 'image/jpeg' });
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Image load failed')); };
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
}

export function StepImageUpload() {
  const { images, apiProvider, category, businessName, mainKeyword, targetAudience, uniquePoint, imageAnalysisContext, customCategoryName, addImage, removeImage, updateImageAnalysis, setImageAnalysisContext, setCurrentStep, setSubKeywords, setTailKeywords, setCustomTitle } = useAppStore();
  const { user, getAuthHeaders } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  // 분석되지 않은 이미지가 있는지 확인
  const hasUnanalyzedImages = images.length > 0 && images.some(img => !img.analysis);

  const handleNextStep = () => {
    if (hasUnanalyzedImages) {
      setShowSkipDialog(true);
    } else {
      setCurrentStep(2);
    }
  };

  const handleFiles = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImage(file);
        addImage({
          id: crypto.randomUUID(),
          file,
          dataUrl: compressed.dataUrl,
          base64: compressed.base64,
          mimeType: compressed.mimeType,
        });
      } catch (err) {
        console.error('Image compression failed:', err);
        toast.error(`이미지 압축 실패: ${file.name}`);
      }
    }
  }, [addImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const analyzeImages = async () => {
    if (images.length === 0) {
      toast.error('분석할 이미지가 없습니다');
      return;
    }

    if (!imageAnalysisContext?.trim()) {
      toast.error('분석 참고 내용을 입력해주세요. 업체명, 사진 배경 등을 입력하면 정확한 분석이 가능합니다.');
      return;
    }

    setIsAnalyzing(true);
    toast.info('이미지 분석을 시작합니다...');

    // 팀 멤버인 경우 팀 소유자의 API 키 가져오기
    let teamApiKey = '';
    if (user) {
      try {
        const membership = await getMyTeamMembership(user.uid);
        if (membership) {
          const ownerSettings = await getTeamOwnerApiSettings(membership.ownerId);
          if (ownerSettings?.apiKey) {
            teamApiKey = ownerSettings.apiKey;
          }
        }
      } catch (teamError) {
        console.error('Team API key fetch failed:', teamError);
      }
    }

    // 분석 결과를 로컬에 수집 (클로저 문제 방지)
    const analysisResults: { analysis: string; analysisJson?: Record<string, unknown> }[] = [];
    const authHeaders = await getAuthHeaders();

    const MAX_CLIENT_RETRIES = 2;
    // 재시도 대기 시간: 30초 (rate limit 리셋 대기 - Gemini free tier는 분당 10회 제한)
    const RETRY_DELAYS = [30000];

    for (let i = 0; i < images.length; i++) {
      // 이미지 간 5초 딜레이 (Gemini API rate limit 방지)
      if (i > 0) await new Promise(r => setTimeout(r, 5000));
      const img = images[i];
      let success = false;

      for (let retry = 0; retry < MAX_CLIENT_RETRIES && !success; retry++) {
        try {
          if (retry > 0) {
            const waitMs = RETRY_DELAYS[retry - 1];
            toast.info(`이미지 ${i + 1} 재시도 중... (${waitMs / 1000}초 대기)`);
            await new Promise(r => setTimeout(r, waitMs));
          }

          const endpoint = apiProvider === 'gemini' ? '/api/gemini/analyze' : '/api/openai/analyze';
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({
              image: { mimeType: img.mimeType, data: img.base64 },
              category,
              businessInfo: {
                businessName,
                mainKeyword,
                targetAudience,
                uniquePoint,
              },
              context: imageAnalysisContext,
              ...(teamApiKey ? { apiKey: teamApiKey } : {}),
            }),
          });

          // 429 → 에러 상세 로깅 후 재시도
          if (response.status === 429) {
            let errDetail = 'API 요청 한도 초과';
            try {
              const errData = await response.json();
              errDetail = errData.detail || errData.error || errDetail;
            } catch { /* ignore */ }
            console.warn(`Image ${i + 1} got 429 (retry ${retry + 1}/${MAX_CLIENT_RETRIES}):`, errDetail);
            if (retry === MAX_CLIENT_RETRIES - 1) {
              updateImageAnalysis(img.id, `분석 실패: ${errDetail}`);
              toast.error(`이미지 ${i + 1}: ${errDetail}`);
              success = true; // 더 이상 재시도 안 함
            }
            continue;
          }

          if (!response.ok) {
            let statusText = `서버 오류 (${response.status})`;
            if (response.status === 413) {
              statusText = '이미지가 너무 큽니다. 더 작은 이미지를 사용해주세요.';
            } else {
              try {
                const errData = await response.json();
                statusText = errData.detail || errData.error || statusText;
              } catch { /* ignore */ }
            }
            updateImageAnalysis(img.id, `분석 실패: ${statusText}`);
            success = true; // 에러지만 재시도 불필요
            continue;
          }
          const data = await response.json();
          if (data.analysis) {
            updateImageAnalysis(img.id, data.analysis, data.analysisJson || undefined);
            analysisResults.push({ analysis: data.analysis, analysisJson: data.analysisJson });
          } else if (data.error) {
            updateImageAnalysis(img.id, `분석 오류: ${data.error}`);
          }
          success = true;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
          if (retry === MAX_CLIENT_RETRIES - 1) {
            updateImageAnalysis(img.id, `분석 실패: ${errorMessage}`);
          }
        }
      }

      if (!success) {
        updateImageAnalysis(img.id, '분석 실패: API 요청 한도 초과. 잠시 후 다시 시도해주세요.');
      }
    }

    if (analysisResults.length === 0) {
      setIsAnalyzing(false);
      toast.error('이미지 분석에 실패했습니다. 다시 시도해주세요.');
    } else if (analysisResults.length < images.length) {
      toast.warning(`${analysisResults.length}/${images.length}개 이미지 분석 완료 (일부 실패)`);
    } else {
      toast.success('이미지 분석이 완료되었습니다');
    }

    // 이미지 분석 결과를 사람이 읽을 수 있는 요약으로 변환
    const buildAnalysisSummary = (results: typeof analysisResults): string => {
      return results.map((r, idx) => {
        const j = r.analysisJson as Record<string, unknown> | undefined;
        if (j) {
          const lines: string[] = [`[사진${idx + 1}]`];
          if (j.placeType) lines.push(`장소: ${j.placeType}`);
          if (Array.isArray(j.equipment) && j.equipment.length > 0) {
            lines.push(`기구: ${j.equipment.map((e: { name: string; count?: number }) => e.count ? `${e.name} ${e.count}대` : e.name).join(', ')}`);
          }
          if (j.spaceSize) lines.push(`규모: ${j.spaceSize}`);
          const people = j.people as { exists?: boolean; description?: string } | undefined;
          if (people?.exists && people.description) lines.push(`인물: ${people.description}`);
          if (Array.isArray(j.textFound) && j.textFound.length > 0) {
            lines.push(`사진 속 텍스트: ${j.textFound.map((t: { raw: string }) => t.raw).join(' / ')}`);
          }
          if (Array.isArray(j.numbersFound) && j.numbersFound.length > 0) lines.push(`숫자/가격: ${j.numbersFound.join(', ')}`);
          if (Array.isArray(j.certificates) && j.certificates.length > 0) {
            lines.push(`자격증: ${j.certificates.map((c: { name: string; issuer: string }) => `${c.name}(${c.issuer})`).join(', ')}`);
          }
          if (Array.isArray(j.brandLogo) && j.brandLogo.length > 0) lines.push(`브랜드: ${j.brandLogo.join(', ')}`);
          const mood = j.mood as { impression?: string } | undefined;
          if (mood?.impression) lines.push(`분위기: ${mood.impression}`);
          if (j.claimSupport) lines.push(`활용 포인트: ${j.claimSupport}`);
          return lines.join(', ');
        }
        return `[사진${idx + 1}] ${r.analysis.slice(0, 300)}`;
      }).join('\n');
    };

    // 이미지 분석 완료 후 자동으로 키워드/제목 생성
    if (mainKeyword.trim() && analysisResults.length > 0) {
      const kwEndpoint = apiProvider === 'gemini' ? '/api/gemini/keywords' : '/api/openai/keywords';
      const categoryName = category === '기타' && customCategoryName ? customCategoryName : category;
      const analysisSummary = buildAnalysisSummary(analysisResults);
      const kwBody = {
        mainKeyword,
        category: categoryName,
        businessName,
        imageContext: imageAnalysisContext || '',
        imageAnalysis: analysisSummary,
        ...(teamApiKey ? { apiKey: teamApiKey } : {}),
      };

      // API 한도 방지를 위해 5초 대기 후 최대 2회 시도
      let kwSuccess = false;
      for (let kwRetry = 0; kwRetry < 2 && !kwSuccess; kwRetry++) {
        try {
          const waitSec = kwRetry === 0 ? 5 : 20;
          toast.info(`키워드 자동 생성 중... (${waitSec}초 대기)`);
          await new Promise(r => setTimeout(r, waitSec * 1000));

          const kwResponse = await fetch(kwEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify(kwBody),
          });

          if (kwResponse.status === 429) {
            console.warn(`Keyword generation 429, retry ${kwRetry + 1}/2`);
            continue;
          }

          if (!kwResponse.ok) {
            const errData = await kwResponse.json().catch(() => ({ error: `HTTP ${kwResponse.status}` }));
            console.error('키워드 생성 에러:', errData.error);
            toast.error(`키워드 생성 실패: ${errData.error}`);
            break;
          }

          const kwData = await kwResponse.json();
          if (!kwData.error) {
            const sub = Array.isArray(kwData.subKeywords) ? kwData.subKeywords.map(String) : [];
            while (sub.length < 3) sub.push('');
            setSubKeywords(sub.slice(0, 3));

            const tail = Array.isArray(kwData.tailKeywords) ? kwData.tailKeywords.map(String) : [];
            while (tail.length < 3) tail.push('');
            setTailKeywords(tail.slice(0, 3));

            if (kwData.titles?.length > 0) setCustomTitle(kwData.titles[0]);
            toast.success('키워드와 제목이 자동 생성되었습니다');
            kwSuccess = true;
          } else {
            console.error('키워드 생성 에러:', kwData.error);
            toast.error(`키워드 생성 실패: ${kwData.error}`);
          }
        } catch (kwError) {
          console.error('키워드 자동 생성 실패:', kwError);
        }
      }
      if (!kwSuccess) {
        toast.error('키워드 자동 생성에 실패했습니다. 다음 단계에서 직접 입력해주세요.');
      }
    }

    setIsAnalyzing(false);
  };

  return (
    <Card className="border border-[#eeeeee] shadow-lg bg-white relative overflow-hidden">
      {/* 분석 중 오버레이 */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 border border-[#f72c5b]/20">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#f72c5b]/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#f72c5b] animate-spin" />
              </div>
              <Sparkles className="w-5 h-5 text-[#f72c5b] absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-[#111111]">AI가 이미지를 분석하고 있습니다</p>
              <p className="text-sm text-[#6b7280] mt-1">분석 완료 후 키워드도 자동 생성됩니다</p>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#f72c5b] animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-[#f72c5b] animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-[#f72c5b] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <CardHeader className="space-y-1 pb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#f72c5b]/10 text-[#f72c5b]">
            <ImageIcon className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl">이미지 업로드 및 AI 분석</CardTitle>
        </div>
        <CardDescription className="text-base">업로드된 이미지를 AI가 분석하여 문맥 일치도를 자동으로 맞춰드립니다</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Zone - Optional */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            이미지 업로드 <span className="text-xs text-[#9ca3af]">(선택사항)</span>
          </p>
          <div
            className={cn(
              'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300',
              isDragging
                ? 'border-[#f72c5b] bg-[#f72c5b]/10'
                : 'border-[#eeeeee] hover:border-[#eeeeee] bg-[#f9fafb]/30'
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <input
              id="fileInput"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <div className="flex flex-col items-center gap-3">
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
                isDragging ? 'bg-[#f72c5b]/20' : 'bg-[#eeeeee]/50'
              )}>
                <Upload className={cn('w-7 h-7', isDragging ? 'text-[#f72c5b]' : 'text-[#6b7280]')} />
              </div>
              <div>
                <p className="font-medium text-base">클릭하거나 이미지를 드래그하세요</p>
                <p className="text-sm text-muted-foreground mt-1">시설, 운동, 트레이너, 회원 사진 등</p>
              </div>
            </div>
          </div>
        </div>

        {/* 이미지가 없을 때 안내 */}
        {images.length === 0 && (
          <div className="bg-[#f9fafb] border border-[#eeeeee] rounded-xl p-6 text-center space-y-2">
            <p className="text-sm text-[#6b7280]">
              분석할 이미지가 없으면 아래 <span className="font-semibold text-[#111111]">다음 단계</span> 버튼을 눌러 바로 생성 페이지로 이동하세요
            </p>
          </div>
        )}

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="space-y-4">
            {/* 분석 참고 내용 입력 (필수) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111111] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#f72c5b]" />
                분석 참고 내용 <span className="text-[#f72c5b]">*</span>
              </label>
              <Textarea
                value={imageAnalysisContext}
                onChange={(e) => setImageAnalysisContext(e.target.value)}
                placeholder="예: 바디플로우짐은 강남역 3번 출구에 위치한 프리미엄 피트니스 센터입니다. 국가공인 자격증을 보유한 전문 트레이너들이 1:1 맞춤 지도를 제공합니다."
                className={cn(
                  "min-h-[80px] bg-white text-sm resize-none",
                  !imageAnalysisContext?.trim()
                    ? "border-[#f72c5b]/50 focus:border-[#f72c5b]"
                    : "border-[#eeeeee] focus:border-[#f72c5b]"
                )}
              />
              <p className="text-xs text-[#9ca3af]">
                업체명, 트레이너 정보, 사진 촬영 배경 등을 입력해야 정확한 분석이 가능합니다
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{images.length}개의 이미지</p>
              <Button
                variant="outline"
                size="sm"
                className="border-[#f72c5b]/50 text-[#f72c5b] hover:bg-[#f72c5b]/10"
                onClick={analyzeImages}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 분석 시작
                  </>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-[#eeeeee] bg-[#f9fafb]">
                  <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500/90 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {img.analysis && (
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center",
                      img.analysis.startsWith('분석 실패') || img.analysis.startsWith('분석 오류')
                        ? "bg-red-500/20"
                        : "bg-[#f72c5b]/20"
                    )}>
                      <span className={cn(
                        "text-xs font-medium text-white px-3 py-1 rounded-full shadow-lg",
                        img.analysis.startsWith('분석 실패') || img.analysis.startsWith('분석 오류')
                          ? "bg-red-500"
                          : "bg-[#f72c5b]"
                      )}>
                        {img.analysis.startsWith('분석 실패') || img.analysis.startsWith('분석 오류') ? '분석실패' : '분석완료'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {images.some((img) => img.analysis) && (
          <div className="space-y-3">
            <h3 className="font-medium text-[#f72c5b] flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              분석 결과
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {images.filter((img) => img.analysis).map((img, idx) => (
                <div key={img.id} className="bg-white border-[#eeeeee] rounded-xl p-4 border border-[#f72c5b]/20">
                  <p className="text-sm font-medium text-[#f72c5b] mb-2">이미지 {idx + 1}</p>
                  <p className="text-sm text-[#111111] whitespace-pre-wrap leading-relaxed">{img.analysis}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="h-12 px-6 border-[#eeeeee] hover:bg-[#f5f5f5]"
            onClick={() => setCurrentStep(0)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            이전
          </Button>
          <Button
            className="flex-1 h-12 text-base font-semibold bg-[#111111] text-white hover:bg-[#333333] transition-all duration-300 shadow-lg"
            onClick={handleNextStep}
          >
            다음 단계
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* 이미지 분석 스킵 확인 다이얼로그 */}
        <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-[#f72c5b]">
                <AlertTriangle className="w-5 h-5" />
                이미지 분석을 건너뛸까요?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[#6b7280]">
                {images.filter(img => !img.analysis).length}개의 이미지가 아직 분석되지 않았습니다.
                <br /><br />
                이미지 분석을 하면 AI가 사진 내용을 파악하여 블로그 글에 자연스럽게 반영할 수 있습니다.
                <br /><br />
                <span className="text-[#f72c5b] font-medium">분석 없이 진행하면 문맥 일치도가 낮아질 수 있습니다.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="border-[#eeeeee]">
                분석하기
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-[#6b7280] hover:bg-[#4b5563]"
                onClick={() => setCurrentStep(2)}
              >
                분석 없이 진행
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
