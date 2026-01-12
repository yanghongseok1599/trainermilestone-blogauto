'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ImagePlus, Sparkles, Copy, Wand2, Trash2, Image, Loader2, Download, Key, AlertCircle, Play, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseImagePrompts, categoryStyles, type ParsedImagePrompt } from '@/lib/image-prompt-utils';
import { useAppStore } from '@/lib/store';
import { AuthGuard } from '@/components/auth-guard';

type ApiProvider = 'openai' | 'gemini';

// 모델 목록 정의
const OPENAI_MODELS = [
  { id: 'gpt-image-1', name: 'GPT Image 1 (최신)', description: 'GPT-4o 기반 최신 이미지 생성 모델' },
  { id: 'dall-e-3', name: 'DALL-E 3', description: '고품질 이미지 생성' },
  { id: 'dall-e-2', name: 'DALL-E 2', description: '빠른 생성, 저렴한 비용' },
];

const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash-exp-image-generation', name: 'Gemini 2.0 Flash (이미지)', description: '빠른 이미지 생성 특화' },
  { id: 'imagen-3.0-generate-002', name: 'Imagen 3 (최신)', description: 'Google 최신 이미지 생성 모델' },
  { id: 'imagen-3.0-generate-001', name: 'Imagen 3', description: 'Google 고품질 이미지 생성' },
  { id: 'imagen-3.0-fast-generate-001', name: 'Imagen 3 Fast', description: '빠른 생성, 낮은 비용' },
];

interface ImageWithGeneration extends ParsedImagePrompt {
  generatedUrl?: string;
  isGenerating?: boolean;
  error?: string;
}

