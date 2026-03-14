'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  saveWritingSample,
  getWritingSamples,
  deleteWritingSample,
  getWritingStyleProfile,
  upsertWritingStyleProfile,
  WritingSample,
  WritingStyleProfile,
} from '@/lib/writing-style-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Brain,
  FileText,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function MyWritingPage() {
  const router = useRouter();
  const { user, loading: authLoading, getAuthHeaders } = useAuth();

  const [samples, setSamples] = useState<WritingSample[]>([]);
  const [profile, setProfile] = useState<WritingStyleProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 입력 폼
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 데이터 로드
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [samplesData, profileData] = await Promise.all([
        getWritingSamples(user.uid),
        getWritingStyleProfile(user.uid),
      ]);
      setSamples(samplesData);
      setProfile(profileData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setIsLoading(false);
  };

  // 글 등록
  const handleSave = async () => {
    if (!user) return;
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 본문을 모두 입력해주세요');
      return;
    }
    if (content.trim().length < 200) {
      toast.error('본문은 최소 200자 이상 입력해주세요');
      return;
    }

    setIsSaving(true);
    const result = await saveWritingSample(user.uid, title.trim(), content.trim());

    if (result.success) {
      toast.success('글이 등록되었습니다');
      setTitle('');
      setContent('');
      await loadData();
      // 자동으로 문체 분석 실행
      await analyzeStyle();
    } else {
      toast.error(result.error || '저장에 실패했습니다');
    }
    setIsSaving(false);
  };

  // 글 삭제
  const handleDelete = async (sampleId: string) => {
    if (!user) return;
    if (!confirm('이 글을 삭제하시겠습니까?')) return;

    const success = await deleteWritingSample(user.uid, sampleId);
    if (success) {
      toast.success('삭제되었습니다');
      await loadData();
      // 삭제 후 재분석
      const updatedSamples = samples.filter((s) => s.id !== sampleId);
      if (updatedSamples.length > 0) {
        await analyzeStyle();
      } else {
        // 모든 글 삭제 시 프로필도 초기화
        await upsertWritingStyleProfile(user.uid, '', 0);
        setProfile(null);
      }
    } else {
      toast.error('삭제에 실패했습니다');
    }
  };

  // 문체 분석 실행
  const analyzeStyle = async () => {
    if (!user) return;

    const currentSamples = await getWritingSamples(user.uid);
    if (currentSamples.length === 0) {
      toast.error('분석할 글이 없습니다');
      return;
    }

    setIsAnalyzing(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/analyze-writing-style', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          userId: user.uid,
          samples: currentSamples.map((s) => ({ title: s.title, content: s.content })),
        }),
      });

      const data = await response.json();

      if (data.success && data.styleSummary) {
        await upsertWritingStyleProfile(user.uid, data.styleSummary, data.sampleCount);
        setProfile({
          user_id: user.uid,
          style_summary: data.styleSummary,
          sample_count: data.sampleCount,
          updated_at: new Date().toISOString(),
        });
        toast.success('문체 분석이 완료되었습니다');
      } else {
        toast.error(data.error || '분석에 실패했습니다');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('분석 중 오류가 발생했습니다');
    }
    setIsAnalyzing(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#f72c5b]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      {/* 헤더 */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111111] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-[#111111] flex items-center gap-2">
          <Brain className="w-6 h-6 text-[#f72c5b]" />
          내 글 학습
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          내가 직접 쓴 글을 등록하면 AI가 나의 말투와 스토리텔링을 학습합니다
        </p>
      </div>

      {/* 문체 프로필 카드 */}
      <Card className="mb-6 border-[#eeeeee]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#f72c5b]" />
              <CardTitle className="text-lg">나의 문체 프로필</CardTitle>
            </div>
            {samples.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={analyzeStyle}
                disabled={isAnalyzing}
                className="text-xs"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                재분석
              </Button>
            )}
          </div>
          <CardDescription>
            {profile && profile.sample_count > 0
              ? `${profile.sample_count}개의 글에서 분석됨`
              : '글을 등록하면 자동으로 문체가 분석됩니다'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profile && profile.style_summary ? (
            <div className="p-4 bg-[#f9fafb] rounded-lg text-sm text-[#374151] leading-relaxed whitespace-pre-wrap">
              {profile.style_summary}
            </div>
          ) : (
            <div className="p-4 bg-[#f9fafb] rounded-lg text-sm text-[#9ca3af] text-center">
              아직 분석된 문체가 없습니다. 아래에서 글을 등록해주세요.
            </div>
          )}
          {profile && profile.sample_count > 0 && (
            <p className="text-xs text-[#9ca3af] mt-2">
              블로그 생성 시 이 문체가 자동으로 적용됩니다
            </p>
          )}
        </CardContent>
      </Card>

      {/* 글 등록 폼 */}
      <Card className="mb-6 border-[#eeeeee]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#f72c5b]" />
            <CardTitle className="text-lg">글 등록하기</CardTitle>
          </div>
          <CardDescription>
            내가 직접 쓴 블로그 글을 붙여넣기 해주세요 (최소 200자)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="글 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-[#eeeeee] focus:border-[#f72c5b]"
          />
          <textarea
            placeholder="본문 내용을 붙여넣기 해주세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="w-full p-3 border border-[#eeeeee] rounded-lg text-sm resize-y focus:outline-none focus:border-[#f72c5b] transition-colors"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9ca3af]">
              {content.length}자
              {content.length > 0 && content.length < 200 && ' (최소 200자 필요)'}
            </span>
            <Button
              onClick={handleSave}
              disabled={isSaving || !title.trim() || content.trim().length < 200}
              className="bg-[#f72c5b] hover:bg-[#e0264f] text-white"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              등록하기
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 등록된 글 목록 */}
      <Card className="border-[#eeeeee]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#f72c5b]" />
            <CardTitle className="text-lg">등록된 글 ({samples.length}개)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {samples.length === 0 ? (
            <p className="text-sm text-[#9ca3af] text-center py-8">
              등록된 글이 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {samples.map((sample) => (
                <div
                  key={sample.id}
                  className="flex items-center justify-between p-3 bg-[#f9fafb] rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-[#111111] truncate">
                      {sample.title}
                    </h3>
                    <p className="text-xs text-[#9ca3af] mt-0.5">
                      {sample.content.length}자 ·{' '}
                      {new Date(sample.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(sample.id)}
                    className="text-[#9ca3af] hover:text-red-500 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
