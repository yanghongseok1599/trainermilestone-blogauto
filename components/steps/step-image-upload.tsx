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

export function StepImageUpload() {
  const { images, apiProvider, apiKey, category, businessName, mainKeyword, targetAudience, uniquePoint, imageAnalysisContext, addImage, removeImage, updateImageAnalysis, setImageAnalysisContext, setCurrentStep } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  // 분석되지 않은 이미지가 있는지 확인
  const hasUnanalyzedImages = images.length > 0 && images.some(img => !img.analysis);

  const handleNextStep = () => {
    if (hasUnanalyzedImages) {
      setShowSkipDialog(true);
    } else {
      setCurrentStep(3);
    }
  };

  const handleFiles = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          addImage({
            id: crypto.randomUUID(),
            file,
            dataUrl,
            base64: dataUrl.split(',')[1],
            mimeType: file.type,
          });
        };
        reader.readAsDataURL(file);
      }
    });
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

    setIsAnalyzing(true);
    toast.info('이미지 분석을 시작합니다...');

    for (const img of images) {
      try {
        const endpoint = apiProvider === 'gemini' ? '/api/gemini/analyze' : '/api/openai/analyze';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey,
            image: { mimeType: img.mimeType, data: img.base64 },
            category,
            businessInfo: {
              businessName,
              mainKeyword,
              targetAudience,
              uniquePoint,
            },
            context: imageAnalysisContext,
          }),
        });

        const data = await response.json();
        if (data.analysis) {
          updateImageAnalysis(img.id, data.analysis);
        } else if (data.error) {
          updateImageAnalysis(img.id, `분석 오류: ${data.error}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        updateImageAnalysis(img.id, `분석 실패: ${errorMessage}`);
      }
    }

    setIsAnalyzing(false);
    toast.success('이미지 분석이 완료되었습니다');
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
              <Sparkles className="w-5 h-5 text-[#f7a600] absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-[#111111]">AI가 이미지를 분석하고 있습니다</p>
              <p className="text-sm text-[#6b7280] mt-1">잠시만 기다려주세요...</p>
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
        {/* Upload Zone */}
        <div
          className={cn(
            'relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300',
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
              'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
              isDragging ? 'bg-[#f72c5b]/20' : 'bg-[#eeeeee]/50'
            )}>
              <Upload className={cn('w-8 h-8', isDragging ? 'text-[#f72c5b]' : 'text-[#6b7280]')} />
            </div>
            <div>
              <p className="font-medium text-lg">클릭하거나 이미지를 드래그하세요</p>
              <p className="text-sm text-muted-foreground mt-1">시설, 운동, 트레이너, 회원 사진 등</p>
            </div>
          </div>
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="space-y-4">
            {/* 분석 참고 내용 입력 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
                <Info className="w-4 h-4" />
                분석 참고 내용 (선택사항)
              </label>
              <Textarea
                value={imageAnalysisContext}
                onChange={(e) => setImageAnalysisContext(e.target.value)}
                placeholder="예: 바디플로우짐은 강남역 3번 출구에 위치한 프리미엄 피트니스 센터입니다. 국가공인 자격증을 보유한 전문 트레이너들이 1:1 맞춤 지도를 제공합니다."
                className="min-h-[80px] bg-white border-[#eeeeee] focus:border-[#f72c5b] text-sm resize-none"
              />
              <p className="text-xs text-[#9ca3af]">
                업체명, 트레이너 정보, 사진 촬영 배경 등을 입력하면 더 정확한 분석이 가능합니다
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
                    <div className="absolute inset-0 bg-[#f72c5b]/20 flex items-center justify-center">
                      <span className="text-xs font-medium bg-[#f72c5b] text-white px-3 py-1 rounded-full shadow-lg">
                        분석완료
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
            onClick={() => setCurrentStep(1)}
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
              <AlertDialogTitle className="flex items-center gap-2 text-[#f7a600]">
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
                onClick={() => setCurrentStep(3)}
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