function ImageGeneratorContent() {
  const searchParams = useSearchParams();
  const { extractedImagePrompts, category: storeCategory, setExtractedImagePrompts, apiKey: storeApiKey, apiProvider: storeApiProvider } = useAppStore();
  const [inputPrompt, setInputPrompt] = useState('');
  const [category, setCategory] = useState('');
  const [parsedImages, setParsedImages] = useState<ImageWithGeneration[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState<ApiProvider>('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-image-1');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [hasLoadedFromStore, setHasLoadedFromStore] = useState(false);
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);

  const currentModels = apiProvider === 'openai' ? OPENAI_MODELS : GEMINI_MODELS;

  // URL 파라미터에서 프롬프트 로드 (리믹스 기능)
  useEffect(() => {
    if (hasLoadedFromUrl) return;

    const promptFromUrl = searchParams.get('prompt');
    if (promptFromUrl) {
      const decodedPrompt = decodeURIComponent(promptFromUrl);
      // 프롬프트를 [이미지: ] 형식으로 변환
      setInputPrompt(`[이미지: ${decodedPrompt}]`);
      setHasLoadedFromUrl(true);
      toast.success('프롬프트 모음에서 프롬프트를 가져왔습니다. 분석 버튼을 클릭하세요!');
    }
  }, [searchParams, hasLoadedFromUrl]);

  // 저장된 API 키 로드
  useEffect(() => {
    // 먼저 store에서 로드 시도
    if (storeApiKey) {
      setApiKey(storeApiKey);
      if (storeApiProvider === 'openai' || storeApiProvider === 'gemini') {
        setApiProvider(storeApiProvider as ApiProvider);
        setSelectedModel(storeApiProvider === 'openai' ? 'gpt-image-1' : 'gemini-2.0-flash-exp-image-generation');
      }
    } else {
      // localStorage에서 로드
      const savedApiKey = localStorage.getItem('blogbooster_api_key');
      const savedApiProvider = localStorage.getItem('blogbooster_api_provider');

      if (savedApiKey) {
        setApiKey(savedApiKey);
      }
      if (savedApiProvider === 'openai' || savedApiProvider === 'gemini') {
        setApiProvider(savedApiProvider as ApiProvider);
        setSelectedModel(savedApiProvider === 'openai' ? 'gpt-image-1' : 'gemini-2.0-flash-exp-image-generation');
      }
    }
  }, [storeApiKey, storeApiProvider]);

  // 블로그 본문에서 연동된 이미지 프롬프트가 있으면 자동 로드
  useEffect(() => {
    if (extractedImagePrompts.length > 0 && !hasLoadedFromStore) {
      // 카테고리 설정
      if (storeCategory) {
        setCategory(storeCategory);
      }

      // 프롬프트를 파싱된 형태로 변환
      const loadedPrompts: ImageWithGeneration[] = extractedImagePrompts.map((prompt, idx) => ({
        id: `img-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        korean: prompt.korean,
        english: prompt.english,
        index: idx,
        generatedUrl: undefined,
        isGenerating: false,
        error: undefined,
      }));

      setParsedImages(loadedPrompts);
      setHasLoadedFromStore(true);

      // 한글 프롬프트 목록을 입력창에도 표시
      const koreanPromptText = extractedImagePrompts.map(p => `[이미지: ${p.korean}]`).join('\n');
      setInputPrompt(koreanPromptText);

      toast.success(`블로그 본문에서 ${extractedImagePrompts.length}개의 이미지 프롬프트를 불러왔습니다`);

      // 연동 완료 후 store 초기화 (중복 로드 방지)
      setExtractedImagePrompts([]);
    }
  }, [extractedImagePrompts, storeCategory, hasLoadedFromStore, setExtractedImagePrompts]);

  const handleParse = useCallback(() => {
    if (!inputPrompt.trim()) {
      toast.error('프롬프트를 입력해주세요');
      return;
    }

    const parsed = parseImagePrompts(inputPrompt, category);

    if (parsed.length === 0) {
      toast.error('[이미지: 설명] 형식의 프롬프트를 찾을 수 없습니다');
      return;
    }

    setParsedImages(parsed.map(p => ({ ...p, generatedUrl: undefined, isGenerating: false, error: undefined })));
    toast.success(`${parsed.length}개의 이미지 프롬프트가 분석되었습니다`);
  }, [inputPrompt, category]);

  const generateImage = async (id: string) => {
    if (!apiKey.trim()) {
      toast.error(`${apiProvider === 'openai' ? 'OpenAI' : 'Gemini'} API 키를 입력해주세요`);
      return;
    }

    const imageIndex = parsedImages.findIndex(img => img.id === id);
    if (imageIndex === -1) return;

    const image = parsedImages[imageIndex];

    // Set loading state
    setParsedImages(prev => prev.map(img =>
      img.id === id ? { ...img, isGenerating: true, error: undefined } : img
    ));

    try {
      const endpoint = apiProvider === 'openai'
        ? '/api/openai/generate-image'
        : '/api/gemini/generate-image';

      const body = apiProvider === 'openai'
        ? {
            apiKey,
            prompt: image.english,
            model: selectedModel,
            size: '1024x1024',
            quality: 'standard',
          }
        : {
            apiKey,
            prompt: image.english,
            model: selectedModel,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '이미지 생성 실패');
      }

      setParsedImages(prev => prev.map(img =>
        img.id === id ? { ...img, generatedUrl: data.imageUrl, isGenerating: false } : img
      ));

      toast.success(`이미지 ${imageIndex + 1} 생성 완료!`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '이미지 생성 실패';
      setParsedImages(prev => prev.map(img =>
        img.id === id ? { ...img, isGenerating: false, error: errorMessage } : img
      ));
      toast.error(errorMessage);
    }
  };

  const generateAllImages = async () => {
    if (!apiKey.trim()) {
      toast.error(`${apiProvider === 'openai' ? 'OpenAI' : 'Gemini'} API 키를 입력해주세요`);
      return;
    }

    const imagesToGenerate = parsedImages.filter(img => !img.generatedUrl && !img.isGenerating);
    if (imagesToGenerate.length === 0) {
      toast.info('생성할 이미지가 없습니다');
      return;
    }

    setIsGeneratingAll(true);
    toast.info(`${imagesToGenerate.length}개의 이미지 생성을 시작합니다...`);

    for (const image of imagesToGenerate) {
      await generateImage(image.id);
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, apiProvider === 'openai' ? 1000 : 2000));
    }

    setIsGeneratingAll(false);
    toast.success('모든 이미지 생성이 완료되었습니다!');
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      // Handle base64 data URLs differently
      if (url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.png`;
        a.click();
        toast.success('이미지가 다운로드되었습니다');
        return;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${filename}.png`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      toast.success('이미지가 다운로드되었습니다');
    } catch {
      toast.error('다운로드 실패');
    }
  };

  const copyAllPrompts = async () => {
    const allPrompts = parsedImages.map((item, idx) => `${idx + 1}. ${item.english}`).join('\n\n');
    try {
      await navigator.clipboard.writeText(allPrompts);
      toast.success(`${parsedImages.length}개의 프롬프트가 전체 복사되었습니다`);
    } catch {
      toast.error('복사 실패');
    }
  };

  const removeImage = (id: string) => {
    setParsedImages(prev => prev.filter(img => img.id !== id));
    toast.success('이미지가 삭제되었습니다');
  };

  const clearAll = () => {
    setParsedImages([]);
    setInputPrompt('');
    toast.success('모두 초기화되었습니다');
  };

  const generatedCount = parsedImages.filter(img => img.generatedUrl).length;
  const generatingCount = parsedImages.filter(img => img.isGenerating).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f5f5f5] py-12 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111111] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </Link>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f72c5b] to-[#ff6b6b] flex items-center justify-center mx-auto mb-4">
            <ImagePlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#111111] mb-4">
            AI 이미지 생성기
          </h1>
          <p className="text-[#6b7280] text-lg">
            OpenAI DALL-E 또는 Google Gemini로 블로그용 이미지를 자동 생성합니다
          </p>
        </div>

        {/* API Selection & Key Section */}
        <Card className="mb-6 border-[#eeeeee] shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Key className="w-5 h-5 text-[#f72c5b]" />
              API 설정
            </CardTitle>
            <CardDescription>
              이미지 생성에 사용할 AI 모델과 API 키를 설정하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* API Provider Selection */}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-sm font-medium text-[#111111] whitespace-nowrap">
                AI 제공자:
              </label>
              <div className="flex gap-2">
                <Button
                  variant={apiProvider === 'openai' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setApiProvider('openai');
                    setSelectedModel('gpt-image-1');
                    setApiKey('');
                  }}
                  className={apiProvider === 'openai'
                    ? 'bg-[#10b981] hover:bg-[#059669] text-white'
                    : 'border-[#eeeeee]'
                  }
                >
                  OpenAI
                </Button>
                <Button
                  variant={apiProvider === 'gemini' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setApiProvider('gemini');
                    setSelectedModel('gemini-2.0-flash-exp-image-generation');
                    setApiKey('');
                  }}
                  className={apiProvider === 'gemini'
                    ? 'bg-[#4285f4] hover:bg-[#3367d6] text-white'
                    : 'border-[#eeeeee]'
                  }
                >
                  Google
                </Button>
              </div>
            </div>

            {/* Model Selection */}
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-sm font-medium text-[#111111] whitespace-nowrap">
                모델 선택:
              </label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-64 border-[#eeeeee]">
                  <SelectValue placeholder="모델 선택" />
                </SelectTrigger>
                <SelectContent>
                  {currentModels.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{model.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#6b7280]">
                {currentModels.find(m => m.id === selectedModel)?.description}
              </p>
            </div>

            {/* API Key Input */}
            <div className="flex gap-3">
              <Input
                type="password"
                placeholder={apiProvider === 'openai' ? 'sk-...' : 'API 키 입력'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 h-11 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
              />
              {apiKey && (
                <div className="flex items-center text-xs text-[#10b981]">
                  <Sparkles className="w-4 h-4 mr-1" />
                  키 입력됨
                </div>
              )}
            </div>

            {/* API Info */}
            <div className={`rounded-lg p-3 text-sm ${
              apiProvider === 'openai' ? 'bg-[#10b981]/10' : 'bg-[#4285f4]/10'
            }`}>
              {apiProvider === 'openai' ? (
                <div className="text-[#059669]">
                  <p className="font-medium mb-1">OpenAI 이미지 생성</p>
                  <ul className="text-xs space-y-0.5">
                    {selectedModel === 'gpt-image-1' && (
                      <>
                        <li>• GPT-4o 기반 최신 이미지 생성 모델</li>
                        <li>• 더 정확한 프롬프트 이해 및 고품질 출력</li>
                      </>
                    )}
                    {selectedModel === 'dall-e-3' && (
                      <>
                        <li>• 고품질 이미지 생성 (1024x1024)</li>
                        <li>• 이미지당 약 $0.04 비용</li>
                      </>
                    )}
                    {selectedModel === 'dall-e-2' && (
                      <>
                        <li>• 빠른 생성 속도</li>
                        <li>• 이미지당 약 $0.02 비용 (저렴)</li>
                      </>
                    )}
                    <li>• API 키: platform.openai.com에서 발급</li>
                  </ul>
                </div>
              ) : (
                <div className="text-[#3367d6]">
                  <p className="font-medium mb-1">Google 이미지 생성</p>
                  <ul className="text-xs space-y-0.5">
                    {selectedModel.includes('gemini') && (
                      <>
                        <li>• Gemini 2.0 Flash 이미지 생성</li>
                        <li>• 무료 (일일 한도 내)</li>
                      </>
                    )}
                    {selectedModel.includes('imagen') && (
                      <>
                        <li>• Google Imagen 3 - 최고 품질 이미지 생성</li>
                        <li>• 사실적인 이미지 및 텍스트 렌더링</li>
                      </>
                    )}
                    <li>• API 키: aistudio.google.com에서 발급</li>
                  </ul>
                </div>
              )}
            </div>

            <p className="text-xs text-[#9ca3af]">
              API 키는 서버에 저장되지 않으며, 이미지 생성 요청에만 사용됩니다
            </p>
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card className="mb-8 border-[#eeeeee] shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wand2 className="w-5 h-5 text-[#f72c5b]" />
              프롬프트 입력
            </CardTitle>
            <CardDescription>
              블로그 자동화에서 생성된 글이나 [이미지: 설명] 형식이 포함된 텍스트를 붙여넣으세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Selection */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-[#111111] whitespace-nowrap">
                업종 카테고리 (선택):
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-48 border-[#eeeeee]">
                  <SelectValue placeholder="업종 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함</SelectItem>
                  {Object.keys(categoryStyles).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#6b7280]">
                업종을 선택하면 해당 분위기에 맞는 프롬프트가 추가됩니다
              </p>
            </div>

            {/* Text Input */}
            <Textarea
              placeholder={`[이미지: 러닝머신 20대와 사이클 10대가 배치된 넓은 유산소 존]
[이미지: PT 전문 트레이너가 회원에게 스쿼트 자세를 교정하는 모습]
[이미지: 월 5만원부터 시작하는 3개월 등록 할인 가격표]

위와 같은 형식으로 프롬프트를 입력하세요...`}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              className="min-h-[200px] bg-white border-[#eeeeee] focus:border-[#f72c5b] resize-none font-mono text-sm"
            />

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                className="flex-1 h-12 text-base font-semibold bg-[#f72c5b] hover:bg-[#e0264f] text-white"
                onClick={handleParse}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                프롬프트 분석하기
              </Button>
              {parsedImages.length > 0 && (
                <Button
                  variant="outline"
                  className="h-12 px-6 border-[#eeeeee] hover:bg-[#f5f5f5]"
                  onClick={clearAll}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  초기화
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Parsed Images Section */}
        {parsedImages.length > 0 && (
          <div className="space-y-6">
            {/* Blog Content Connection Banner */}
            {hasLoadedFromStore && (
              <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#10b981]">
                    블로그 본문과 연동됨
                  </p>
                  <p className="text-xs text-[#059669]">
                    블로그 자동화에서 생성된 이미지 프롬프트가 자동으로 불러와졌습니다
                  </p>
                </div>
              </div>
            )}

            {/* Header with Action Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-[#111111] flex items-center gap-2">
                <Image className="w-6 h-6 text-[#10b981]" />
                분석된 이미지 ({parsedImages.length}개)
                {generatedCount > 0 && (
                  <span className="text-sm font-normal text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded-full">
                    {generatedCount}개 생성됨
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className={apiProvider === 'openai'
                    ? 'bg-[#10b981] hover:bg-[#059669] text-white'
                    : 'bg-[#4285f4] hover:bg-[#3367d6] text-white'
                  }
                  onClick={generateAllImages}
                  disabled={isGeneratingAll || generatingCount > 0 || !apiKey}
                >
                  {isGeneratingAll || generatingCount > 0 ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      생성 중... ({generatingCount})
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-1" />
                      전체생성 ({parsedImages.length - generatedCount}개)
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#f72c5b]/50 text-[#f72c5b] hover:bg-[#f72c5b]/10"
                  onClick={copyAllPrompts}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  전체복사 ({parsedImages.length}개)
                </Button>
              </div>
            </div>

            {/* Image Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parsedImages.map((image, idx) => (
                <Card key={image.id} className="border-[#eeeeee] shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#f72c5b]/10 flex items-center justify-center text-[#f72c5b] font-bold text-sm">
                          {idx + 1}
                        </div>
                        <CardTitle className="text-base font-semibold text-[#111111] leading-tight">
                          {image.korean}
                        </CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[#9ca3af] hover:text-[#ef4444] hover:bg-[#ef4444]/10"
                        onClick={() => removeImage(image.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Generated Image Display */}
                    {image.generatedUrl && (
                      <div className="relative rounded-lg overflow-hidden border border-[#eeeeee]">
                        <img
                          src={image.generatedUrl}
                          alt={image.korean}
                          className="w-full h-auto"
                        />
                        <Button
                          size="sm"
                          className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-[#111111] shadow-md"
                          onClick={() => downloadImage(image.generatedUrl!, `image-${idx + 1}`)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          다운로드
                        </Button>
                      </div>
                    )}

                    {/* Error Display */}
                    {image.error && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {image.error}
                      </div>
                    )}

                    {/* English Prompt Display */}
                    <div className="bg-[#f9fafb] rounded-lg p-3 border border-[#eeeeee]">
                      <p className="text-xs text-[#6b7280] mb-1">영문 프롬프트:</p>
                      <p className="text-sm text-[#374151] leading-relaxed break-words line-clamp-3">
                        {image.english}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        className={`flex-1 h-10 text-white ${
                          apiProvider === 'openai'
                            ? 'bg-[#10b981] hover:bg-[#059669]'
                            : 'bg-[#4285f4] hover:bg-[#3367d6]'
                        }`}
                        onClick={() => generateImage(image.id)}
                        disabled={image.isGenerating || !apiKey}
                      >
                        {image.isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            생성 중...
                          </>
                        ) : image.generatedUrl ? (
                          <>
                            <Sparkles className="w-4 h-4 mr-1" />
                            다시 생성
                          </>
                        ) : (
                          <>
                            <ImagePlus className="w-4 h-4 mr-1" />
                            이미지 생성
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-10 px-3 border-[#eeeeee]"
                        onClick={() => {
                          navigator.clipboard.writeText(image.english);
                          toast.success('프롬프트가 복사되었습니다');
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tips Section */}
            <Card className={apiProvider === 'openai' ? 'border-[#10b981]/30 bg-[#10b981]/5' : 'border-[#4285f4]/30 bg-[#4285f4]/5'}>
              <CardContent className="py-4">
                <h3 className="font-semibold text-[#111111] mb-2 flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${apiProvider === 'openai' ? 'text-[#10b981]' : 'text-[#4285f4]'}`} />
                  사용 팁 ({apiProvider === 'openai' ? 'OpenAI DALL-E' : 'Google Gemini'})
                </h3>
                <ul className="text-sm text-[#6b7280] space-y-1">
                  {apiProvider === 'openai' ? (
                    <>
                      <li>1. OpenAI API 키를 입력하면 DALL-E 3로 이미지를 직접 생성할 수 있습니다</li>
                      <li>2. "전체생성" 버튼으로 모든 이미지를 순차적으로 생성합니다</li>
                      <li>3. 생성된 이미지는 다운로드 버튼으로 저장할 수 있습니다</li>
                      <li>4. 이미지 1장당 약 $0.04 (DALL-E 3 standard) 비용이 발생합니다</li>
                    </>
                  ) : (
                    <>
                      <li>1. Google AI Studio에서 API 키를 발급받으세요 (무료)</li>
                      <li>2. Gemini 2.0 Flash의 실험적 이미지 생성 기능을 사용합니다</li>
                      <li>3. 일일 무료 한도 내에서 이미지를 생성할 수 있습니다</li>
                      <li>4. 이미지 품질이나 안정성은 OpenAI보다 낮을 수 있습니다</li>
                    </>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {parsedImages.length === 0 && (
          <Card className="border-2 border-dashed border-[#e5e5e5] bg-white/50">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-[#f72c5b]/10 flex items-center justify-center mx-auto mb-4">
                <ImagePlus className="w-10 h-10 text-[#f72c5b]" />
              </div>
              <h3 className="text-xl font-semibold text-[#111111] mb-2">
                프롬프트를 입력하세요
              </h3>
              <p className="text-[#6b7280] mb-6 max-w-md mx-auto">
                블로그 자동화에서 생성된 글을 위 입력창에 붙여넣고
                <br />
                "프롬프트 분석하기" 버튼을 클릭하세요
              </p>
              <div className="bg-[#f5f5f5] rounded-xl p-6 max-w-lg mx-auto text-left">
                <h4 className="font-semibold text-[#111111] mb-3">지원하는 형식</h4>
                <ul className="text-sm text-[#6b7280] space-y-2">
                  <li>• [이미지: 러닝머신 20대가 배치된 유산소 존]</li>
                  <li>• [이미지: PT 트레이너가 회원을 지도하는 모습]</li>
                  <li>• [이미지: 50평 규모의 프리웨이트 존]</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ImageGeneratorPage() {
  return (
    <AuthGuard>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f72c5b]"></div>
        </div>
      }>
        <ImageGeneratorContent />
      </Suspense>
    </AuthGuard>
  );
}
