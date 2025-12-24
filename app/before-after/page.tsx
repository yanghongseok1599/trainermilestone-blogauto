'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  ArrowLeft,
  ArrowLeftRight,
  Upload,
  Download,
  Trash2,
  Image as ImageIcon,
  SplitSquareHorizontal,
  SplitSquareVertical,
  Circle,
  Triangle,
  Type,
  Stamp,
  Loader2,
  Sparkles,
  Eye,
  RefreshCw,
  Settings,
  Palette,
  ZoomIn,
  ZoomOut,
  Hand
} from 'lucide-react';
import { toast } from 'sonner';

// 레이아웃 타입
type LayoutType = 'horizontal' | 'vertical' | 'slider' | 'diagonal' | 'circle';

// 아웃라인 설정 타입
interface OutlineSettings {
  enabled: boolean;
  color: string;
  thickness: number;
}

// 이미지 변환 설정 타입
interface ImageTransform {
  x: number;
  y: number;
  scale: number;
}

// 라벨 위치 타입
interface LabelPosition {
  x: number;
  y: number;
}

// 라벨 설정 타입
interface LabelSettings {
  showLabels: boolean;
  beforeText: string;
  afterText: string;
  showDate: boolean;
  customText: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  beforePosition: LabelPosition;
  afterPosition: LabelPosition;
  customPosition: LabelPosition;
}

// 워터마크 설정 타입
interface WatermarkSettings {
  enabled: boolean;
  image: string | null;
  x: number;
  y: number;
  opacity: number;
  size: number;
}

// 출력 크기 타입
interface OutputSize {
  width: number;
  height: number;
  label: string;
}

// 클릭 가능한 영역 타입
interface ClickableArea {
  type: 'before-image' | 'after-image' | 'before-label' | 'after-label' | 'custom-label' | 'watermark';
  x: number;
  y: number;
  width: number;
  height: number;
}

const OUTPUT_SIZES: OutputSize[] = [
  { width: 1080, height: 1080, label: 'Instagram (1:1)' },
  { width: 1920, height: 1080, label: 'YouTube (16:9)' },
  { width: 1200, height: 630, label: 'Facebook/Blog' },
  { width: 800, height: 800, label: '소형 (800px)' },
];

