'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Copy, Check, Sparkles, Search, Wand2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// 프롬프트 데이터
const promptData = [
  {
    id: 1,
    category: '피트니스',
    image: '/prompts/fitness-1.jpg',
    prompt: '현대적인 헬스장에서 덤벨을 들고 있는 한국인 여성 트레이너, 전문적인 운동복 착용, 밝은 조명, 깨끗한 배경, 고품질 사진',
  },
  {
    id: 2,
    category: '피트니스',
    image: '/prompts/fitness-2.jpg',
    prompt: '요가 매트 위에서 명상 자세를 취하고 있는 한국인 여성, 평화로운 분위기, 자연광, 미니멀한 인테리어 배경',
  },
  {
    id: 3,
    category: '비포애프터',
    image: '/prompts/before-after-1.jpg',
    prompt: '체중 감량 성공 비포애프터 이미지, 같은 배경과 의상, 확연한 체형 변화, 자신감 있는 포즈',
  },
  {
    id: 4,
    category: 'PT센터',
    image: '/prompts/pt-center-1.jpg',
    prompt: '고급스러운 1:1 PT 센터 인테리어, 최신 운동 기구들, 따뜻한 조명, 넓은 공간, 거울이 있는 벽',
  },
  {
    id: 5,
    category: '운동 동작',
    image: '/prompts/exercise-1.jpg',
    prompt: '스쿼트 자세를 취하고 있는 한국인 남성 트레이너, 정확한 폼, 측면 각도, 심플한 배경, 운동 가이드용',
  },
  {
    id: 6,
    category: '음식',
    image: '/prompts/food-1.jpg',
    prompt: '건강한 식단 도시락, 닭가슴살, 현미밥, 채소, 깔끔한 플레이팅, 위에서 내려다보는 앵글, 밝은 배경',
  },
  {
    id: 7,
    category: '필라테스',
    image: '/prompts/pilates-1.jpg',
    prompt: '리포머 필라테스 기구 위에서 운동하는 한국인 여성, 우아한 동작, 밝은 스튜디오, 전문 강사 느낌',
  },
  {
    id: 8,
    category: '헬스장',
    image: '/prompts/gym-1.jpg',
    prompt: '프리미엄 헬스장 전경, 런닝머신과 웨이트 존, LED 조명, 현대적인 인테리어, 깨끗하고 넓은 공간',
  },
];

const categories = ['전체', '피트니스', '비포애프터', 'PT센터', '운동 동작', '음식', '필라테스', '헬스장'];

export default function PromptCollectionPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredPrompts = promptData.filter((item) => {
    const matchCategory = selectedCategory === '전체' || item.category === selectedCategory;
    const matchSearch = item.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleCopyPrompt = async (id: number, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(id);
      toast.success('프롬프트가 복사되었습니다');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('복사에 실패했습니다');
    }
  };

  const handleRemix = (prompt: string) => {
    // 프롬프트를 URL 파라미터로 전달하여 이미지 생성기로 이동
    const encodedPrompt = encodeURIComponent(prompt);
    router.push(`/image-generator?prompt=${encodedPrompt}`);
    toast.success('이미지 생성기로 이동합니다');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f5f5f5] py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111111] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </Link>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#a78bfa] flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#111111] mb-4">
            프롬프트 모음
          </h1>
          <p className="text-[#6b7280] text-lg">
            AI 이미지 생성에 활용할 수 있는 프롬프트를 복사해서 사용하세요
          </p>
        </div>

        {/* Search & Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
            <Input
              type="text"
              placeholder="프롬프트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white border-[#eeeeee] focus:border-[#8b5cf6]"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category
                  ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white'
                  : 'border-[#eeeeee] text-[#6b7280] hover:text-[#8b5cf6] hover:border-[#8b5cf6]'
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Prompt Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPrompts.map((item) => (
            <Card key={item.id} className="overflow-hidden border border-[#eeeeee] hover:shadow-lg transition-shadow group">
              <div className="relative aspect-square bg-[#f5f5f5]">
                {/* 실제 이미지가 없으면 플레이스홀더 표시 */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#8b5cf6]/10 to-[#a78bfa]/10">
                  <div className="text-center p-4">
                    <Sparkles className="w-12 h-12 text-[#8b5cf6]/30 mx-auto mb-2" />
                    <p className="text-xs text-[#9ca3af]">{item.category}</p>
                  </div>
                </div>
                {/* 카테고리 뱃지 */}
                <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-[#8b5cf6]">
                  {item.category}
                </div>
              </div>
              <CardContent className="p-4">
                <p className="text-sm text-[#374151] line-clamp-3 mb-3 min-h-[60px]">
                  {item.prompt}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-[#8b5cf6] text-[#8b5cf6] hover:bg-[#8b5cf6] hover:text-white"
                    onClick={() => handleCopyPrompt(item.id, item.prompt)}
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        복사
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-[#f72c5b] to-[#ff6b6b] hover:from-[#e0264f] hover:to-[#ff5252] text-white"
                    onClick={() => handleRemix(item.prompt)}
                  >
                    <Wand2 className="w-4 h-4 mr-1" />
                    리믹스
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPrompts.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-[#d1d5db] mx-auto mb-4" />
            <p className="text-[#6b7280]">검색 결과가 없습니다</p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 p-6 bg-[#8b5cf6]/5 rounded-xl border border-[#8b5cf6]/20">
          <h3 className="font-semibold text-[#111111] mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8b5cf6]" />
            프롬프트 활용 팁
          </h3>
          <ul className="text-sm text-[#6b7280] space-y-1">
            <li>• 프롬프트를 복사한 후 이미지 생성기에서 사용하세요</li>
            <li>• 업종과 상황에 맞게 키워드를 수정하여 사용하세요</li>
            <li>• 한글 프롬프트는 Gemini, 영문 프롬프트는 DALL-E에서 더 좋은 결과를 얻을 수 있습니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
