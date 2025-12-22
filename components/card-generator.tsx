'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Download, Image, Pencil, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

type CardType = 'info' | 'price' | 'checklist';

// 블로그 본문에서 정보 추출하는 함수
function extractInfoFromContent(content: string): {
  businessName: string;
  location: string;
  weekdayHours: string;
  weekendHours: string;
  parking: string;
  price: string;
  features: string;
  checklist: string[];
  priceItems: { label: string; value: string }[];
} {
  const result = {
    businessName: '',
    location: '',
    weekdayHours: '',
    weekendHours: '',
    parking: '',
    price: '',
    features: '',
    checklist: [] as string[],
    priceItems: [] as { label: string; value: string }[],
  };

  if (!content) return result;

  // 핵심 정보 섹션에서 추출
  const infoSectionMatch = content.match(/【[^】]*핵심\s*정보[^】]*】([\s\S]*?)(?=────|【|$)/);
  if (infoSectionMatch) {
    const infoSection = infoSectionMatch[1];

    // 업체명
    const businessMatch = infoSection.match(/업체명[:\s]*([^\n•]+)/);
    if (businessMatch) result.businessName = businessMatch[1].trim();

    // 위치
    const locationMatch = infoSection.match(/위치[:\s]*([^\n•]+)/);
    if (locationMatch) result.location = locationMatch[1].trim();

    // 평일 운영
    const weekdayMatch = infoSection.match(/평일[^:]*[:\s]*([^\n•]+)/);
    if (weekdayMatch) result.weekdayHours = weekdayMatch[1].trim();

    // 주말 운영
    const weekendMatch = infoSection.match(/주말[^:]*[:\s]*([^\n•]+)/);
    if (weekendMatch) result.weekendHours = weekendMatch[1].trim();

    // 주차
    const parkingMatch = infoSection.match(/주차[:\s]*([^\n•]+)/);
    if (parkingMatch) result.parking = parkingMatch[1].trim();

    // 가격
    const priceMatch = infoSection.match(/가격[:\s]*([^\n•]+)/);
    if (priceMatch) result.price = priceMatch[1].trim();

    // 특징
    const featuresMatch = infoSection.match(/특징[:\s]*([^\n•]+)/);
    if (featuresMatch) result.features = featuresMatch[1].trim();
  }

  // 요약 섹션에서도 추출 시도 (핵심 정보가 없는 경우)
  const summaryMatch = content.match(/【[^】]*요약[^】]*】([\s\S]*?)(?=────|【|$)/);
  if (summaryMatch) {
    const summarySection = summaryMatch[1];

    if (!result.location) {
      const locMatch = summarySection.match(/위치[:\s]*([^\n•]+)/);
      if (locMatch) result.location = locMatch[1].trim();
    }
    if (!result.weekdayHours) {
      const wdMatch = summarySection.match(/평일[:\s]*([^\n\/]+)/);
      if (wdMatch) result.weekdayHours = wdMatch[1].trim();
    }
    if (!result.weekendHours) {
      const weMatch = summarySection.match(/주말[:\s]*([^\n]+)/);
      if (weMatch) result.weekendHours = weMatch[1].trim();
    }
  }

  // 체크리스트 섹션 추출
  const checklistMatch = content.match(/【[^】]*체크리스트[^】]*】([\s\S]*?)(?=────|【|$)/);
  if (checklistMatch) {
    const checklistSection = checklistMatch[1];
    const items = checklistSection.match(/[•□✓]\s*([^\n]+)/g);
    if (items) {
      result.checklist = items.map(item => item.replace(/^[•□✓]\s*/, '').trim()).filter(i => i.length > 0).slice(0, 5);
    }
  }

  // 가격 정보 상세 추출 (가격 섹션 또는 본문에서)
  const priceDetailMatch = content.match(/(\d+개월[^:]*[:]\s*[^\n]+)/g);
  if (priceDetailMatch) {
    priceDetailMatch.forEach(match => {
      const [label, value] = match.split(/[:：]/);
      if (label && value) {
        result.priceItems.push({
          label: label.trim(),
          value: value.trim()
        });
      }
    });
  }

  // 제목에서 업체명 추출 시도 (핵심 정보 없는 경우)
  if (!result.businessName) {
    const titleMatch = content.match(/【제목[^】]*】[\s\S]*?\d+\.\s*([^\n]+)/);
    if (titleMatch) {
      // 첫 번째 제목 후보에서 업체명 추출
      const title = titleMatch[1];
      const nameMatch = title.match(/^([^,\-–]+)/);
      if (nameMatch) result.businessName = nameMatch[1].trim();
    }
  }

  return result;
}

