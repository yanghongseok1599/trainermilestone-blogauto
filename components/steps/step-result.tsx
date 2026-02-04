'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { savePreset as savePresetToFirestore } from '@/lib/firestore-service';
import { savePost } from '@/lib/post-service';
import { savePostWithEmbedding } from '@/lib/embedding-service';
import { PostType, POST_TYPE_INFO } from '@/types/post';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, Download, RefreshCw, Save, FileText, Sparkles, Loader2, Pencil, Image, ExternalLink, ImagePlus, X, CloudUpload, CheckCircle2 } from 'lucide-react';
import { CardGenerator } from '@/components/card-generator';
import { generateModifyPrompt } from '@/lib/prompts';
import { generateEnglishPrompt } from '@/lib/image-prompt-utils';

export function StepResult() {
  const store = useAppStore();
  const { user, getAuthHeaders } = useAuth();
  const { generatedContent, businessName, category, setCurrentStep, reset, setGeneratedContent, apiProvider, setExtractedImagePrompts, mainKeyword, searchIntent } = store;
  const [presetName, setPresetName] = useState('');
  const [modifyRequest, setModifyRequest] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [postSaved, setPostSaved] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState<PostType>('center_intro');

  // Extract image prompts from generated content
  const imagePrompts = useMemo(() => {
    const regex = /\[이미지:\s*([^\]]+)\]/g;
    const matches: { korean: string; english: string }[] = [];
    let match;

    while ((match = regex.exec(generatedContent)) !== null) {
      const korean = match[1].trim();
      const english = generateEnglishPrompt(korean, category);
      matches.push({ korean, english });
    }

    return matches;
  }, [generatedContent, category]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast.success('클립보드에 복사되었습니다');
    } catch {
      toast.error('복사 실패');
    }
  };

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success('영문 프롬프트가 복사되었습니다');
    } catch {
      toast.error('복사 실패');
    }
  };

  const downloadResult = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${businessName}_블로그글_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('파일이 다운로드되었습니다');
  };

  const handleModify = async () => {
    if (!modifyRequest.trim()) {
      toast.error('수정 요청을 입력해주세요');
      return;
    }

    setIsModifying(true);
    toast.info('글을 수정하고 있습니다...');

    try {
      const prompt = generateModifyPrompt(generatedContent, modifyRequest);
      const endpoint = apiProvider === 'gemini' ? '/api/gemini/generate' : '/api/openai/generate';
      const authHeaders = await getAuthHeaders();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          prompt,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedContent(data.content);
      setModifyRequest('');
      toast.success('글이 수정되었습니다!');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
      toast.error('수정 실패: ' + errorMessage);
    }

    setIsModifying(false);
  };

  const savePreset = async () => {
    if (!presetName.trim()) {
      toast.error('프리셋 이름을 입력해주세요');
      return;
    }

    setIsSavingPreset(true);

    const storeState = useAppStore.getState();
    const presetData = {
      name: presetName,
      category: storeState.category,
      businessName: storeState.businessName,
      mainKeyword: storeState.mainKeyword,
      subKeywords: storeState.subKeywords,
      tailKeywords: storeState.tailKeywords,
      targetAudience: storeState.targetAudience,
      uniquePoint: storeState.uniquePoint,
      attributes: storeState.attributes,
      customAttributes: storeState.customAttributes,
    };

    try {
      // Save to Firestore if logged in
      if (user) {
        await savePresetToFirestore(user.uid, presetData);
        toast.success('프리셋이 클라우드에 저장되었습니다');
      } else {
        // Save to localStorage if not logged in
        const preset = {
          id: crypto.randomUUID(),
          ...presetData,
          createdAt: new Date().toISOString(),
        };
        const saved = localStorage.getItem('blogbooster_presets');
        const presets = saved ? JSON.parse(saved) : [];
        presets.push(preset);
        localStorage.setItem('blogbooster_presets', JSON.stringify(presets));
        toast.success('프리셋이 저장되었습니다 (로그인하면 클라우드에 저장됩니다)');
      }
      setPresetName('');
    } catch (error) {
      console.error('Preset save error:', error);
      toast.error('프리셋 저장 실패');
    }

    setIsSavingPreset(false);
  };

  // 글 저장 (마이페이지용 + Supabase 벡터 저장)
  const savePostToCloud = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }

    setIsSavingPost(true);

    try {
      // 제목 추출 (【제목】 또는 【제목 후보】 섹션에서)
      let title = mainKeyword;
      const titleMatch = generatedContent.match(/【제목[^】]*】\s*\n?([^\n【]+)/);
      if (titleMatch) {
        title = titleMatch[1].trim().replace(/^\d+\.\s*/, ''); // 숫자 접두사 제거
      }

      // 1. Firebase에 글 저장 (기존 기능)
      const postId = await savePost(user.uid, {
        title,
        content: generatedContent,
        category,
        postType: selectedPostType,
        searchIntent,
        mainKeyword,
        businessName,
        imagePrompts,
      });

      // 2. Supabase에 임베딩과 함께 저장 (고급 RAG)
      try {
        await savePostWithEmbedding(
          postId,
          user.uid,
          title,
          generatedContent,
          selectedPostType,
          category,
          '',
          apiProvider
        );
        console.log('Post saved with embedding to Supabase');
      } catch (embeddingError) {
        // 임베딩 저장 실패해도 Firebase 저장은 성공했으므로 경고만 표시
        console.warn('Embedding save failed (non-critical):', embeddingError);
      }

      setPostSaved(true);
      toast.success('글이 저장되었습니다! (AI 학습에 활용됩니다)');
    } catch (error) {
      console.error('Post save error:', error);
      toast.error('글 저장에 실패했습니다');
    }

    setIsSavingPost(false);
  };

  return (
    <Card className="border border-[#eeeeee] shadow-lg bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#f72c5b]/10 text-[#f72c5b]">
            <FileText className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl">생성 결과</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-[#eeeeee] hover:bg-[#f5f5f5] hover:text-[#f72c5b]"
            onClick={copyToClipboard}
          >
            <Copy className="w-4 h-4 mr-2" /> 복사
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-[#eeeeee] hover:bg-[#f5f5f5] hover:text-[#f72c5b]"
            onClick={downloadResult}
          >
            <Download className="w-4 h-4 mr-2" /> 다운로드
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Banner */}
        <div className="bg-[#f72c5b]/10 border border-[#f72c5b]/20 rounded-xl p-4">
          <p className="text-sm text-[#f72c5b] flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            아래 내용을 네이버 블로그 에디터에 붙여넣기 하세요. [이미지: ...] 표시된 곳에 해당하는 이미지를 삽입하세요.
          </p>
        </div>

        {/* Result Content */}
        <div className="bg-[#f9fafb] rounded-2xl border border-[#eeeeee] overflow-hidden">
          <div className="bg-white px-4 py-2 border-b border-[#eeeeee] flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="text-xs text-muted-foreground ml-2">generated-content.txt</span>
          </div>
          <div
            className="p-5 max-h-[400px] overflow-y-auto"
            onCopy={(e) => {
              // Preserve line breaks when copying via drag selection
              const selection = window.getSelection();
              if (selection) {
                e.preventDefault();
                const text = selection.toString();
                e.clipboardData?.setData('text/plain', text);
              }
            }}
          >
            <div
              className="whitespace-pre-wrap text-sm leading-relaxed text-[#111111] font-sans"
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                userSelect: 'text'
              }}
            >
              {generatedContent}
            </div>
          </div>
        </div>

        {/* Modify Content Section */}
        <div className="border-t border-[#eeeeee] pt-6">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-[#f72c5b]" />
            글 추가 수정
          </h3>
          <div className="space-y-3">
            <Textarea
              placeholder="수정하고 싶은 내용을 입력하세요 (예: 더 친근한 톤으로 바꿔줘, CTA를 더 강하게 해줘, 가격 부분을 좀 더 자세히 써줘)"
              value={modifyRequest}
              onChange={(e) => setModifyRequest(e.target.value)}
              className="min-h-[80px] bg-white border-[#eeeeee] focus:border-[#f72c5b] resize-none"
            />
            <Button
              className="w-full h-11 bg-[#111111] hover:bg-[#333333] text-white"
              onClick={handleModify}
              disabled={isModifying || !modifyRequest.trim()}
            >
              {isModifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  수정 중...
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4 mr-2" />
                  글 수정하기
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Image Prompts Section */}
        {imagePrompts.length > 0 && (
          <div className="border-t border-[#eeeeee] pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Image className="w-4 h-4 text-[#03C75A]" />
                AI 이미지 생성용 프롬프트 (나노바나나)
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs border-[#03C75A] text-[#03C75A] hover:bg-[#03C75A] hover:text-white transition-colors"
                onClick={() => {
                  // 이미지 프롬프트를 store에 저장 후 이미지 생성기 페이지로 이동
                  setExtractedImagePrompts(imagePrompts);
                  window.open('/image-generator', '_blank');
                }}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                이미지 생성하기
              </Button>
            </div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[#6b7280]">
                복사 버튼을 눌러 영문 프롬프트를 복사한 뒤 나노바나나에서 이미지를 생성하세요.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-8 px-3 text-xs border-[#f72c5b]/50 text-[#f72c5b] hover:bg-[#f72c5b]/10"
                onClick={() => {
                  const allPrompts = imagePrompts.map((item, idx) => `${idx + 1}. ${item.english}`).join('\n\n');
                  navigator.clipboard.writeText(allPrompts);
                  toast.success(`${imagePrompts.length}개의 프롬프트가 전체 복사되었습니다`);
                }}
              >
                <Copy className="w-3 h-3 mr-1" />
                전체복사 ({imagePrompts.length}개)
              </Button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {imagePrompts.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3 bg-[#f9fafb] rounded-lg border border-[#eeeeee]"
                >
                  <p className="text-sm font-medium text-[#111111] flex-1">
                    {idx + 1}. {item.korean}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 h-8 px-3 text-xs border-[#03C75A]/50 text-[#03C75A] hover:bg-[#03C75A]/10"
                    onClick={() => copyPrompt(item.english)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    복사
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card Generator */}
        <CardGenerator />

        {/* Save Post to Cloud */}
        {user && (
          <div className="border-t border-[#eeeeee] pt-6">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-[#03C75A]" />
              마이페이지에 저장
              <span className="text-xs text-[#03C75A] bg-[#03C75A]/10 px-2 py-0.5 rounded-full">
                SEO 주기 관리
              </span>
            </h3>
            <p className="text-xs text-[#6b7280] mb-3">
              글을 저장하면 마이페이지에서 관리하고, SEO 발행 주기 알림을 받을 수 있습니다.
            </p>
            <div className="flex gap-2">
              <Select
                value={selectedPostType}
                onValueChange={(value) => setSelectedPostType(value as PostType)}
              >
                <SelectTrigger className="w-[180px] h-11 bg-white border-[#eeeeee]">
                  <SelectValue placeholder="글 유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(POST_TYPE_INFO) as PostType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {POST_TYPE_INFO[type].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className={`flex-1 h-11 ${
                  postSaved
                    ? 'bg-[#03C75A] hover:bg-[#059669]'
                    : 'bg-[#03C75A] hover:bg-[#059669]'
                }`}
                onClick={savePostToCloud}
                disabled={isSavingPost || postSaved}
              >
                {isSavingPost ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : postSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    저장 완료
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4 mr-2" />
                    마이페이지에 저장
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Save Preset */}
        <div className="border-t border-[#eeeeee] pt-6">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Save className="w-4 h-4 text-[#f72c5b]" />
            프리셋으로 저장
            {user && (
              <span className="text-xs text-[#03C75A] bg-[#03C75A]/10 px-2 py-0.5 rounded-full">
                클라우드 저장
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            <Input
              placeholder="프리셋 이름 입력 (예: 홍대점 블로그)"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="h-11 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
            />
            <Button
              variant="outline"
              className="h-11 px-6 border-[#f72c5b]/50 text-[#f72c5b] hover:bg-[#f72c5b]/10"
              onClick={savePreset}
              disabled={isSavingPreset}
            >
              {isSavingPreset ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '저장'
              )}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="h-12 px-6 border-[#eeeeee] hover:bg-[#f5f5f5]"
            onClick={() => setCurrentStep(2)}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 생성
          </Button>
          <Button
            className="flex-1 h-12 text-base font-semibold bg-[#111111] text-white hover:bg-[#333333] transition-all duration-300 shadow-lg"
            onClick={reset}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            새 글 작성
          </Button>
        </div>
      </CardContent>

      {/* Image Generator Popup Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ImagePlus className="w-5 h-5 text-[#03C75A]" />
              이미지 생성기
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Coming Soon Content */}
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[#03C75A]/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-[#03C75A]" />
              </div>
              <h3 className="text-xl font-bold text-[#111111] mb-2">준비 중입니다</h3>
              <p className="text-[#6b7280] mb-6">
                AI 이미지 생성 기능이 곧 출시됩니다
              </p>
              <div className="bg-[#f5f5f5] rounded-xl p-6 text-left max-w-md mx-auto">
                <h4 className="font-semibold text-[#111111] mb-3">예정된 기능</h4>
                <ul className="text-sm text-[#6b7280] space-y-2">
                  <li>• 피트니스 관련 이미지 AI 생성</li>
                  <li>• 블로그 썸네일 자동 생성</li>
                  <li>• 운동 자세 일러스트 생성</li>
                  <li>• 커스텀 프롬프트 지원</li>
                </ul>
              </div>
            </div>

            {/* Image Prompts from Generated Content */}
            {imagePrompts.length > 0 && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-[#111111] flex items-center gap-2">
                    <Image className="w-4 h-4 text-[#03C75A]" />
                    생성된 이미지 프롬프트 ({imagePrompts.length}개)
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs border-[#f72c5b]/50 text-[#f72c5b] hover:bg-[#f72c5b]/10"
                    onClick={() => {
                      const allPrompts = imagePrompts.map((item, idx) => `${idx + 1}. ${item.english}`).join('\n\n');
                      navigator.clipboard.writeText(allPrompts);
                      toast.success(`${imagePrompts.length}개의 프롬프트가 전체 복사되었습니다`);
                    }}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    전체복사
                  </Button>
                </div>
                <p className="text-xs text-[#6b7280] mb-3">
                  아래 영문 프롬프트를 복사하여 AI 이미지 생성 도구에서 사용하세요.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {imagePrompts.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-3 bg-[#f9fafb] rounded-lg border border-[#eeeeee]"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#111111]">
                          {idx + 1}. {item.korean}
                        </p>
                        <p className="text-xs text-[#6b7280] mt-1 truncate">
                          {item.english}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(item.english);
                          toast.success('영문 프롬프트가 복사되었습니다');
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Link href="/image-generator" className="flex-1">
                <Button className="w-full bg-[#03C75A] hover:bg-[#059669] text-white">
                  이미지 생성기 페이지로 이동
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setIsImageDialogOpen(false)}
              >
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