export default function BeforeAfterPage() {
  // 이미지 상태
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);

  // 이미지 변환 상태
  const [beforeTransform, setBeforeTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 });
  const [afterTransform, setAfterTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1 });

  // 레이아웃 설정
  const [layout, setLayout] = useState<LayoutType>('horizontal');
  const [sliderPosition, setSliderPosition] = useState(50);

  // 아웃라인 설정
  const [outline, setOutline] = useState<OutlineSettings>({
    enabled: true,
    color: '#ffffff',
    thickness: 4,
  });

  // 출력 크기
  const [outputSize, setOutputSize] = useState<OutputSize>(OUTPUT_SIZES[0]);

  // 라벨 기본 위치 계산
  const getDefaultLabelPositions = useCallback(() => {
    const { width, height } = outputSize;
    return {
      before: { x: layout === 'horizontal' ? width / 4 : width / 2, y: 40 },
      after: { x: layout === 'horizontal' ? (width / 4) * 3 : width / 2, y: layout === 'vertical' ? height / 2 + 40 : 40 },
      custom: { x: width / 2, y: height - 50 },
    };
  }, [outputSize, layout]);

  // 라벨 설정
  const [labels, setLabels] = useState<LabelSettings>(() => {
    const defaults = { width: 1080, height: 1080 };
    return {
      showLabels: true,
      beforeText: 'BEFORE',
      afterText: 'AFTER',
      showDate: false,
      customText: '',
      fontSize: 24,
      fontColor: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      beforePosition: { x: defaults.width / 4, y: 40 },
      afterPosition: { x: (defaults.width / 4) * 3, y: 40 },
      customPosition: { x: defaults.width / 2, y: defaults.height - 50 },
    };
  });

  // 워터마크 설정
  const [watermark, setWatermark] = useState<WatermarkSettings>({
    enabled: false,
    image: null,
    x: outputSize.width - 120,
    y: outputSize.height - 70,
    opacity: 70,
    size: 100,
  });

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 클릭 가능한 영역 저장
  const [clickableAreas, setClickableAreas] = useState<ClickableArea[]>([]);

  // 생성 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingOutline, setIsProcessingOutline] = useState(false);
  const [processedBeforeImage, setProcessedBeforeImage] = useState<string | null>(null);
  const [processedAfterImage, setProcessedAfterImage] = useState<string | null>(null);

  // Canvas ref
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // 파일 input refs
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  // 레이아웃 변경 시 라벨 위치 업데이트
  useEffect(() => {
    const defaults = getDefaultLabelPositions();
    setLabels(prev => ({
      ...prev,
      beforePosition: defaults.before,
      afterPosition: defaults.after,
      customPosition: defaults.custom,
    }));
  }, [layout, outputSize, getDefaultLabelPositions]);

  // 출력 크기 변경 시 워터마크 위치 업데이트
  useEffect(() => {
    setWatermark(prev => ({
      ...prev,
      x: Math.min(prev.x, outputSize.width - 50),
      y: Math.min(prev.y, outputSize.height - 50),
    }));
  }, [outputSize]);

  // 이미지 업로드 핸들러
  const handleImageUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: (img: string | null) => void,
    setProcessed?: (img: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      if (setProcessed) setProcessed(null);
      toast.success('이미지가 업로드되었습니다');
    };
    reader.readAsDataURL(file);
  }, []);

  // 워터마크 업로드 핸들러
  const handleWatermarkUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setWatermark(prev => ({ ...prev, image: event.target?.result as string, enabled: true }));
      toast.success('워터마크가 업로드되었습니다');
    };
    reader.readAsDataURL(file);
  }, []);

  // Canvas 좌표 변환 (화면 좌표 -> Canvas 좌표)
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const container = previewContainerRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const scaleX = outputSize.width / rect.width;
    const scaleY = outputSize.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, [outputSize]);

  // 클릭한 위치에서 드래그 대상 찾기
  const findDragTarget = useCallback((x: number, y: number): string | null => {
    // 역순으로 검색 (위에 그려진 요소 우선)
    for (let i = clickableAreas.length - 1; i >= 0; i--) {
      const area = clickableAreas[i];
      if (x >= area.x && x <= area.x + area.width &&
          y >= area.y && y <= area.y + area.height) {
        return area.type;
      }
    }
    return null;
  }, [clickableAreas]);

  // 마우스 다운 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    const target = findDragTarget(coords.x, coords.y);

    if (target) {
      setIsDragging(true);
      setDragTarget(target);
      setDragStart(coords);
      e.preventDefault();
    }
  }, [getCanvasCoords, findDragTarget]);

  // 마우스 이동 핸들러
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragTarget) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);
    const deltaX = coords.x - dragStart.x;
    const deltaY = coords.y - dragStart.y;

    switch (dragTarget) {
      case 'before-image':
        setBeforeTransform(prev => ({
          ...prev,
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
        break;
      case 'after-image':
        setAfterTransform(prev => ({
          ...prev,
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
        break;
      case 'before-label':
        setLabels(prev => ({
          ...prev,
          beforePosition: {
            x: Math.max(50, Math.min(outputSize.width - 50, prev.beforePosition.x + deltaX)),
            y: Math.max(30, Math.min(outputSize.height - 30, prev.beforePosition.y + deltaY)),
          },
        }));
        break;
      case 'after-label':
        setLabels(prev => ({
          ...prev,
          afterPosition: {
            x: Math.max(50, Math.min(outputSize.width - 50, prev.afterPosition.x + deltaX)),
            y: Math.max(30, Math.min(outputSize.height - 30, prev.afterPosition.y + deltaY)),
          },
        }));
        break;
      case 'custom-label':
        setLabels(prev => ({
          ...prev,
          customPosition: {
            x: Math.max(50, Math.min(outputSize.width - 50, prev.customPosition.x + deltaX)),
            y: Math.max(30, Math.min(outputSize.height - 30, prev.customPosition.y + deltaY)),
          },
        }));
        break;
      case 'watermark':
        setWatermark(prev => ({
          ...prev,
          x: Math.max(0, Math.min(outputSize.width - prev.size, prev.x + deltaX)),
          y: Math.max(0, Math.min(outputSize.height - prev.size, prev.y + deltaY)),
        }));
        break;
    }

    setDragStart(coords);
  }, [isDragging, dragTarget, dragStart, getCanvasCoords, outputSize]);

  // 마우스 업 핸들러
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragTarget(null);
  }, []);

  // 아웃라인 처리 (Canvas 기반)
  const processOutlineSimple = useCallback(async (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        ctx.shadowColor = outline.color;
        ctx.shadowBlur = outline.thickness;
        for (let i = 0; i < 3; i++) {
          ctx.drawImage(img, 0, 0);
        }
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageSrc;
    });
  }, [outline.color, outline.thickness]);

  // AI 아웃라인 처리
  const processOutlineAI = useCallback(async (imageSrc: string): Promise<string> => {
    try {
      const response = await fetch('/api/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageSrc,
          outlineColor: outline.color,
          outlineThickness: outline.thickness,
        }),
      });
      if (!response.ok) throw new Error('세그멘테이션 실패');
      const data = await response.json();
      if (data.useClientSide) return processOutlineSimple(imageSrc);
      return data.processedImage;
    } catch {
      return processOutlineSimple(imageSrc);
    }
  }, [outline.color, outline.thickness, processOutlineSimple]);

  // 아웃라인 적용
  const applyOutline = useCallback(async () => {
    if (!beforeImage && !afterImage) {
      toast.error('이미지를 먼저 업로드해주세요');
      return;
    }
    setIsProcessingOutline(true);
    toast.info('아웃라인을 생성하고 있습니다...');
    try {
      const [processedBefore, processedAfter] = await Promise.all([
        beforeImage ? processOutlineAI(beforeImage) : Promise.resolve(null),
        afterImage ? processOutlineAI(afterImage) : Promise.resolve(null),
      ]);
      setProcessedBeforeImage(processedBefore);
      setProcessedAfterImage(processedAfter);
      toast.success('아웃라인이 적용되었습니다');
    } catch {
      toast.error('아웃라인 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessingOutline(false);
    }
  }, [beforeImage, afterImage, processOutlineAI]);

  // 이미지를 영역에 맞게 contain으로 그리기 (전체 이미지가 보이도록)
  const drawImageContain = useCallback((
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    transform: ImageTransform,
    bgColor: string = '#222222'
  ) => {
    // 배경 그리기
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);

    const imgRatio = img.width / img.height;
    const targetRatio = w / h;

    let drawW: number, drawH: number;

    // contain 방식: 이미지 전체가 보이도록
    if (imgRatio > targetRatio) {
      // 이미지가 더 넓음 - 너비에 맞춤
      drawW = w;
      drawH = w / imgRatio;
    } else {
      // 이미지가 더 높음 - 높이에 맞춤
      drawH = h;
      drawW = h * imgRatio;
    }

    // 스케일 적용
    drawW *= transform.scale;
    drawH *= transform.scale;

    // 중앙 정렬 + 오프셋
    const drawX = x + (w - drawW) / 2 + transform.x;
    const drawY = y + (h - drawH) / 2 + transform.y;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }, []);

  // 미리보기 렌더링
  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const { width, height } = outputSize;

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    const beforeSrc = outline.enabled && processedBeforeImage ? processedBeforeImage : beforeImage;
    const afterSrc = outline.enabled && processedAfterImage ? processedAfterImage : afterImage;

    const newClickableAreas: ClickableArea[] = [];

    const drawImages = async () => {
      const loadImage = (src: string | null): Promise<HTMLImageElement | null> => {
        if (!src) return Promise.resolve(null);
        return new Promise((resolve) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });
      };

      const [beforeImg, afterImg] = await Promise.all([
        loadImage(beforeSrc),
        loadImage(afterSrc),
      ]);

      // 레이아웃에 따른 그리기
      switch (layout) {
        case 'horizontal': {
          const halfWidth = width / 2;
          if (beforeImg) {
            drawImageContain(ctx, beforeImg, 0, 0, halfWidth, height, beforeTransform);
            newClickableAreas.push({ type: 'before-image', x: 0, y: 0, width: halfWidth, height });
          }
          if (afterImg) {
            drawImageContain(ctx, afterImg, halfWidth, 0, halfWidth, height, afterTransform);
            newClickableAreas.push({ type: 'after-image', x: halfWidth, y: 0, width: halfWidth, height });
          }
          // 중앙 구분선
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(halfWidth, 0);
          ctx.lineTo(halfWidth, height);
          ctx.stroke();
          break;
        }
        case 'vertical': {
          const halfHeight = height / 2;
          if (beforeImg) {
            drawImageContain(ctx, beforeImg, 0, 0, width, halfHeight, beforeTransform);
            newClickableAreas.push({ type: 'before-image', x: 0, y: 0, width, height: halfHeight });
          }
          if (afterImg) {
            drawImageContain(ctx, afterImg, 0, halfHeight, width, halfHeight, afterTransform);
            newClickableAreas.push({ type: 'after-image', x: 0, y: halfHeight, width, height: halfHeight });
          }
          // 중앙 구분선
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, halfHeight);
          ctx.lineTo(width, halfHeight);
          ctx.stroke();
          break;
        }
        case 'slider': {
          const dividerX = (sliderPosition / 100) * width;
          if (afterImg) {
            drawImageContain(ctx, afterImg, 0, 0, width, height, afterTransform);
          }
          if (beforeImg) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, dividerX, height);
            ctx.clip();
            drawImageContain(ctx, beforeImg, 0, 0, width, height, beforeTransform);
            ctx.restore();
          }
          newClickableAreas.push({ type: 'before-image', x: 0, y: 0, width: dividerX, height });
          newClickableAreas.push({ type: 'after-image', x: dividerX, y: 0, width: width - dividerX, height });

          // 슬라이더 라인
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(dividerX, 0);
          ctx.lineTo(dividerX, height);
          ctx.stroke();
          // 슬라이더 핸들
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(dividerX, height / 2, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#333333';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('◀▶', dividerX, height / 2);
          break;
        }
        case 'diagonal': {
          if (afterImg) {
            drawImageContain(ctx, afterImg, 0, 0, width, height, afterTransform);
          }
          if (beforeImg) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(width, 0);
            ctx.lineTo(0, height);
            ctx.closePath();
            ctx.clip();
            drawImageContain(ctx, beforeImg, 0, 0, width, height, beforeTransform);
            ctx.restore();
          }
          newClickableAreas.push({ type: 'before-image', x: 0, y: 0, width: width / 2, height: height / 2 });
          newClickableAreas.push({ type: 'after-image', x: width / 2, y: height / 2, width: width / 2, height: height / 2 });

          // 대각선
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(width, 0);
          ctx.lineTo(0, height);
          ctx.stroke();
          break;
        }
        case 'circle': {
          if (afterImg) {
            drawImageContain(ctx, afterImg, 0, 0, width, height, afterTransform);
          }
          if (beforeImg) {
            ctx.save();
            ctx.beginPath();
            const radius = Math.min(width, height) * 0.35;
            ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
            ctx.clip();
            drawImageContain(ctx, beforeImg, 0, 0, width, height, beforeTransform);
            ctx.restore();
            // 원형 테두리
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
            ctx.stroke();

            const circleRadius = Math.min(width, height) * 0.35;
            newClickableAreas.push({
              type: 'before-image',
              x: width / 2 - circleRadius,
              y: height / 2 - circleRadius,
              width: circleRadius * 2,
              height: circleRadius * 2
            });
          }
          newClickableAreas.push({ type: 'after-image', x: 0, y: 0, width, height });
          break;
        }
      }

      // 라벨 그리기
      if (labels.showLabels) {
        ctx.font = `bold ${labels.fontSize}px "Pretendard", "Noto Sans KR", sans-serif`;

        const drawLabel = (text: string, position: LabelPosition, type: ClickableArea['type']) => {
          const metrics = ctx.measureText(text);
          const padding = 12;
          const labelHeight = labels.fontSize + padding * 2;
          const labelWidth = metrics.width + padding * 2;

          const labelX = position.x - labelWidth / 2;
          const labelY = position.y - labelHeight / 2;

          // 배경
          ctx.fillStyle = labels.backgroundColor;
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
          ctx.fill();

          // 드래그 중 하이라이트
          if (dragTarget === type) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // 텍스트
          ctx.fillStyle = labels.fontColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, position.x, position.y);

          // 클릭 영역 추가
          newClickableAreas.push({ type, x: labelX, y: labelY, width: labelWidth, height: labelHeight });
        };

        drawLabel(labels.beforeText, labels.beforePosition, 'before-label');
        drawLabel(labels.afterText, labels.afterPosition, 'after-label');

        if (labels.customText) {
          ctx.font = `${labels.fontSize * 0.75}px "Pretendard", "Noto Sans KR", sans-serif`;
          const metrics = ctx.measureText(labels.customText);
          const padding = 8;
          const labelHeight = labels.fontSize * 0.75 + padding * 2;
          const labelWidth = metrics.width + padding * 2;

          const labelX = labels.customPosition.x - labelWidth / 2;
          const labelY = labels.customPosition.y - labelHeight / 2;

          ctx.fillStyle = labels.backgroundColor;
          ctx.beginPath();
          ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
          ctx.fill();

          if (dragTarget === 'custom-label') {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          ctx.fillStyle = labels.fontColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labels.customText, labels.customPosition.x, labels.customPosition.y);

          newClickableAreas.push({ type: 'custom-label', x: labelX, y: labelY, width: labelWidth, height: labelHeight });
        }

        if (labels.showDate) {
          const dateText = new Date().toLocaleDateString('ko-KR');
          ctx.font = `${labels.fontSize * 0.6}px "Pretendard", "Noto Sans KR", sans-serif`;
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.textAlign = 'right';
          ctx.fillText(dateText, width - 20, height - 20);
        }
      }

      // 워터마크 그리기
      if (watermark.enabled && watermark.image) {
        const watermarkImg = await loadImage(watermark.image);
        if (watermarkImg) {
          const wmSize = watermark.size;
          const aspect = watermarkImg.width / watermarkImg.height;
          const wmWidth = wmSize;
          const wmHeight = wmSize / aspect;

          ctx.globalAlpha = watermark.opacity / 100;
          ctx.drawImage(watermarkImg, watermark.x, watermark.y, wmWidth, wmHeight);
          ctx.globalAlpha = 1;

          // 드래그 중 하이라이트
          if (dragTarget === 'watermark') {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(watermark.x, watermark.y, wmWidth, wmHeight);
            ctx.setLineDash([]);
          }

          newClickableAreas.push({ type: 'watermark', x: watermark.x, y: watermark.y, width: wmWidth, height: wmHeight });
        }
      }

      // 드래그 중인 이미지 영역 하이라이트
      if (dragTarget === 'before-image' || dragTarget === 'after-image') {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 10]);

        if (layout === 'horizontal') {
          const x = dragTarget === 'before-image' ? 0 : width / 2;
          ctx.strokeRect(x + 2, 2, width / 2 - 4, height - 4);
        } else if (layout === 'vertical') {
          const y = dragTarget === 'before-image' ? 0 : height / 2;
          ctx.strokeRect(2, y + 2, width - 4, height / 2 - 4);
        } else {
          ctx.strokeRect(2, 2, width - 4, height - 4);
        }
        ctx.setLineDash([]);
      }

      setClickableAreas(newClickableAreas);
    };

    drawImages();
  }, [beforeImage, afterImage, processedBeforeImage, processedAfterImage, outline.enabled, layout, sliderPosition, labels, watermark, outputSize, beforeTransform, afterTransform, dragTarget, drawImageContain]);

  // 미리보기 업데이트
  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // 이미지 다운로드
  const downloadImage = useCallback((format: 'png' | 'jpg') => {
    // 다운로드 전 드래그 상태 해제
    setDragTarget(null);

    setTimeout(() => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;

      setIsGenerating(true);

      // 하이라이트 없이 다시 렌더링
      setTimeout(() => {
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const quality = format === 'jpg' ? 0.9 : undefined;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        const link = document.createElement('a');
        link.download = `before-after-${Date.now()}.${format}`;
        link.href = dataUrl;
        link.click();

        setIsGenerating(false);
        toast.success('이미지가 다운로드되었습니다');
      }, 100);
    }, 50);
  }, []);

  // 초기화
  const resetAll = useCallback(() => {
    setBeforeImage(null);
    setAfterImage(null);
    setProcessedBeforeImage(null);
    setProcessedAfterImage(null);
    setBeforeTransform({ x: 0, y: 0, scale: 1 });
    setAfterTransform({ x: 0, y: 0, scale: 1 });
    setLayout('horizontal');
    setSliderPosition(50);
    setOutline({ enabled: true, color: '#ffffff', thickness: 4 });
    const defaults = getDefaultLabelPositions();
    setLabels({
      showLabels: true,
      beforeText: 'BEFORE',
      afterText: 'AFTER',
      showDate: false,
      customText: '',
      fontSize: 24,
      fontColor: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      beforePosition: defaults.before,
      afterPosition: defaults.after,
      customPosition: defaults.custom,
    });
    setWatermark({
      enabled: false,
      image: null,
      x: outputSize.width - 120,
      y: outputSize.height - 70,
      opacity: 70,
      size: 100,
    });
    setDragTarget(null);
    toast.success('모두 초기화되었습니다');
  }, [getDefaultLabelPositions, outputSize]);

  const layoutOptions = [
    { type: 'horizontal' as LayoutType, icon: SplitSquareHorizontal, label: '좌우' },
    { type: 'vertical' as LayoutType, icon: SplitSquareVertical, label: '상하' },
    { type: 'slider' as LayoutType, icon: ArrowLeftRight, label: '슬라이더' },
    { type: 'diagonal' as LayoutType, icon: Triangle, label: '대각선' },
    { type: 'circle' as LayoutType, icon: Circle, label: '원형' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f5f5f5] py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111111] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            홈으로
          </Link>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#111111] mb-4">
            비포애프터 생성기
          </h1>
          <p className="text-[#6b7280] text-lg">
            전/후 비교 이미지를 쉽게 만들어보세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 왼쪽: 설정 패널 */}
          <div className="space-y-6">
            {/* 이미지 업로드 */}
            <Card className="border-[#eeeeee] shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="w-5 h-5 text-[#3b82f6]" />
                  이미지 업로드
                </CardTitle>
                <CardDescription>
                  Before와 After 이미지를 업로드하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Before 이미지 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Before</Label>
                    <div
                      className={`relative aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden
                        ${beforeImage ? 'border-[#3b82f6] bg-[#3b82f6]/5' : 'border-[#e5e5e5] hover:border-[#3b82f6] bg-[#fafafa]'}`}
                      onClick={() => beforeInputRef.current?.click()}
                    >
                      {beforeImage ? (
                        <>
                          <img src={beforeImage} alt="Before" className="w-full h-full object-contain bg-[#222]" />
                          <button
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBeforeImage(null);
                              setProcessedBeforeImage(null);
                              setBeforeTransform({ x: 0, y: 0, scale: 1 });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-[#9ca3af]">
                          <ImageIcon className="w-10 h-10 mb-2" />
                          <span className="text-sm">클릭하여 업로드</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={beforeInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, setBeforeImage, setProcessedBeforeImage)}
                    />
                  </div>

                  {/* After 이미지 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">After</Label>
                    <div
                      className={`relative aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden
                        ${afterImage ? 'border-[#10b981] bg-[#10b981]/5' : 'border-[#e5e5e5] hover:border-[#10b981] bg-[#fafafa]'}`}
                      onClick={() => afterInputRef.current?.click()}
                    >
                      {afterImage ? (
                        <>
                          <img src={afterImage} alt="After" className="w-full h-full object-contain bg-[#222]" />
                          <button
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAfterImage(null);
                              setProcessedAfterImage(null);
                              setAfterTransform({ x: 0, y: 0, scale: 1 });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-[#9ca3af]">
                          <ImageIcon className="w-10 h-10 mb-2" />
                          <span className="text-sm">클릭하여 업로드</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={afterInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, setAfterImage, setProcessedAfterImage)}
                    />
                  </div>
                </div>

                {/* 이미지 크기 조절 */}
                {(beforeImage || afterImage) && (
                  <div className="pt-4 border-t border-[#eeeeee] space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ZoomIn className="w-4 h-4" />
                      이미지 크기 조절
                    </Label>
                    {beforeImage && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6b7280]">Before 크기: {Math.round(beforeTransform.scale * 100)}%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setBeforeTransform({ x: 0, y: 0, scale: 1 })}
                          >
                            리셋
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <ZoomOut className="w-4 h-4 text-[#9ca3af]" />
                          <Slider
                            value={[beforeTransform.scale * 100]}
                            onValueChange={([value]) => setBeforeTransform(prev => ({ ...prev, scale: value / 100 }))}
                            min={50}
                            max={200}
                            step={5}
                            className="flex-1"
                          />
                          <ZoomIn className="w-4 h-4 text-[#9ca3af]" />
                        </div>
                      </div>
                    )}
                    {afterImage && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6b7280]">After 크기: {Math.round(afterTransform.scale * 100)}%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setAfterTransform({ x: 0, y: 0, scale: 1 })}
                          >
                            리셋
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <ZoomOut className="w-4 h-4 text-[#9ca3af]" />
                          <Slider
                            value={[afterTransform.scale * 100]}
                            onValueChange={([value]) => setAfterTransform(prev => ({ ...prev, scale: value / 100 }))}
                            min={50}
                            max={200}
                            step={5}
                            className="flex-1"
                          />
                          <ZoomIn className="w-4 h-4 text-[#9ca3af]" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 레이아웃 선택 */}
            <Card className="border-[#eeeeee] shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="w-5 h-5 text-[#8b5cf6]" />
                  레이아웃
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {layoutOptions.map((option) => (
                    <Button
                      key={option.type}
                      variant={layout === option.type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLayout(option.type)}
                      className={layout === option.type
                        ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'
                        : 'border-[#eeeeee]'}
                    >
                      <option.icon className="w-4 h-4 mr-1" />
                      {option.label}
                    </Button>
                  ))}
                </div>

                {layout === 'slider' && (
                  <div className="space-y-2">
                    <Label className="text-sm">슬라이더 위치: {sliderPosition}%</Label>
                    <Slider
                      value={[sliderPosition]}
                      onValueChange={([value]) => setSliderPosition(value)}
                      min={10}
                      max={90}
                      step={1}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm">출력 크기</Label>
                  <div className="flex flex-wrap gap-2">
                    {OUTPUT_SIZES.map((size) => (
                      <Button
                        key={size.label}
                        variant={outputSize.label === size.label ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setOutputSize(size)}
                        className={outputSize.label === size.label
                          ? 'bg-[#111111] hover:bg-[#333333] text-white'
                          : 'border-[#eeeeee] text-xs'}
                      >
                        {size.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 아웃라인 설정 */}
            <Card className="border-[#eeeeee] shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Palette className="w-5 h-5 text-[#f72c5b]" />
                  아웃라인 (윤곽선)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">아웃라인 사용</Label>
                  <Button
                    variant={outline.enabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOutline(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={outline.enabled ? 'bg-[#10b981] hover:bg-[#059669]' : ''}
                  >
                    {outline.enabled ? 'ON' : 'OFF'}
                  </Button>
                </div>

                {outline.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">색상</Label>
                      <div className="flex gap-2">
                        {['#ffffff', '#000000', '#f72c5b', '#3b82f6', '#10b981'].map((color) => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              outline.color === color ? 'border-[#111111] scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setOutline(prev => ({ ...prev, color }))}
                          />
                        ))}
                        <input
                          type="color"
                          value={outline.color}
                          onChange={(e) => setOutline(prev => ({ ...prev, color: e.target.value }))}
                          className="w-8 h-8 rounded-full cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">두께: {outline.thickness}px</Label>
                      <Slider
                        value={[outline.thickness]}
                        onValueChange={([value]) => setOutline(prev => ({ ...prev, thickness: value }))}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>

                    <Button
                      className="w-full bg-[#f72c5b] hover:bg-[#e0264f] text-white"
                      onClick={applyOutline}
                      disabled={isProcessingOutline || (!beforeImage && !afterImage)}
                    >
                      {isProcessingOutline ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          처리 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          아웃라인 적용
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 라벨 설정 */}
            <Card className="border-[#eeeeee] shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Type className="w-5 h-5 text-[#f59e0b]" />
                  텍스트 / 라벨
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">라벨 표시</Label>
                  <Button
                    variant={labels.showLabels ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLabels(prev => ({ ...prev, showLabels: !prev.showLabels }))}
                    className={labels.showLabels ? 'bg-[#f59e0b] hover:bg-[#d97706]' : ''}
                  >
                    {labels.showLabels ? 'ON' : 'OFF'}
                  </Button>
                </div>

                {labels.showLabels && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Before 텍스트</Label>
                        <Input
                          value={labels.beforeText}
                          onChange={(e) => setLabels(prev => ({ ...prev, beforeText: e.target.value }))}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">After 텍스트</Label>
                        <Input
                          value={labels.afterText}
                          onChange={(e) => setLabels(prev => ({ ...prev, afterText: e.target.value }))}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">커스텀 텍스트 (하단)</Label>
                      <Input
                        value={labels.customText}
                        onChange={(e) => setLabels(prev => ({ ...prev, customText: e.target.value }))}
                        placeholder="예: 4주 운동 프로그램 결과"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-sm">날짜 표시</Label>
                      <Button
                        variant={labels.showDate ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLabels(prev => ({ ...prev, showDate: !prev.showDate }))}
                        className={labels.showDate ? 'bg-[#6b7280] hover:bg-[#4b5563]' : ''}
                      >
                        {labels.showDate ? 'ON' : 'OFF'}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">글자 크기: {labels.fontSize}px</Label>
                      <Slider
                        value={[labels.fontSize]}
                        onValueChange={([value]) => setLabels(prev => ({ ...prev, fontSize: value }))}
                        min={14}
                        max={48}
                        step={2}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 워터마크 설정 */}
            <Card className="border-[#eeeeee] shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Stamp className="w-5 h-5 text-[#6366f1]" />
                  워터마크 / 로고
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">워터마크 사용</Label>
                  <Button
                    variant={watermark.enabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setWatermark(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={watermark.enabled ? 'bg-[#6366f1] hover:bg-[#4f46e5]' : ''}
                  >
                    {watermark.enabled ? 'ON' : 'OFF'}
                  </Button>
                </div>

                {watermark.enabled && (
                  <>
                    <div
                      className="h-20 rounded-lg border-2 border-dashed border-[#e5e5e5] flex items-center justify-center cursor-pointer hover:border-[#6366f1] transition-colors"
                      onClick={() => watermarkInputRef.current?.click()}
                    >
                      {watermark.image ? (
                        <img src={watermark.image} alt="Watermark" className="h-16 object-contain" />
                      ) : (
                        <span className="text-sm text-[#9ca3af]">로고 이미지 업로드</span>
                      )}
                    </div>
                    <input
                      ref={watermarkInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleWatermarkUpload}
                    />

                    <div className="space-y-2">
                      <Label className="text-sm">투명도: {watermark.opacity}%</Label>
                      <Slider
                        value={[watermark.opacity]}
                        onValueChange={([value]) => setWatermark(prev => ({ ...prev, opacity: value }))}
                        min={10}
                        max={100}
                        step={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">크기: {watermark.size}px</Label>
                      <Slider
                        value={[watermark.size]}
                        onValueChange={([value]) => setWatermark(prev => ({ ...prev, size: value }))}
                        min={50}
                        max={300}
                        step={10}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 오른쪽: 미리보기 & 다운로드 */}
          <div className="space-y-6">
            {/* 미리보기 */}
            <Card className="border-[#eeeeee] shadow-lg sticky top-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="w-5 h-5 text-[#10b981]" />
                    미리보기
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAll}
                    className="border-[#eeeeee]"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    초기화
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 드래그 안내 */}
                {(beforeImage || afterImage) && (
                  <div className="flex items-center gap-2 text-xs text-[#3b82f6] bg-[#3b82f6]/10 p-2 rounded">
                    <Hand className="w-4 h-4" />
                    <span>이미지, 라벨, 워터마크를 직접 드래그하여 위치를 조절하세요</span>
                  </div>
                )}

                {/* Canvas 미리보기 */}
                <div
                  ref={previewContainerRef}
                  className={`relative bg-[#1a1a1a] rounded-xl overflow-hidden select-none ${
                    (beforeImage || afterImage) ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full h-auto"
                    style={{ aspectRatio: `${outputSize.width}/${outputSize.height}` }}
                  />
                  {!beforeImage && !afterImage && (
                    <div className="absolute inset-0 flex items-center justify-center text-[#9ca3af]">
                      <div className="text-center">
                        <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
                        <p>이미지를 업로드하면</p>
                        <p>미리보기가 표시됩니다</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 다운로드 버튼 */}
                <div className="flex gap-3">
                  <Button
                    className="flex-1 h-12 bg-[#3b82f6] hover:bg-[#2563eb] text-white"
                    onClick={() => downloadImage('png')}
                    disabled={isGenerating || (!beforeImage && !afterImage)}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5 mr-2" />
                    )}
                    PNG 다운로드
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-[#10b981] hover:bg-[#059669] text-white"
                    onClick={() => downloadImage('jpg')}
                    disabled={isGenerating || (!beforeImage && !afterImage)}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5 mr-2" />
                    )}
                    JPG 다운로드
                  </Button>
                </div>

                {/* 사용 팁 */}
                <div className="bg-[#f5f5f5] rounded-xl p-4">
                  <h4 className="font-semibold text-[#111111] mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#f72c5b]" />
                    사용 팁
                  </h4>
                  <ul className="text-sm text-[#6b7280] space-y-1">
                    <li>1. Before/After 이미지를 각각 업로드하세요</li>
                    <li>2. <span className="text-[#3b82f6]">미리보기에서 직접 드래그</span>하여 위치 조절</li>
                    <li>3. 슬라이더로 이미지 크기를 확대/축소하세요</li>
                    <li>4. 라벨과 워터마크도 드래그로 이동 가능</li>
                    <li>5. PNG 또는 JPG로 다운로드하세요</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