export function CardGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardType, setCardType] = useState<CardType>('info');
  const [customRequest, setCustomRequest] = useState('');
  const [customText, setCustomText] = useState<Record<string, string>>({});
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isExtracted, setIsExtracted] = useState(false);
  const { businessName, category, attributes, apiKey, apiProvider, generatedContent } = useAppStore();

  // 블로그 본문에서 정보 추출
  const extractedInfo = useMemo(() => {
    return extractInfoFromContent(generatedContent);
  }, [generatedContent]);

  // 본문에서 추출한 정보로 초기화
  useEffect(() => {
    if (generatedContent && !isExtracted) {
      const info = extractedInfo;
      if (info.businessName || info.location || info.price) {
        setCustomText({
          title: info.businessName || businessName,
          location: info.location || attributes['위치'] || '',
          hours: info.weekdayHours ? `평일 ${info.weekdayHours}${info.weekendHours ? ` / 주말 ${info.weekendHours}` : ''}` : '',
          parking: info.parking || attributes['주차'] || '',
          price: info.price || attributes['가격'] || '',
          checklistItems: info.checklist.length > 0 ? info.checklist.join('\n') : '',
          priceValue: info.price || attributes['가격'] || '',
        });
        setIsExtracted(true);
      }
    }
  }, [generatedContent, extractedInfo, isExtracted, businessName, attributes]);

  useEffect(() => {
    generateCard();
  }, [cardType, businessName, attributes, customText, extractedInfo]);

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

    // Title - 본문에서 추출한 업체명 우선 사용
    const displayTitle = customText['title'] || extractedInfo.businessName || businessName || '업체명';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText(displayTitle, 540, 180);

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

    // Info items - 본문에서 추출한 정보 우선 사용
    ctx.textAlign = 'left';
    const displayLocation = customText['location'] || extractedInfo.location || attributes['위치'] || '-';
    const displayHours = customText['hours'] ||
      (extractedInfo.weekdayHours ? `평일 ${extractedInfo.weekdayHours}${extractedInfo.weekendHours ? ` / 주말 ${extractedInfo.weekendHours}` : ''}` : '') ||
      attributes['운영시간'] || '-';
    const displayParking = customText['parking'] || extractedInfo.parking || attributes['주차'] || '-';
    const displayPrice = customText['price'] || extractedInfo.price || attributes['가격'] || '-';

    const items = [
      ['위치', displayLocation],
      ['운영시간', displayHours],
      ['주차', displayParking],
      ['가격', displayPrice],
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
    ctx.fillText(customText['priceTitle'] || '가격 안내', 540, 120);

    // Business name - 본문에서 추출한 업체명 우선 사용
    const displayTitle = customText['title'] || extractedInfo.businessName || businessName || '업체명';
    ctx.font = '36px sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText(displayTitle, 540, 200);

    // 본문에서 추출한 가격 정보가 있으면 여러 개 표시
    const displayPrice = customText['priceValue'] || extractedInfo.price || attributes['가격'] || '상담 후 결정';

    if (extractedInfo.priceItems.length > 0 && !customText['priceValue']) {
      // 여러 가격 항목이 있는 경우
      let yOffset = 280;
      extractedInfo.priceItems.slice(0, 4).forEach((item, idx) => {
        // Price item background
        ctx.fillStyle = idx === 0 ? '#fff5f7' : '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(150, yOffset, 780, 90, 12);
        ctx.fill();

        ctx.strokeStyle = idx === 0 ? '#f72c5b' : '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(150, yOffset, 780, 90, 12);
        ctx.stroke();

        // Label
        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, 200, yOffset + 55);

        // Value
        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = idx === 0 ? '#f72c5b' : '#111111';
        ctx.textAlign = 'right';
        ctx.fillText(item.value, 880, yOffset + 55);

        yOffset += 110;
      });

      ctx.textAlign = 'center';
    } else {
      // 단일 가격 표시
      // Price box
      ctx.fillStyle = '#fff5f7';
      ctx.beginPath();
      ctx.roundRect(200, 320, 680, 180, 20);
      ctx.fill();

      ctx.strokeStyle = '#f72c5b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(200, 320, 680, 180, 20);
      ctx.stroke();

      // Price
      ctx.font = 'bold 56px sans-serif';
      ctx.fillStyle = '#f72c5b';
      ctx.fillText(displayPrice, 540, 430);
    }

    // Note
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText(customText['priceNote'] || '상세 가격은 방문/전화 상담 시 안내드립니다.', 540, 800);

    // Features from blog content
    if (extractedInfo.features && !customText['priceNote']) {
      ctx.font = '24px sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`✓ ${extractedInfo.features}`, 540, 860);
    }

    // CTA
    ctx.font = 'bold 32px sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText(customText['priceCta'] || '무료 상담 예약하기', 540, 980);
  };

  const drawChecklistCard = (ctx: CanvasRenderingContext2D) => {
    ctx.textAlign = 'center';

    // Title
    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = '#111111';
    ctx.fillText(customText['checklistTitle'] || `${category} 선택 가이드`, 540, 140);

    // 본문에서 추출한 체크리스트 또는 기본 체크리스트 사용
    const defaultChecklist = [
      '위치와 접근성 확인하기',
      '시설 및 장비 상태 점검',
      '강사/트레이너 자격 확인',
      '가격 및 환불 정책 비교',
      '무료 체험 이용해보기',
    ];

    // 우선순위: customText > 본문에서 추출 > 기본값
    const checklist = customText['checklistItems']
      ? customText['checklistItems'].split('\n').filter(i => i.trim())
      : extractedInfo.checklist.length > 0
        ? extractedInfo.checklist
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
    setIsExtracted(false);
    toast.success('카드가 초기화되었습니다');
  };

  // 본문에서 다시 추출하기
  const reExtractFromContent = () => {
    if (!generatedContent) {
      toast.error('생성된 블로그 본문이 없습니다');
      return;
    }
    const info = extractedInfo;
    setCustomText({
      title: info.businessName || businessName,
      location: info.location || '',
      hours: info.weekdayHours ? `평일 ${info.weekdayHours}${info.weekendHours ? ` / 주말 ${info.weekendHours}` : ''}` : '',
      parking: info.parking || '',
      price: info.price || '',
      checklistItems: info.checklist.length > 0 ? info.checklist.join('\n') : '',
      priceValue: info.price || '',
    });
    toast.success('블로그 본문에서 정보를 다시 추출했습니다');
  };

  return (
    <div className="border-t border-[#eeeeee] pt-6">
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
        <Image className="w-4 h-4 text-[#f72c5b]" />
        요약 카드 이미지 생성
      </h3>

      {/* 본문 연동 안내 */}
      {generatedContent && (
        <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#10b981]" />
            <span className="text-xs text-[#059669]">
              블로그 본문에서 정보를 추출하여 카드를 생성합니다
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-[#10b981] hover:bg-[#10b981]/10"
            onClick={reExtractFromContent}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            다시 추출
          </Button>
        </div>
      )}

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
