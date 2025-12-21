'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Download, Image, Pencil, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

type CardType = 'info' | 'price' | 'checklist';

export function CardGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardType, setCardType] = useState<CardType>('info');
  const [customRequest, setCustomRequest] = useState('');
  const [customText, setCustomText] = useState<Record<string, string>>({});
  const [isCustomizing, setIsCustomizing] = useState(false);
  const { businessName, category, attributes, apiKey, apiProvider } = useAppStore();

  useEffect(() => {
    generateCard();
  }, [cardType, businessName, attributes, customText]);

  const generateCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Light gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#f8fafc');
    gradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    // Top accent bar
    const accentGradient = ctx.createLinearGradient(0, 0, 1080, 0);
    accentGradient.addColorStop(0, '#f72c5b');
    accentGradient.addColorStop(1, '#ff6b8a');
    ctx.fillStyle = accentGradient;
    ctx.fillRect(0, 0, 1080, 8);

    // Subtle border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 1078, 1078);

    switch (cardType) {
      case 'info':
        drawInfoCard(ctx);
        break;
      case 'price':
        drawPriceCard(ctx);
        break;
      case 'checklist':
        drawChecklistCard(ctx);
        break;
    }
  };

  const drawInfoCard = (ctx: CanvasRenderingContext2D) => {
    ctx.textAlign = 'center';

    // Title
    ctx.font = 'bold 56px sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText(customText['title'] || businessName || '업체명', 540, 180);

    // Divider
    const divGradient = ctx.createLinearGradient(340, 0, 740, 0);
    divGradient.addColorStop(0, '#f72c5b');
    divGradient.addColorStop(1, '#ff6b8a');
    ctx.strokeStyle = divGradient;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(340, 230);
    ctx.lineTo(740, 230);
    ctx.stroke();

    // Info items
    ctx.textAlign = 'left';
    const items = [
      ['위치', customText['location'] || attributes['위치'] || '-'],
      ['운영시간', customText['hours'] || attributes['운영시간'] || '-'],
      ['주차', customText['parking'] || attributes['주차'] || '-'],
      ['가격', customText['price'] || attributes['가격'] || '-'],
    ];

    items.forEach((item, idx) => {
      const y = 340 + idx * 140;

      // Label background
      ctx.fillStyle = '#fff5f7';
      ctx.beginPath();
      ctx.roundRect(130, y - 35, 100, 40, 8);
      ctx.fill();

      // Label
      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#f72c5b';
      ctx.fillText(item[0], 150, y - 5);

      // Value
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#111111';
      ctx.fillText(item[1], 150, y + 55);
    });

    // CTA
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#f72c5b';
    ctx.fillText(customText['cta'] || '지금 바로 문의하세요!', 540, 980);
  };

  const drawPriceCard = (ctx: CanvasRenderingContext2D) => {
    ctx.textAlign = 'center';

    // Title
    ctx.font = 'bold 48px sans-serif';
    ctx.fillStyle = '#f72c5b';
    ctx.fillText(customText['priceTitle'] || '가격 안내', 540, 160);

    // Business name
    ctx.font = '36px sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText(customText['title'] || businessName || '업체명', 540, 280);

    // Price box
    ctx.fillStyle = '#fff5f7';
    ctx.beginPath();
    ctx.roundRect(200, 380, 680, 220, 20);
    ctx.fill();

    ctx.strokeStyle = '#f72c5b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(200, 380, 680, 220, 20);
    ctx.stroke();

    // Price
    ctx.font = 'bold 64px sans-serif';
    ctx.fillStyle = '#f72c5b';
    ctx.fillText(customText['priceValue'] || attributes['가격'] || '상담 후 결정', 540, 510);

    // Note
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(customText['priceNote'] || '상세 가격은 방문/전화 상담 시 안내드립니다.', 540, 720);

    // CTA
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText(customText['priceCta'] || '무료 상담 예약하기', 540, 920);
  };

  const drawChecklistCard = (ctx: CanvasRenderingContext2D) => {
    ctx.textAlign = 'center';

    // Title
    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText(customText['checklistTitle'] || `${category} 선택 가이드`, 540, 140);

    const defaultChecklist = [
      '위치와 접근성 확인하기',
      '시설 및 장비 상태 점검',
      '강사/트레이너 자격 확인',
      '가격 및 환불 정책 비교',
      '무료 체험 이용해보기',
    ];

    const checklist = customText['checklistItems']
      ? customText['checklistItems'].split('\n').filter(i => i.trim())
      : defaultChecklist;

    ctx.textAlign = 'left';

    checklist.forEach((item, idx) => {
      const y = 280 + idx * 130;

      // Checkbox background
      ctx.fillStyle = '#fff5f7';
      ctx.beginPath();
      ctx.roundRect(120, y - 30, 44, 44, 8);
      ctx.fill();

      // Checkbox border
      ctx.strokeStyle = '#f72c5b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(120, y - 30, 44, 44, 8);
      ctx.stroke();

      // Checkmark
      ctx.fillStyle = '#f72c5b';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('✓', 130, y + 5);

      // Text
      ctx.fillStyle = '#111111';
      ctx.font = '32px sans-serif';
      ctx.fillText(item, 200, y);
    });

    // Footer
    ctx.textAlign = 'center';
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText(customText['checklistFooter'] || '저장해두고 방문 시 체크해보세요!', 540, 980);
  };

  const handleCustomize = async () => {
    if (!customRequest.trim()) {
      toast.error('수정 내용을 입력해주세요');
      return;
    }

    if (!apiKey) {
      toast.error('API 키가 설정되지 않았습니다');
      return;
    }

    setIsCustomizing(true);
    toast.info('카드 내용을 수정하고 있습니다...');

    try {
      const prompt = `사용자가 요약 카드 이미지의 내용을 수정하려고 합니다.

현재 카드 타입: ${cardType === 'info' ? '업체 정보' : cardType === 'price' ? '가격표' : '체크리스트'}
현재 업체명: ${businessName}
현재 카테고리: ${category}
현재 속성정보: ${JSON.stringify(attributes)}

사용자 요청: ${customRequest}

위 요청에 맞게 카드에 표시할 텍스트들을 JSON 형식으로 반환해주세요.
반드시 아래 형식의 JSON만 출력하세요. 다른 설명은 넣지 마세요.

${cardType === 'info' ? `{
  "title": "업체명 또는 제목",
  "location": "위치 정보",
  "hours": "운영시간",
  "parking": "주차 정보",
  "price": "가격 정보",
  "cta": "CTA 문구"
}` : cardType === 'price' ? `{
  "priceTitle": "가격 안내 제목",
  "title": "업체명",
  "priceValue": "가격",
  "priceNote": "안내 문구",
  "priceCta": "CTA 버튼 문구"
}` : `{
  "checklistTitle": "체크리스트 제목",
  "checklistItems": "항목1\\n항목2\\n항목3\\n항목4\\n항목5",
  "checklistFooter": "하단 안내 문구"
}`}`;

      const endpoint = apiProvider === 'gemini' ? '/api/gemini/generate' : '/api/openai/generate';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, prompt }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Parse JSON from response
      const jsonMatch = data.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setCustomText(prev => ({ ...prev, ...parsed }));
        toast.success('카드가 수정되었습니다!');
      } else {
        throw new Error('응답 파싱 실패');
      }

      setCustomRequest('');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      toast.error('수정 실패: ' + errorMessage);
    }

    setIsCustomizing(false);
  };

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${businessName || '카드'}_${cardType}_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    toast.success('카드 이미지가 다운로드되었습니다');
  };

  const resetCard = () => {
    setCustomText({});
    toast.success('카드가 초기화되었습니다');
  };

  return (
    <div className="border-t border-[#eeeeee] pt-6">
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
        <Image className="w-4 h-4 text-[#f72c5b]" />
        요약 카드 이미지 생성
      </h3>

      <div className="flex gap-2 mb-4">
        {(['info', 'price', 'checklist'] as CardType[]).map((type) => (
          <button
            key={type}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
              cardType === type
                ? 'bg-[#f72c5b]/20 border-[#f72c5b] text-[#f72c5b]'
                : 'bg-white border-[#eeeeee] text-[#6b7280] hover:border-[#eeeeee]'
            )}
            onClick={() => {
              setCardType(type);
              setCustomText({});
            }}
          >
            {type === 'info' ? '업체 정보' : type === 'price' ? '가격표' : '체크리스트'}
          </button>
        ))}
      </div>

      <div className="bg-[#f9fafb] rounded-xl p-4 mb-4 border border-[#eeeeee]">
        <canvas
          ref={canvasRef}
          width={1080}
          height={1080}
          className="w-full max-w-[280px] mx-auto rounded-lg shadow-lg border border-[#e2e8f0]"
        />
      </div>

      {/* Card Customization Section */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <Input
            placeholder="카드 내용 수정 요청 (예: 가격을 월 5만원으로 변경해줘)"
            value={customRequest}
            onChange={(e) => setCustomRequest(e.target.value)}
            className="h-10 bg-white border-[#eeeeee] focus:border-[#f72c5b] text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3 border-[#eeeeee] hover:bg-[#f5f5f5]"
            onClick={resetCard}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
        <Button
          className="w-full h-10 bg-[#f72c5b]/10 hover:bg-[#f72c5b]/20 text-[#f72c5b] border border-[#f72c5b]/30"
          variant="outline"
          onClick={handleCustomize}
          disabled={isCustomizing || !customRequest.trim()}
        >
          {isCustomizing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              수정 중...
            </>
          ) : (
            <>
              <Pencil className="w-4 h-4 mr-2" />
              카드 내용 수정하기
            </>
          )}
        </Button>
      </div>

      <Button
        variant="outline"
        className="w-full h-11 border-[#f72c5b]/50 text-[#f72c5b] hover:bg-[#f72c5b]/10"
        onClick={downloadCard}
      >
        <Download className="w-4 h-4 mr-2" />
        카드 이미지 다운로드
      </Button>
    </div>
  );
}
