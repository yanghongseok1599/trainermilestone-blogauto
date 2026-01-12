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
  SplitSquareHorizontal,
  SplitSquareVertical,
  Circle,
  Triangle,
  Type,
  Stamp,
  Loader2,
  Sparkles,
  RefreshCw,
  Settings,
  Palette,
  Hand,
  RotateCw,
  Undo2,
  Scissors,
  X,
  Eraser
} from 'lucide-react';
import { toast } from 'sonner';
import { removeBackground as removeBackgroundML } from '@imgly/background-removal';

// 레이아웃 타입
type LayoutType = 'horizontal' | 'vertical' | 'slider' | 'diagonal' | 'circle';

// 아웃라인 스타일 타입
type OutlineStyle = 'solid' | 'gradient' | 'glow';

// 아웃라인 설정 타입
interface OutlineSettings {
  enabled: boolean;
  color: string;
  beforeThickness: number;
  afterThickness: number;
  style: OutlineStyle;
}

// 이미지 변환 설정 타입
interface ImageTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number; // 회전 각도 (degree)
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
type ClickableType = 'before-image' | 'after-image' | 'before-label' | 'after-label' | 'custom-label' | 'watermark' | 'slider-divider' | 'resize-handle';

// 핸들 위치 타입 (8개 리사이즈 + 1개 회전)
type HandlePosition = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l' | 'rotate';

interface ClickableArea {
  type: ClickableType;
  x: number;
  y: number;
  width: number;
  height: number;
  handlePosition?: HandlePosition; // 리사이즈/회전 핸들 위치
  targetImage?: 'before' | 'after'; // 어느 이미지의 핸들인지
}

// 이미지 캐시 타입
interface ImageCache {
  before: HTMLImageElement | null;
  after: HTMLImageElement | null;
  watermark: HTMLImageElement | null;
}

const OUTPUT_SIZES: OutputSize[] = [
  { width: 1080, height: 1080, label: 'Instagram (1:1)' },
  { width: 1920, height: 1080, label: 'YouTube (16:9)' },
  { width: 1200, height: 630, label: 'Facebook/Blog' },
  { width: 800, height: 800, label: '소형 (800px)' },
  { width: 0, height: 0, label: '커스텀' },
];

export default function BeforeAfterPage() {
  // 이미지 상태
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);

  // 이미지 변환 상태
  const [beforeTransform, setBeforeTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [afterTransform, setAfterTransform] = useState<ImageTransform>({ x: 0, y: 0, scale: 1, rotation: 0 });

  // 히스토리 상태 (Undo/Redo)
  interface HistoryState {
    beforeImage: string | null;
    afterImage: string | null;
    beforeTransform: ImageTransform;
    afterTransform: ImageTransform;
    processedBeforeImage: string | null;
    processedAfterImage: string | null;
  }
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);

  // 레이아웃 설정
  const [layout, setLayout] = useState<LayoutType>('horizontal');
  const [sliderPosition, setSliderPosition] = useState(50);

  // 아웃라인 설정
  const [outline, setOutline] = useState<OutlineSettings>({
    enabled: true,
    color: '#ffffff',
    beforeThickness: 4,
    afterThickness: 4,
    style: 'solid',
  });

  // 출력 크기
  const [outputSize, setOutputSize] = useState<OutputSize>(OUTPUT_SIZES[0]);
  const [customWidth, setCustomWidth] = useState<number>(1080);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [isCustomSize, setIsCustomSize] = useState(false);

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

  // 드래그앤드롭 업로드 상태
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropTarget, setDropTarget] = useState<'before' | 'after' | null>(null);

  // 선택된 이미지 (리사이즈 핸들 표시용)
  const [selectedImage, setSelectedImage] = useState<'before' | 'after' | null>(null);

  // 리사이즈/회전 핸들 드래그 상태
  const [resizeHandle, setResizeHandle] = useState<{ position: HandlePosition; target: 'before' | 'after' } | null>(null);
  const [resizeStartScale, setResizeStartScale] = useState(1);
  const [resizeStartRotation, setResizeStartRotation] = useState(0);
  const [resizeStartBounds, setResizeStartBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // 클릭 가능한 영역 저장
  const [clickableAreas, setClickableAreas] = useState<ClickableArea[]>([]);

  // 이미지 캐시 (깜빡임 방지)
  const imageCacheRef = useRef<ImageCache>({ before: null, after: null, watermark: null });

  // 이미지 로드 완료 상태 (렌더링 트리거용)
  const [imagesLoaded, setImagesLoaded] = useState(0);

  // 생성 상태
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessingOutline, setIsProcessingOutline] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [processedBeforeImage, setProcessedBeforeImage] = useState<string | null>(null);
  const [processedAfterImage, setProcessedAfterImage] = useState<string | null>(null);

  // ML 마스크 캐시 (실시간 두께 조절용)
  const [beforeMaskData, setBeforeMaskData] = useState<ImageData | null>(null);
  const [afterMaskData, setAfterMaskData] = useState<ImageData | null>(null);

  // 지우개 모드
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [eraserSize, setEraserSize] = useState(20);
  const [erasedAreas, setErasedAreas] = useState<{before: Array<{x: number, y: number, size: number}>, after: Array<{x: number, y: number, size: number}>}>({before: [], after: []});
  const [needsOutlineReapply, setNeedsOutlineReapply] = useState(false);

  // 영역 제외 모드 (클릭으로 연결된 영역 제외)
  const [isAreaExcludeMode, setIsAreaExcludeMode] = useState(false);
  const [excludedRegions, setExcludedRegions] = useState<{before: Set<number>, after: Set<number>}>({ before: new Set(), after: new Set() });

  // Canvas refs (더블 버퍼링)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 디바운스 및 캐시 refs (성능 최적화)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outlineCacheRef = useRef<{
    before: { outerBg: Uint8Array; fgMask: Uint8Array; w: number; h: number; boundaryPixels: number[]; componentLabels: Int32Array } | null;
    after: { outerBg: Uint8Array; fgMask: Uint8Array; w: number; h: number; boundaryPixels: number[]; componentLabels: Int32Array } | null;
  }>({ before: null, after: null });
  const pendingUpdateRef = useRef<{ before: boolean; after: boolean }>({ before: false, after: false });
  // 최신 outline 설정을 참조하기 위한 ref (클로저 stale 문제 해결)
  const outlineRef = useRef(outline);
  outlineRef.current = outline;
  // 최신 이미지/마스크 데이터를 참조하기 위한 refs
  const beforeImageRef = useRef(beforeImage);
  beforeImageRef.current = beforeImage;
  const afterImageRef = useRef(afterImage);
  afterImageRef.current = afterImage;
  const beforeMaskDataRef = useRef(beforeMaskData);
  beforeMaskDataRef.current = beforeMaskData;
  const afterMaskDataRef = useRef(afterMaskData);
  afterMaskDataRef.current = afterMaskData;
  const erasedAreasRef = useRef(erasedAreas);
  erasedAreasRef.current = erasedAreas;
  const excludedRegionsRef = useRef(excludedRegions);
  excludedRegionsRef.current = excludedRegions;

  // 파일 input refs
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  // 버퍼 캔버스 초기화
  useEffect(() => {
    if (!bufferCanvasRef.current) {
      bufferCanvasRef.current = document.createElement('canvas');
    }
  }, []);

  // 히스토리에 현재 상태 저장
  const saveToHistory = useCallback(() => {
    if (isUndoRedoAction) return;

    const currentState: HistoryState = {
      beforeImage,
      afterImage,
      beforeTransform,
      afterTransform,
      processedBeforeImage,
      processedAfterImage,
    };

    setHistory(prev => {
      // 현재 인덱스 이후의 히스토리 제거 (새로운 액션 시)
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(currentState);
      // 최대 20개 히스토리 유지
      if (newHistory.length > 20) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [beforeImage, afterImage, beforeTransform, afterTransform, processedBeforeImage, processedAfterImage, historyIndex, isUndoRedoAction]);

  // Undo 함수
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    setIsUndoRedoAction(true);
    const prevState = history[historyIndex - 1];

    setBeforeImage(prevState.beforeImage);
    setAfterImage(prevState.afterImage);
    setBeforeTransform(prevState.beforeTransform);
    setAfterTransform(prevState.afterTransform);
    setProcessedBeforeImage(prevState.processedBeforeImage);
    setProcessedAfterImage(prevState.processedAfterImage);
    setHistoryIndex(prev => prev - 1);

    setTimeout(() => setIsUndoRedoAction(false), 100);
  }, [history, historyIndex]);


  // 키보드 단축키 (Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  // 이미지 프리로드 및 캐싱
  const preloadImage = useCallback((src: string | null, key: keyof ImageCache): Promise<HTMLImageElement | null> => {
    if (!src) {
      imageCacheRef.current[key] = null;
      setImagesLoaded(prev => prev + 1); // 상태 변경으로 렌더링 트리거
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      // 이미 캐시되어 있고 같은 소스면 캐시 사용
      const cached = imageCacheRef.current[key];
      if (cached && cached.src === src) {
        resolve(cached);
        return;
      }

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCacheRef.current[key] = img;
        setImagesLoaded(prev => prev + 1); // 이미지 로드 완료시 렌더링 트리거
        resolve(img);
      };
      img.onerror = () => {
        setImagesLoaded(prev => prev + 1);
        resolve(null);
      };
      img.src = src;
    });
  }, []);

  // 이미지 변경 시 프리로드
  useEffect(() => {
    const beforeSrc = outline.enabled && processedBeforeImage ? processedBeforeImage : beforeImage;
    preloadImage(beforeSrc, 'before');
  }, [beforeImage, processedBeforeImage, outline.enabled, preloadImage]);

  useEffect(() => {
    const afterSrc = outline.enabled && processedAfterImage ? processedAfterImage : afterImage;
    preloadImage(afterSrc, 'after');
  }, [afterImage, processedAfterImage, outline.enabled, preloadImage]);

  useEffect(() => {
    if (watermark.image) {
      preloadImage(watermark.image, 'watermark');
    }
  }, [watermark.image, preloadImage]);

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

    saveToHistory(); // 히스토리 저장

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      if (setProcessed) setProcessed(null);
      toast.success('이미지가 업로드되었습니다');
    };
    reader.readAsDataURL(file);
  }, [saveToHistory]);

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

  // 이미지 삭제 핸들러
  const deleteBeforeImage = useCallback(() => {
    saveToHistory();
    setBeforeImage(null);
    setProcessedBeforeImage(null);
    setBeforeTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    imageCacheRef.current.before = null;
    setSelectedImage(null);
    toast.success('Before 이미지가 삭제되었습니다');
  }, [saveToHistory]);

  const deleteAfterImage = useCallback(() => {
    saveToHistory();
    setAfterImage(null);
    setProcessedAfterImage(null);
    setAfterTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    imageCacheRef.current.after = null;
    setSelectedImage(null);
    toast.success('After 이미지가 삭제되었습니다');
  }, [saveToHistory]);

  // 드래그앤드롭: 어느 영역에 드롭할지 결정
  const getDropTarget = useCallback((clientX: number, clientY: number): 'before' | 'after' => {
    const container = previewContainerRef.current;
    if (!container) return 'before';

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const relativeX = x / rect.width;

    if (layout === 'horizontal') {
      return relativeX < 0.5 ? 'before' : 'after';
    } else if (layout === 'vertical') {
      const y = clientY - rect.top;
      const relativeY = y / rect.height;
      return relativeY < 0.5 ? 'before' : 'after';
    } else if (layout === 'slider') {
      return relativeX < sliderPosition / 100 ? 'before' : 'after';
    } else {
      // diagonal, circle - 기본적으로 before/after 영역 분리
      return relativeX < 0.5 ? 'before' : 'after';
    }
  }, [layout, sliderPosition]);

  // 드래그앤드롭: 드래그 오버 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
      const target = getDropTarget(e.clientX, e.clientY);
      setDropTarget(target);
    }
  }, [getDropTarget]);

  // 드래그앤드롭: 드래그 리브 핸들러
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 자식 요소로 이동할 때는 무시
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
    setDropTarget(null);
  }, []);

  // 드래그앤드롭: 드롭 핸들러
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDropTarget(null);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (!imageFile) {
      toast.error('이미지 파일만 업로드 가능합니다');
      return;
    }

    saveToHistory(); // 히스토리 저장

    const target = getDropTarget(e.clientX, e.clientY);
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      if (target === 'before') {
        setBeforeImage(imageData);
        setProcessedBeforeImage(null);
        setBeforeTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
        imageCacheRef.current.before = null;
        toast.success('Before 이미지가 업로드되었습니다');
      } else {
        setAfterImage(imageData);
        setProcessedAfterImage(null);
        setAfterTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
        imageCacheRef.current.after = null;
        toast.success('After 이미지가 업로드되었습니다');
      }
    };
    reader.readAsDataURL(imageFile);
  }, [getDropTarget, saveToHistory]);

  // Canvas 좌표 변환 (화면 좌표 -> Canvas 좌표)
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const container = previewContainerRef.current;
    if (!container) return { x: 0, y: 0 };

    // 프레임 70% 스케일로 인한 전체 캔버스 크기 계산
    const frameScale = 0.7;
    const canvasWidth = Math.round(outputSize.width / frameScale);
    const canvasHeight = Math.round(outputSize.height / frameScale);

    const rect = container.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;

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

  // 이미지 이동 제한 계산 (cover 모드 - 프레임을 항상 완전히 채움)
  const clampImageTransform = useCallback((
    transform: ImageTransform,
    imgWidth: number,
    imgHeight: number,
    areaWidth: number,
    areaHeight: number
  ): ImageTransform => {
    // contain 방식으로 기본 그리기 크기 계산 (이미지 전체가 보이도록)
    const imgRatio = imgWidth / imgHeight;
    const areaRatio = areaWidth / areaHeight;

    let baseW: number, baseH: number;
    if (imgRatio > areaRatio) {
      // 이미지가 더 넓음 - 너비 기준 (contain)
      baseW = areaWidth;
      baseH = areaWidth / imgRatio;
    } else {
      // 이미지가 더 높음 - 높이 기준 (contain)
      baseH = areaHeight;
      baseW = areaHeight * imgRatio;
    }

    // 스케일은 최소 0.5, 최대 3.0 (확대/축소 가능)
    const clampedScale = Math.max(0.5, Math.min(3, transform.scale));

    // 스케일 적용된 크기
    const scaledW = baseW * clampedScale;
    const scaledH = baseH * clampedScale;

    // 이동 가능 범위 계산
    // 이미지가 프레임보다 클 때: 이미지 가장자리가 프레임 안쪽으로 들어오지 않도록
    // 이미지가 프레임보다 작을 때: 이미지가 프레임 안에서 자유롭게 이동 가능
    let maxX: number, maxY: number;
    if (scaledW >= areaWidth) {
      maxX = (scaledW - areaWidth) / 2;
    } else {
      maxX = (areaWidth - scaledW) / 2;
    }
    if (scaledH >= areaHeight) {
      maxY = (scaledH - areaHeight) / 2;
    } else {
      maxY = (areaHeight - scaledH) / 2;
    }

    return {
      ...transform,
      scale: clampedScale,
      x: Math.max(-maxX, Math.min(maxX, transform.x)),
      y: Math.max(-maxY, Math.min(maxY, transform.y)),
    };
  }, []);

  // 마우스 다운 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);

    // 지우개 모드일 때 처리
    if (isEraserMode && (beforeMaskData || afterMaskData)) {
      const { width, height } = outputSize;

      // 클릭 위치가 어느 이미지 영역인지 확인
      let target: 'before' | 'after' | null = null;
      let imgCoords = { x: 0, y: 0 };

      // Before 이미지 영역 체크
      for (const area of clickableAreas) {
        if (area.type === 'before-image' &&
            coords.x >= area.x && coords.x <= area.x + area.width &&
            coords.y >= area.y && coords.y <= area.y + area.height &&
            beforeMaskData) {
          target = 'before';
          // 캔버스 좌표를 이미지 좌표로 변환
          const imgW = beforeMaskData.width;
          const imgH = beforeMaskData.height;
          const areaWidth = layout === 'horizontal' || layout === 'slider' ? width / 2 : width;
          const areaHeight = layout === 'vertical' ? height / 2 : height;
          const scale = beforeTransform.scale;

          // 이미지 중심 기준 상대 좌표
          const centerX = area.x + area.width / 2;
          const centerY = area.y + area.height / 2;
          const relX = (coords.x - centerX - beforeTransform.x) / scale;
          const relY = (coords.y - centerY - beforeTransform.y) / scale;

          // 이미지 좌표로 변환 (이미지 중심이 (0,0)인 좌표계에서 좌상단 기준으로)
          imgCoords = {
            x: Math.round(imgW / 2 + relX * (imgW / Math.max(areaWidth, areaHeight))),
            y: Math.round(imgH / 2 + relY * (imgH / Math.max(areaWidth, areaHeight)))
          };
          break;
        }
        if (area.type === 'after-image' &&
            coords.x >= area.x && coords.x <= area.x + area.width &&
            coords.y >= area.y && coords.y <= area.y + area.height &&
            afterMaskData) {
          target = 'after';
          const imgW = afterMaskData.width;
          const imgH = afterMaskData.height;
          const areaWidth = layout === 'horizontal' || layout === 'slider' ? width / 2 : width;
          const areaHeight = layout === 'vertical' ? height / 2 : height;
          const scale = afterTransform.scale;

          const centerX = area.x + area.width / 2;
          const centerY = area.y + area.height / 2;
          const relX = (coords.x - centerX - afterTransform.x) / scale;
          const relY = (coords.y - centerY - afterTransform.y) / scale;

          imgCoords = {
            x: Math.round(imgW / 2 + relX * (imgW / Math.max(areaWidth, areaHeight))),
            y: Math.round(imgH / 2 + relY * (imgH / Math.max(areaWidth, areaHeight)))
          };
          break;
        }
      }

      if (target) {
        // 지운 영역 추가
        setErasedAreas(prev => ({
          ...prev,
          [target!]: [...prev[target!], { x: imgCoords.x, y: imgCoords.y, size: eraserSize }]
        }));
        // 미리보기 업데이트 트리거
        setNeedsOutlineReapply(true);
        e.preventDefault();
        return;
      }
    }

    // 영역 제외 모드일 때 처리
    if (isAreaExcludeMode && (beforeMaskData || afterMaskData)) {
      const { width, height } = outputSize;

      let target: 'before' | 'after' | null = null;
      let imgCoords = { x: 0, y: 0 };

      // Before 이미지 영역 체크
      for (const area of clickableAreas) {
        if (area.type === 'before-image' &&
            coords.x >= area.x && coords.x <= area.x + area.width &&
            coords.y >= area.y && coords.y <= area.y + area.height &&
            beforeMaskData) {
          target = 'before';
          const imgW = beforeMaskData.width;
          const imgH = beforeMaskData.height;
          const areaWidth = layout === 'horizontal' || layout === 'slider' ? width / 2 : width;
          const areaHeight = layout === 'vertical' ? height / 2 : height;
          const scale = beforeTransform.scale;

          const centerX = area.x + area.width / 2;
          const centerY = area.y + area.height / 2;
          const relX = (coords.x - centerX - beforeTransform.x) / scale;
          const relY = (coords.y - centerY - beforeTransform.y) / scale;

          imgCoords = {
            x: Math.round(imgW / 2 + relX * (imgW / Math.max(areaWidth, areaHeight))),
            y: Math.round(imgH / 2 + relY * (imgH / Math.max(areaWidth, areaHeight)))
          };
          break;
        }
        if (area.type === 'after-image' &&
            coords.x >= area.x && coords.x <= area.x + area.width &&
            coords.y >= area.y && coords.y <= area.y + area.height &&
            afterMaskData) {
          target = 'after';
          const imgW = afterMaskData.width;
          const imgH = afterMaskData.height;
          const areaWidth = layout === 'horizontal' || layout === 'slider' ? width / 2 : width;
          const areaHeight = layout === 'vertical' ? height / 2 : height;
          const scale = afterTransform.scale;

          const centerX = area.x + area.width / 2;
          const centerY = area.y + area.height / 2;
          const relX = (coords.x - centerX - afterTransform.x) / scale;
          const relY = (coords.y - centerY - afterTransform.y) / scale;

          imgCoords = {
            x: Math.round(imgW / 2 + relX * (imgW / Math.max(areaWidth, areaHeight))),
            y: Math.round(imgH / 2 + relY * (imgH / Math.max(areaWidth, areaHeight)))
          };
          break;
        }
      }

      if (target) {
        const cache = outlineCacheRef.current[target];
        const maskData = target === 'before' ? beforeMaskData : afterMaskData;
        const thickness = target === 'before' ? outline.beforeThickness : outline.afterThickness;

        if (cache && maskData) {
          const { outerBg, w, h, boundaryPixels } = cache;
          const clickIdx = imgCoords.y * w + imgCoords.x;

          // 클릭 위치가 유효한지 확인
          if (imgCoords.x >= 0 && imgCoords.x < w && imgCoords.y >= 0 && imgCoords.y < h) {
            // 거리 맵 계산 (현재 두께 기준)
            const distMap = new Float32Array(w * h).fill(Infinity);
            for (const idx of boundaryPixels) {
              distMap[idx] = 0;
            }
            const distQueue = [...boundaryPixels];
            let dqStart = 0;
            while (dqStart < distQueue.length) {
              const idx = distQueue[dqStart++];
              const currentDist = distMap[idx];
              if (currentDist >= thickness) continue;
              const px = idx % w;
              const py = Math.floor(idx / w);
              const neighbors = [
                py > 0 ? idx - w : -1, py < h - 1 ? idx + w : -1,
                px > 0 ? idx - 1 : -1, px < w - 1 ? idx + 1 : -1
              ];
              for (const nIdx of neighbors) {
                if (nIdx >= 0 && outerBg[nIdx] === 1) {
                  const newDist = currentDist + 1;
                  if (newDist < distMap[nIdx] && newDist <= thickness) {
                    distMap[nIdx] = newDist;
                    distQueue.push(nIdx);
                  }
                }
              }
            }

            // 클릭된 위치가 아웃라인 영역인지 확인
            if (distMap[clickIdx] <= thickness && outerBg[clickIdx] === 1) {
              // 연결된 아웃라인 픽셀 찾기 (플러드 필)
              const connectedPixels = new Set<number>();
              const floodQueue = [clickIdx];
              const visited = new Set<number>();
              visited.add(clickIdx);

              while (floodQueue.length > 0) {
                const idx = floodQueue.pop()!;
                if (distMap[idx] <= thickness && outerBg[idx] === 1) {
                  connectedPixels.add(idx);
                  const px = idx % w;
                  const py = Math.floor(idx / w);
                  const neighbors = [
                    py > 0 ? idx - w : -1, py < h - 1 ? idx + w : -1,
                    px > 0 ? idx - 1 : -1, px < w - 1 ? idx + 1 : -1
                  ];
                  for (const nIdx of neighbors) {
                    if (nIdx >= 0 && !visited.has(nIdx) && distMap[nIdx] <= thickness && outerBg[nIdx] === 1) {
                      visited.add(nIdx);
                      floodQueue.push(nIdx);
                    }
                  }
                }
              }

              // 제외된 영역에 추가
              setExcludedRegions(prev => ({
                ...prev,
                [target!]: new Set([...prev[target!], ...connectedPixels])
              }));
              // 미리보기 업데이트 트리거
              setNeedsOutlineReapply(true);
              toast.success(`${connectedPixels.size}개 픽셀 영역이 제외되었습니다`);
            }
          }
        }
        e.preventDefault();
        return;
      }
    }

    // 먼저 클릭 영역에서 타겟 찾기
    let foundTarget: ClickableArea | null = null;
    for (let i = clickableAreas.length - 1; i >= 0; i--) {
      const area = clickableAreas[i];
      if (coords.x >= area.x && coords.x <= area.x + area.width &&
          coords.y >= area.y && coords.y <= area.y + area.height) {
        foundTarget = area;
        break;
      }
    }

    if (foundTarget) {
      // 리사이즈/회전 핸들 클릭
      if (foundTarget.type === 'resize-handle' && foundTarget.handlePosition && foundTarget.targetImage) {
        const targetTransform = foundTarget.targetImage === 'before' ? beforeTransform : afterTransform;
        setResizeHandle({ position: foundTarget.handlePosition, target: foundTarget.targetImage });
        setResizeStartScale(targetTransform.scale);
        setResizeStartRotation(targetTransform.rotation || 0);
        setDragStart(coords);
        setIsDragging(true);
        e.preventDefault();
        return;
      }

      // 이미지 클릭 시 선택 및 크기 조절 모드 시작
      if (foundTarget.type === 'before-image') {
        setSelectedImage('before');
        setResizeStartScale(beforeTransform.scale);
      } else if (foundTarget.type === 'after-image') {
        setSelectedImage('after');
        setResizeStartScale(afterTransform.scale);
      } else if (foundTarget.type !== 'slider-divider') {
        // 다른 요소 클릭 시 선택 해제
        setSelectedImage(null);
      }

      setIsDragging(true);
      setDragTarget(foundTarget.type);
      setDragStart(coords);
      e.preventDefault();
    } else {
      // 빈 공간 클릭 시 선택 해제
      setSelectedImage(null);
    }
  }, [getCanvasCoords, clickableAreas, beforeTransform, afterTransform, isEraserMode, beforeMaskData, afterMaskData, eraserSize, outputSize, layout, isAreaExcludeMode, outline.beforeThickness, outline.afterThickness]);

  // 마우스 이동 핸들러
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const coords = getCanvasCoords(e.clientX, e.clientY);

    const deltaX = coords.x - dragStart.x;
    const deltaY = coords.y - dragStart.y;

    const { width, height } = outputSize;
    const areaWidth = layout === 'horizontal' ? width / 2 : width;
    const areaHeight = layout === 'vertical' ? height / 2 : height;

    // 리사이즈/회전 핸들 드래그 처리
    if (resizeHandle) {
      const { position, target } = resizeHandle;
      const targetImg = target === 'before' ? imageCacheRef.current.before : imageCacheRef.current.after;
      const setTargetTransform = target === 'before' ? setBeforeTransform : setAfterTransform;

      if (!targetImg) return;

      // 회전 처리
      if (position === 'rotate') {
        // 이미지 중심점 계산
        const imgRatio = targetImg.width / targetImg.height;
        const targetRatio = areaWidth / areaHeight;
        let baseW: number, baseH: number;
        if (imgRatio > targetRatio) {
          baseW = areaWidth;
          baseH = areaWidth / imgRatio;
        } else {
          baseH = areaHeight;
          baseW = areaHeight * imgRatio;
        }

        const targetTransform = target === 'before' ? beforeTransform : afterTransform;
        const centerX = (layout === 'horizontal' && target === 'after' ? width / 2 : 0) + areaWidth / 2 + targetTransform.x;
        const centerY = (layout === 'vertical' && target === 'after' ? height / 2 : 0) + areaHeight / 2 + targetTransform.y;

        // 마우스 위치에서 중심점까지의 각도 계산
        const angle = Math.atan2(coords.y - centerY, coords.x - centerX) * 180 / Math.PI + 90;

        // Shift 키 누르면 15도 단위로 스냅
        let newRotation = angle;
        if (e.shiftKey) {
          newRotation = Math.round(angle / 15) * 15;
        }

        setTargetTransform(prev => ({ ...prev, rotation: newRotation }));
        return;
      }

      // 리사이즈 처리
      let scaleChange = 0;
      const sensitivity = 200;

      // 핸들 위치에 따른 스케일 변경 방향
      switch (position) {
        case 'br': // 우하단: 우하 방향 드래그 = 확대
          scaleChange = (deltaX + deltaY) / sensitivity;
          break;
        case 'tl': // 좌상단: 좌상 방향 드래그 = 확대
          scaleChange = (-deltaX - deltaY) / sensitivity;
          break;
        case 'tr': // 우상단: 우상 방향 드래그 = 확대
          scaleChange = (deltaX - deltaY) / sensitivity;
          break;
        case 'bl': // 좌하단: 좌하 방향 드래그 = 확대
          scaleChange = (-deltaX + deltaY) / sensitivity;
          break;
        case 't': // 상단: 위로 드래그 = 확대
          scaleChange = -deltaY / sensitivity;
          break;
        case 'b': // 하단: 아래로 드래그 = 확대
          scaleChange = deltaY / sensitivity;
          break;
        case 'l': // 좌측: 왼쪽으로 드래그 = 확대
          scaleChange = -deltaX / sensitivity;
          break;
        case 'r': // 우측: 오른쪽으로 드래그 = 확대
          scaleChange = deltaX / sensitivity;
          break;
      }

      const newScale = Math.max(0.5, Math.min(3, resizeStartScale + scaleChange));

      setTargetTransform(prev => {
        const newTransform = { ...prev, scale: newScale };
        return clampImageTransform(newTransform, targetImg.width, targetImg.height, areaWidth, areaHeight);
      });
      return;
    }

    if (!dragTarget) return;

    // Shift 키를 누르면 위치 이동, 아니면 크기 조절
    const isShiftPressed = e.shiftKey;

    switch (dragTarget) {
      case 'before-image': {
        const beforeImg = imageCacheRef.current.before;
        if (beforeImg) {
          // 드래그: 위치 이동
          setBeforeTransform(prev => {
            const newTransform = { ...prev, x: prev.x + deltaX, y: prev.y + deltaY };
            return clampImageTransform(newTransform, beforeImg.width, beforeImg.height, areaWidth, areaHeight);
          });
        }
        break;
      }
      case 'after-image': {
        const afterImg = imageCacheRef.current.after;
        if (afterImg) {
          // 드래그: 위치 이동
          setAfterTransform(prev => {
            const newTransform = { ...prev, x: prev.x + deltaX, y: prev.y + deltaY };
            return clampImageTransform(newTransform, afterImg.width, afterImg.height, areaWidth, areaHeight);
          });
        }
        break;
      }
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
      case 'slider-divider': {
        // 슬라이더 위치를 X 좌표 기반으로 직접 설정
        const newPosition = (coords.x / outputSize.width) * 100;
        setSliderPosition(Math.max(10, Math.min(90, newPosition)));
        break;
      }
    }

    setDragStart(coords);
  }, [isDragging, dragTarget, dragStart, getCanvasCoords, outputSize, layout, clampImageTransform, resizeHandle, resizeStartScale]);

  // 마우스 업 핸들러
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragTarget(null);
    setResizeHandle(null);
  }, []);

  // 휠 스크롤로 크기 조절 - 비활성화
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // 휠로 이미지 크기 변경 비활성화
    return;
  }, []);

  // 인물 윤곽선 추출 (ML 기반 인물 감지 + 외곽선만) - 최적화 버전
  const processOutlineSimple = useCallback(async (imageSrc: string, target?: 'before' | 'after'): Promise<string> => {
    // 이미지 로드 헬퍼
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.src = src;
      });
    };

    // 투명도 확인 헬퍼 (샘플링으로 속도 향상)
    const checkTransparency = (data: Uint8ClampedArray): boolean => {
      const step = Math.max(1, Math.floor(data.length / 10000)); // 최대 10000개 샘플
      for (let i = 0; i < data.length; i += step * 4) {
        if (data[i + 3] < 250) return true;
      }
      return false;
    };

    try {
      // 원본 이미지 로드
      const originalImg = await loadImage(imageSrc);
      const w = originalImg.width;
      const h = originalImg.height;

      // 원본 이미지 데이터
      const srcCanvas = document.createElement('canvas');
      const srcCtx = srcCanvas.getContext('2d')!;
      srcCanvas.width = w;
      srcCanvas.height = h;
      srcCtx.drawImage(originalImg, 0, 0);
      const srcData = srcCtx.getImageData(0, 0, w, h);
      const src = srcData.data;

      let maskData: Uint8ClampedArray;
      const hasTransparency = checkTransparency(src);

      if (!hasTransparency) {
        // 불투명 이미지: ML로 배경 제거하여 인물 마스크 추출 (small 모델로 속도 향상)
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        const resultBlob = await removeBackgroundML(blob, {
          model: 'isnet_quint8', // 속도 향상을 위해 경량 모델 사용
          output: { format: 'image/png', quality: 0.8 },
        });

        // ML 결과를 이미지로 로드
        const mlResultUrl = URL.createObjectURL(resultBlob);
        const mlImg = await loadImage(mlResultUrl);
        URL.revokeObjectURL(mlResultUrl);

        // ML 결과에서 알파 채널 추출 (마스크로 사용)
        const mlCanvas = document.createElement('canvas');
        const mlCtx = mlCanvas.getContext('2d')!;
        mlCanvas.width = w;
        mlCanvas.height = h;
        mlCtx.drawImage(mlImg, 0, 0, w, h);
        const mlData = mlCtx.getImageData(0, 0, w, h);
        maskData = mlData.data;

        // 마스크 캐시 저장 + 경계 캐시 초기화
        if (target === 'before') {
          setBeforeMaskData(mlData);
          outlineCacheRef.current.before = null;
        } else if (target === 'after') {
          setAfterMaskData(mlData);
          outlineCacheRef.current.after = null;
        }
      } else {
        // 이미 투명한 이미지: 알파 채널 그대로 사용
        maskData = src;
        // 마스크 캐시 저장 + 경계 캐시 초기화
        if (target === 'before') {
          setBeforeMaskData(srcData);
          outlineCacheRef.current.before = null;
        } else if (target === 'after') {
          setAfterMaskData(srcData);
          outlineCacheRef.current.after = null;
        }
      }

      // 전경 마스크 생성 (알파 채널 기반)
      const fgMask = new Uint8Array(w * h);
      for (let i = 0; i < maskData.length; i += 4) {
        fgMask[i / 4] = maskData[i + 3] > 128 ? 1 : 0;
      }

      // 가장 큰 연결된 전경 영역만 유지 (작은 잡음 제거)
      const componentLabels = new Int32Array(w * h);
      let currentLabel = 0;
      const componentSizes: Map<number, number> = new Map();

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          if (fgMask[idx] === 1 && componentLabels[idx] === 0) {
            currentLabel++;
            let size = 0;
            const stack = [idx];
            while (stack.length > 0) {
              const cIdx = stack.pop()!;
              if (componentLabels[cIdx] !== 0) continue;
              componentLabels[cIdx] = currentLabel;
              size++;
              const cx = cIdx % w;
              const cy = Math.floor(cIdx / w);
              if (cy > 0 && fgMask[cIdx - w] === 1 && componentLabels[cIdx - w] === 0) stack.push(cIdx - w);
              if (cy < h - 1 && fgMask[cIdx + w] === 1 && componentLabels[cIdx + w] === 0) stack.push(cIdx + w);
              if (cx > 0 && fgMask[cIdx - 1] === 1 && componentLabels[cIdx - 1] === 0) stack.push(cIdx - 1);
              if (cx < w - 1 && fgMask[cIdx + 1] === 1 && componentLabels[cIdx + 1] === 0) stack.push(cIdx + 1);
            }
            componentSizes.set(currentLabel, size);
          }
        }
      }

      // 가장 큰 컴포넌트 찾기
      let largestLabel = 0;
      let largestSize = 0;
      componentSizes.forEach((size, label) => {
        if (size > largestSize) {
          largestSize = size;
          largestLabel = label;
        }
      });

      // 가장 큰 컴포넌트만 전경으로 유지
      for (let i = 0; i < fgMask.length; i++) {
        if (fgMask[i] === 1 && componentLabels[i] !== largestLabel) {
          fgMask[i] = 0;
        }
      }

      // 외부 배경 마스크 생성 (플러드 필로 내부 구멍 무시)
      const outerBg = new Uint8Array(w * h);
      const queue: number[] = [];

      // 이미지 가장자리에서 시작 (전경이 아닌 곳만)
      for (let x = 0; x < w; x++) {
        if (fgMask[x] === 0 && outerBg[x] === 0) { queue.push(x); outerBg[x] = 1; }
        const bottom = (h - 1) * w + x;
        if (fgMask[bottom] === 0 && outerBg[bottom] === 0) { queue.push(bottom); outerBg[bottom] = 1; }
      }
      for (let y = 1; y < h - 1; y++) {
        const left = y * w;
        if (fgMask[left] === 0 && outerBg[left] === 0) { queue.push(left); outerBg[left] = 1; }
        const right = y * w + w - 1;
        if (fgMask[right] === 0 && outerBg[right] === 0) { queue.push(right); outerBg[right] = 1; }
      }

      // BFS 플러드 필 - 외부 배경만 마킹 (최적화: 배열 기반 큐)
      let qStart = 0;
      while (qStart < queue.length) {
        const idx = queue[qStart++];
        const x = idx % w;
        const y = Math.floor(idx / w);
        const neighbors = [
          y > 0 ? idx - w : -1, y < h - 1 ? idx + w : -1,
          x > 0 ? idx - 1 : -1, x < w - 1 ? idx + 1 : -1
        ];
        for (const nIdx of neighbors) {
          if (nIdx >= 0 && outerBg[nIdx] === 0 && fgMask[nIdx] === 0) {
            outerBg[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }

      // 윤곽선 색상 파싱
      const outlineColorMatch = outline.color.match(/^#([A-Fa-f0-9]{2})([A-Fa-f0-9]{2})([A-Fa-f0-9]{2})$/);
      const olR = outlineColorMatch ? parseInt(outlineColorMatch[1], 16) : 255;
      const olG = outlineColorMatch ? parseInt(outlineColorMatch[2], 16) : 255;
      const olB = outlineColorMatch ? parseInt(outlineColorMatch[3], 16) : 255;
      const thickness = target === 'before' ? outline.beforeThickness : outline.afterThickness;

      // 1단계: 경계 픽셀 찾기 (외부 배경이면서 전경과 바로 인접한 픽셀 - 바깥쪽 아웃라인)
      const boundaryPixels: number[] = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          // 외부 배경 픽셀이면서 전경과 인접한 경우
          if (outerBg[idx] === 1) {
            const hasFgNeighbor =
              (y > 0 && fgMask[idx - w] === 1) ||
              (y < h - 1 && fgMask[idx + w] === 1) ||
              (x > 0 && fgMask[idx - 1] === 1) ||
              (x < w - 1 && fgMask[idx + 1] === 1);
            if (hasFgNeighbor) {
              boundaryPixels.push(idx);
            }
          }
        }
      }

      // 2단계: 경계로부터의 거리 맵 생성 (바깥쪽으로 확장)
      const distMap = new Float32Array(w * h).fill(Infinity);
      const distQueue = [...boundaryPixels];
      for (const idx of boundaryPixels) {
        distMap[idx] = 0;
      }

      // BFS로 거리 계산 (thickness 범위 내, 외부 배경으로만 확장)
      let dqStart = 0;
      while (dqStart < distQueue.length) {
        const idx = distQueue[dqStart++];
        const currentDist = distMap[idx];
        if (currentDist >= thickness) continue;

        const x = idx % w;
        const y = Math.floor(idx / w);
        const neighbors = [
          y > 0 ? idx - w : -1,
          y < h - 1 ? idx + w : -1,
          x > 0 ? idx - 1 : -1,
          x < w - 1 ? idx + 1 : -1,
        ];
        for (const nIdx of neighbors) {
          // 외부 배경으로만 확장 (바깥쪽 아웃라인)
          if (nIdx >= 0 && outerBg[nIdx] === 1) {
            const newDist = currentDist + 1;
            if (newDist < distMap[nIdx] && newDist <= thickness) {
              distMap[nIdx] = newDist;
              distQueue.push(nIdx);
            }
          }
        }
      }

      // 결과 캔버스 (원본 이미지 위에 아웃라인 그리기)
      const outCanvas = document.createElement('canvas');
      const outCtx = outCanvas.getContext('2d')!;
      outCanvas.width = w;
      outCanvas.height = h;
      outCtx.drawImage(originalImg, 0, 0);

      const outData = outCtx.getImageData(0, 0, w, h);
      const out = outData.data;

      // 지워진 영역 가져오기
      const erased = target === 'before' ? erasedAreas.before : (target === 'after' ? erasedAreas.after : []);

      // 3단계: 아웃라인 그리기 (거리 맵 기반으로 빠르게 - 바깥쪽)
      for (let idx = 0; idx < w * h; idx++) {
        const dist = distMap[idx];
        // 외부 배경 픽셀에 아웃라인 그리기 (바깥쪽)
        if (dist <= thickness && outerBg[idx] === 1) {
          const x = idx % w;
          const y = Math.floor(idx / w);

          // 지워진 영역 체크
          let isErased = false;
          for (const area of erased) {
            const distToErased = Math.sqrt((x - area.x) ** 2 + (y - area.y) ** 2);
            if (distToErased <= area.size) {
              isErased = true;
              break;
            }
          }

          if (!isErased) {
            const pIdx = idx * 4;
            if (outline.style === 'glow') {
              const alpha = Math.round(255 * (1 - dist / thickness) * 0.8);
              if (alpha > 0) {
                const blend = alpha / 255;
                out[pIdx] = Math.round(out[pIdx] * (1 - blend) + olR * blend);
                out[pIdx + 1] = Math.round(out[pIdx + 1] * (1 - blend) + olG * blend);
                out[pIdx + 2] = Math.round(out[pIdx + 2] * (1 - blend) + olB * blend);
              }
            } else if (outline.style === 'gradient') {
              const alpha = Math.round(255 * (1 - dist / (thickness + 1)));
              if (alpha > 50) {
                const blend = alpha / 255;
                out[pIdx] = Math.round(out[pIdx] * (1 - blend) + olR * blend);
                out[pIdx + 1] = Math.round(out[pIdx + 1] * (1 - blend) + olG * blend);
                out[pIdx + 2] = Math.round(out[pIdx + 2] * (1 - blend) + olB * blend);
              }
            } else {
              // solid 스타일
              out[pIdx] = olR;
              out[pIdx + 1] = olG;
              out[pIdx + 2] = olB;
            }
          }
        }
      }

      outCtx.putImageData(outData, 0, 0);
      return outCanvas.toDataURL('image/png');
    } catch (error) {
      console.error('아웃라인 처리 실패:', error);
      return imageSrc; // 실패 시 원본 반환
    }
  }, [outline.color, outline.beforeThickness, outline.afterThickness, outline.style, erasedAreas]);

  // AI 아웃라인 처리 (미사용 - 향후 AI 세그멘테이션 지원용)
  const processOutlineAI = useCallback(async (imageSrc: string, target: 'before' | 'after' = 'before'): Promise<string> => {
    const thickness = target === 'before' ? outline.beforeThickness : outline.afterThickness;
    try {
      const response = await fetch('/api/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageSrc,
          outlineColor: outline.color,
          outlineThickness: thickness,
        }),
      });
      if (!response.ok) throw new Error('세그멘테이션 실패');
      const data = await response.json();
      if (data.useClientSide) return processOutlineSimple(imageSrc, target);
      return data.processedImage;
    } catch {
      return processOutlineSimple(imageSrc, target);
    }
  }, [outline.color, outline.beforeThickness, outline.afterThickness, processOutlineSimple]);

  // 아웃라인 적용
  const applyOutline = useCallback(async () => {
    if (!beforeImage && !afterImage) {
      toast.error('이미지를 먼저 업로드해주세요');
      return;
    }

    saveToHistory(); // 히스토리 저장

    setIsProcessingOutline(true);
    toast.info('아웃라인을 생성하고 있습니다...');
    try {
      const [processedBefore, processedAfter] = await Promise.all([
        beforeImage ? processOutlineSimple(beforeImage, 'before') : Promise.resolve(null),
        afterImage ? processOutlineSimple(afterImage, 'after') : Promise.resolve(null),
      ]);
      setProcessedBeforeImage(processedBefore);
      setProcessedAfterImage(processedAfter);
      toast.success('아웃라인이 적용되었습니다');
    } catch {
      toast.error('아웃라인 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessingOutline(false);
    }
  }, [beforeImage, afterImage, processOutlineSimple, saveToHistory]);

  // 경계 데이터 계산 및 캐싱 (무거운 연산을 한 번만 수행)
  const computeBoundaryCache = useCallback((
    maskData: ImageData,
    target: 'before' | 'after'
  ): { outerBg: Uint8Array; fgMask: Uint8Array; w: number; h: number; boundaryPixels: number[]; componentLabels: Int32Array } => {
    const cached = outlineCacheRef.current[target];
    if (cached && cached.w === maskData.width && cached.h === maskData.height) {
      return cached;
    }

    const w = maskData.width;
    const h = maskData.height;
    const mask = maskData.data;

    // 전경 마스크 생성
    const fgMask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i += 4) {
      fgMask[i / 4] = mask[i + 3] > 128 ? 1 : 0;
    }

    // 가장 큰 연결된 전경 영역만 유지
    const componentLabels = new Int32Array(w * h);
    let currentLabel = 0;
    const componentSizes: Map<number, number> = new Map();

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (fgMask[idx] === 1 && componentLabels[idx] === 0) {
          currentLabel++;
          let size = 0;
          const stack = [idx];
          while (stack.length > 0) {
            const cIdx = stack.pop()!;
            if (componentLabels[cIdx] !== 0) continue;
            componentLabels[cIdx] = currentLabel;
            size++;
            const cx = cIdx % w;
            const cy = Math.floor(cIdx / w);
            if (cy > 0 && fgMask[cIdx - w] === 1 && componentLabels[cIdx - w] === 0) stack.push(cIdx - w);
            if (cy < h - 1 && fgMask[cIdx + w] === 1 && componentLabels[cIdx + w] === 0) stack.push(cIdx + w);
            if (cx > 0 && fgMask[cIdx - 1] === 1 && componentLabels[cIdx - 1] === 0) stack.push(cIdx - 1);
            if (cx < w - 1 && fgMask[cIdx + 1] === 1 && componentLabels[cIdx + 1] === 0) stack.push(cIdx + 1);
          }
          componentSizes.set(currentLabel, size);
        }
      }
    }

    let largestLabel = 0;
    let largestSize = 0;
    componentSizes.forEach((size, label) => {
      if (size > largestSize) {
        largestSize = size;
        largestLabel = label;
      }
    });

    for (let i = 0; i < fgMask.length; i++) {
      if (fgMask[i] === 1 && componentLabels[i] !== largestLabel) {
        fgMask[i] = 0;
      }
    }

    // 외부 배경 마스크 (플러드 필)
    const outerBg = new Uint8Array(w * h);
    const queue: number[] = [];
    for (let x = 0; x < w; x++) {
      if (fgMask[x] === 0 && outerBg[x] === 0) { queue.push(x); outerBg[x] = 1; }
      const bottom = (h - 1) * w + x;
      if (fgMask[bottom] === 0 && outerBg[bottom] === 0) { queue.push(bottom); outerBg[bottom] = 1; }
    }
    for (let y = 1; y < h - 1; y++) {
      const left = y * w;
      if (fgMask[left] === 0 && outerBg[left] === 0) { queue.push(left); outerBg[left] = 1; }
      const right = y * w + w - 1;
      if (fgMask[right] === 0 && outerBg[right] === 0) { queue.push(right); outerBg[right] = 1; }
    }
    let qStart = 0;
    while (qStart < queue.length) {
      const idx = queue[qStart++];
      const x = idx % w;
      const y = Math.floor(idx / w);
      const neighbors = [
        y > 0 ? idx - w : -1, y < h - 1 ? idx + w : -1,
        x > 0 ? idx - 1 : -1, x < w - 1 ? idx + 1 : -1
      ];
      for (const nIdx of neighbors) {
        if (nIdx >= 0 && outerBg[nIdx] === 0 && fgMask[nIdx] === 0) {
          outerBg[nIdx] = 1;
          queue.push(nIdx);
        }
      }
    }

    // 경계 픽셀 찾기
    const boundaryPixels: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (outerBg[idx] === 1) {
          const hasFgNeighbor =
            (y > 0 && fgMask[idx - w] === 1) ||
            (y < h - 1 && fgMask[idx + w] === 1) ||
            (x > 0 && fgMask[idx - 1] === 1) ||
            (x < w - 1 && fgMask[idx + 1] === 1);
          if (hasFgNeighbor) {
            boundaryPixels.push(idx);
          }
        }
      }
    }

    const result = { outerBg, fgMask, w, h, boundaryPixels, componentLabels };
    outlineCacheRef.current[target] = result;
    return result;
  }, []);

  // 캐시된 마스크로 빠른 아웃라인 재적용 (실시간 미리보기용) - 최적화 버전
  const reapplyOutlineFromCache = useCallback(async (targets?: { before?: boolean; after?: boolean }) => {
    const updateBefore = targets?.before ?? true;
    const updateAfter = targets?.after ?? true;

    // 최신 값 사용 (ref를 통해 stale closure 문제 해결)
    const currentBeforeMask = beforeMaskDataRef.current;
    const currentAfterMask = afterMaskDataRef.current;
    const currentBeforeImage = beforeImageRef.current;
    const currentAfterImage = afterImageRef.current;
    const currentErasedAreas = erasedAreasRef.current;
    const currentOutline = outlineRef.current;
    const currentExcludedRegions = excludedRegionsRef.current;

    if (!currentBeforeMask && !currentAfterMask) return;
    if (!currentBeforeImage && !currentAfterImage) return;

    // 아웃라인 색상 파싱 (공통)
    const colorMatch = currentOutline.color.match(/^#([A-Fa-f0-9]{2})([A-Fa-f0-9]{2})([A-Fa-f0-9]{2})$/);
    const olR = colorMatch ? parseInt(colorMatch[1], 16) : 255;
    const olG = colorMatch ? parseInt(colorMatch[2], 16) : 255;
    const olB = colorMatch ? parseInt(colorMatch[3], 16) : 255;
    const currentStyle = currentOutline.style;

    // 빠른 아웃라인 렌더링 (캐시된 경계 데이터 사용)
    const renderOutlinefast = (
      originalSrc: string,
      cache: { outerBg: Uint8Array; fgMask: Uint8Array; w: number; h: number; boundaryPixels: number[]; componentLabels: Int32Array },
      erased: Array<{x: number, y: number, size: number}>,
      excludedPixels: Set<number>,
      thickness: number
    ): Promise<string> => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const { outerBg, w, h, boundaryPixels } = cache;

          // 거리 맵 생성 (thickness에 따라 변화 - 매번 계산 필요)
          const distMap = new Float32Array(w * h).fill(Infinity);
          const distQueue = [...boundaryPixels];
          for (const idx of boundaryPixels) {
            distMap[idx] = 0;
          }

          let dqStart = 0;
          while (dqStart < distQueue.length) {
            const idx = distQueue[dqStart++];
            const currentDist = distMap[idx];
            if (currentDist >= thickness) continue;

            const x = idx % w;
            const y = Math.floor(idx / w);
            const neighbors = [
              y > 0 ? idx - w : -1, y < h - 1 ? idx + w : -1,
              x > 0 ? idx - 1 : -1, x < w - 1 ? idx + 1 : -1
            ];
            for (const nIdx of neighbors) {
              if (nIdx >= 0 && outerBg[nIdx] === 1) {
                const newDist = currentDist + 1;
                if (newDist < distMap[nIdx] && newDist <= thickness) {
                  distMap[nIdx] = newDist;
                  distQueue.push(nIdx);
                }
              }
            }
          }

          const outCanvas = document.createElement('canvas');
          const outCtx = outCanvas.getContext('2d')!;
          outCanvas.width = w;
          outCanvas.height = h;
          outCtx.drawImage(img, 0, 0);
          const outData = outCtx.getImageData(0, 0, w, h);
          const out = outData.data;

          // 아웃라인 그리기
          for (let idx = 0; idx < w * h; idx++) {
            const dist = distMap[idx];
            if (dist <= thickness && outerBg[idx] === 1) {
              // 제외된 픽셀 확인
              if (excludedPixels.has(idx)) continue;

              const x = idx % w;
              const y = Math.floor(idx / w);

              let isErased = false;
              for (const area of erased) {
                const distToErased = Math.sqrt((x - area.x) ** 2 + (y - area.y) ** 2);
                if (distToErased <= area.size) {
                  isErased = true;
                  break;
                }
              }

              if (!isErased) {
                const pIdx = idx * 4;
                if (currentStyle === 'glow') {
                  const alpha = Math.round(255 * (1 - dist / thickness) * 0.8);
                  if (alpha > 0) {
                    const blend = alpha / 255;
                    out[pIdx] = Math.round(out[pIdx] * (1 - blend) + olR * blend);
                    out[pIdx + 1] = Math.round(out[pIdx + 1] * (1 - blend) + olG * blend);
                    out[pIdx + 2] = Math.round(out[pIdx + 2] * (1 - blend) + olB * blend);
                  }
                } else if (currentStyle === 'gradient') {
                  const alpha = Math.round(255 * (1 - dist / (thickness + 1)));
                  if (alpha > 50) {
                    const blend = alpha / 255;
                    out[pIdx] = Math.round(out[pIdx] * (1 - blend) + olR * blend);
                    out[pIdx + 1] = Math.round(out[pIdx + 1] * (1 - blend) + olG * blend);
                    out[pIdx + 2] = Math.round(out[pIdx + 2] * (1 - blend) + olB * blend);
                  }
                } else {
                  out[pIdx] = olR;
                  out[pIdx + 1] = olG;
                  out[pIdx + 2] = olB;
                }
              }
            }
          }
          outCtx.putImageData(outData, 0, 0);
          resolve(outCanvas.toDataURL('image/png'));
        };
        img.src = originalSrc;
      });
    };

    try {
      // 필요한 이미지만 업데이트
      const promises: Promise<void>[] = [];

      if (updateBefore && currentBeforeImage && currentBeforeMask) {
        const cache = computeBoundaryCache(currentBeforeMask, 'before');
        promises.push(
          renderOutlinefast(currentBeforeImage, cache, currentErasedAreas.before, currentExcludedRegions.before, currentOutline.beforeThickness)
            .then(result => setProcessedBeforeImage(result))
        );
      }

      if (updateAfter && currentAfterImage && currentAfterMask) {
        const cache = computeBoundaryCache(currentAfterMask, 'after');
        promises.push(
          renderOutlinefast(currentAfterImage, cache, currentErasedAreas.after, currentExcludedRegions.after, currentOutline.afterThickness)
            .then(result => setProcessedAfterImage(result))
        );
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('아웃라인 재적용 오류:', error);
    }
  }, [computeBoundaryCache]);

  // 디바운스된 아웃라인 재적용 (슬라이더 드래그 시 성능 최적화)
  const debouncedReapplyOutline = useCallback((targets?: { before?: boolean; after?: boolean }) => {
    // 대기 중인 업데이트 누적
    if (targets?.before) pendingUpdateRef.current.before = true;
    if (targets?.after) pendingUpdateRef.current.after = true;
    if (!targets) {
      pendingUpdateRef.current.before = true;
      pendingUpdateRef.current.after = true;
    }

    // 기존 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 50ms 디바운스 (빠른 반응을 위해 짧게 설정)
    debounceTimerRef.current = setTimeout(() => {
      const toUpdate = { ...pendingUpdateRef.current };
      pendingUpdateRef.current = { before: false, after: false };
      reapplyOutlineFromCache(toUpdate);
    }, 50);
  }, [reapplyOutlineFromCache]);

  // 지우개로 지운 영역 초기화
  const clearErasedAreas = useCallback(() => {
    setErasedAreas({ before: [], after: [] });
    // 마스크가 있으면 재적용 트리거
    setNeedsOutlineReapply(true);
  }, []);

  // 제외된 영역 초기화
  const clearExcludedRegions = useCallback(() => {
    setExcludedRegions({ before: new Set(), after: new Set() });
    // 마스크가 있으면 재적용 트리거
    setNeedsOutlineReapply(true);
  }, []);

  // 지우개 클릭 후 아웃라인 재적용 트리거
  useEffect(() => {
    if (needsOutlineReapply && (beforeMaskData || afterMaskData)) {
      const timer = setTimeout(() => {
        reapplyOutlineFromCache();
        setNeedsOutlineReapply(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [needsOutlineReapply, beforeMaskData, afterMaskData, reapplyOutlineFromCache]);

  // 배경 제거 함수 (ML 기반 누끼 생성)
  const removeBackground = useCallback(async (imageSrc: string): Promise<string> => {
    try {
      // Base64를 Blob으로 변환
      const response = await fetch(imageSrc);
      const blob = await response.blob();

      // ML 모델로 배경 제거 (첫 실행 시 모델 다운로드로 시간이 걸릴 수 있음)
      const resultBlob = await removeBackgroundML(blob, {
        model: 'isnet', // 'isnet' | 'isnet_fp16' | 'isnet_quint8'
        output: {
          format: 'image/png',
          quality: 1,
        },
      });

      // Blob을 Base64로 변환
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(resultBlob);
      });
    } catch (error) {
      console.error('배경 제거 실패:', error);
      throw error;
    }
  }, []);

  // 배경 제거 적용
  const applyRemoveBackground = useCallback(async (target: 'before' | 'after' | 'both') => {
    const targetBefore = target === 'before' || target === 'both';
    const targetAfter = target === 'after' || target === 'both';

    if (targetBefore && !beforeImage) {
      toast.error('Before 이미지를 먼저 업로드해주세요');
      return;
    }
    if (targetAfter && !afterImage) {
      toast.error('After 이미지를 먼저 업로드해주세요');
      return;
    }

    saveToHistory();
    setIsRemovingBg(true);
    toast.info('AI로 배경을 제거하고 있습니다... (첫 실행 시 모델 로딩으로 시간이 걸릴 수 있습니다)');

    try {
      if (targetBefore && beforeImage) {
        const result = await removeBackground(beforeImage);
        setBeforeImage(result);
        setProcessedBeforeImage(null);
        imageCacheRef.current.before = null;
      }
      if (targetAfter && afterImage) {
        const result = await removeBackground(afterImage);
        setAfterImage(result);
        setProcessedAfterImage(null);
        imageCacheRef.current.after = null;
      }
      toast.success('배경이 제거되었습니다');
    } catch {
      toast.error('배경 제거 중 오류가 발생했습니다');
    } finally {
      setIsRemovingBg(false);
    }
  }, [beforeImage, afterImage, removeBackground, saveToHistory]);

  // 이미지를 영역에 맞게 contain으로 그리기 (이미지 전체가 보이도록)
  // showOverflow: true면 프레임 밖 이미지도 반투명하게 표시
  const drawImageCover = useCallback((
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    transform: ImageTransform,
    showOverflow: boolean = false
  ) => {
    const imgRatio = img.width / img.height;
    const targetRatio = w / h;

    let baseW: number, baseH: number;

    // contain 방식: 이미지 전체가 보이도록 (여백이 생길 수 있음)
    if (imgRatio > targetRatio) {
      // 이미지가 더 넓음 - 너비 기준으로 맞춤
      baseW = w;
      baseH = w / imgRatio;
    } else {
      // 이미지가 더 높음 - 높이 기준으로 맞춤
      baseH = h;
      baseW = h * imgRatio;
    }

    // 스케일 적용 (0.5 ~ 3.0 범위)
    const effectiveScale = Math.max(0.5, Math.min(3, transform.scale));
    const drawW = baseW * effectiveScale;
    const drawH = baseH * effectiveScale;

    // 중앙 정렬 + 오프셋
    const centerX = x + w / 2 + transform.x;
    const centerY = y + h / 2 + transform.y;

    // showOverflow일 때 프레임 밖 전체 이미지를 먼저 반투명하게 표시 (클리핑 없이)
    if (showOverflow) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.translate(centerX, centerY);
      ctx.rotate((transform.rotation || 0) * Math.PI / 180);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }

    // 프레임 영역 클리핑하여 내부만 불투명하게 표시
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    // 이미지 그리기 (프레임 내부) - 회전 적용
    ctx.translate(centerX, centerY);
    ctx.rotate((transform.rotation || 0) * Math.PI / 180);
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, []);

  // 미리보기 렌더링 (더블 버퍼링)
  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const bufferCanvas = bufferCanvasRef.current;
    if (!canvas || !bufferCanvas) return;

    const { width: frameWidth, height: frameHeight } = outputSize;

    // 프레임을 70% 크기로 표시하고 주변에 여백 추가
    const frameScale = 0.7;
    const canvasWidth = Math.round(frameWidth / frameScale);
    const canvasHeight = Math.round(frameHeight / frameScale);
    const frameX = Math.round((canvasWidth - frameWidth) / 2);
    const frameY = Math.round((canvasHeight - frameHeight) / 2);

    // 버퍼 캔버스 크기 설정 (프레임보다 큰 캔버스)
    bufferCanvas.width = canvasWidth;
    bufferCanvas.height = canvasHeight;
    const ctx = bufferCanvas.getContext('2d')!;

    // 전체 캔버스 배경 (어두운 회색 - 프레임 바깥 영역)
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 프레임 영역 배경 (실제 출력 영역)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(frameX, frameY, frameWidth, frameHeight);

    // 프레임 테두리 표시
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);
    ctx.setLineDash([]);

    const newClickableAreas: ClickableArea[] = [];

    // 프레임 오프셋을 적용한 실제 좌표 계산 (레이아웃용)
    const width = frameWidth;
    const height = frameHeight;

    const beforeImg = imageCacheRef.current.before;
    const afterImg = imageCacheRef.current.after;
    const watermarkImg = imageCacheRef.current.watermark;

    // 실제 이미지 경계 계산 함수
    const getImageBounds = (img: HTMLImageElement, areaX: number, areaY: number, areaW: number, areaH: number, transform: ImageTransform) => {
      const imgRatio = img.width / img.height;
      const targetRatio = areaW / areaH;

      let baseW: number, baseH: number;
      if (imgRatio > targetRatio) {
        baseW = areaW;
        baseH = areaW / imgRatio;
      } else {
        baseH = areaH;
        baseW = areaH * imgRatio;
      }

      const effectiveScale = Math.max(0.5, Math.min(3, transform.scale));
      const drawW = baseW * effectiveScale;
      const drawH = baseH * effectiveScale;
      const drawX = areaX + (areaW - drawW) / 2 + transform.x;
      const drawY = areaY + (areaH - drawH) / 2 + transform.y;

      return { x: drawX, y: drawY, width: drawW, height: drawH };
    };

    // 리사이즈 핸들 그리기 함수 (8개 리사이즈 + 회전 핸들) - 프레임 밖에서도 표시
    const drawImageResizeHandles = (img: HTMLImageElement, areaX: number, areaY: number, areaW: number, areaH: number, transform: ImageTransform, target: 'before' | 'after') => {
      const bounds = getImageBounds(img, areaX, areaY, areaW, areaH, transform);
      const handleSize = 10;
      const edgeHandleSize = 8;
      const rotateHandleDistance = 30;

      // 이미지 중심점
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const rotation = (transform.rotation || 0) * Math.PI / 180;

      // 회전된 좌표 계산 함수
      const rotatePoint = (px: number, py: number) => {
        const dx = px - centerX;
        const dy = py - centerY;
        return {
          x: centerX + dx * Math.cos(rotation) - dy * Math.sin(rotation),
          y: centerY + dx * Math.sin(rotation) + dy * Math.cos(rotation)
        };
      };

      // 클리핑 없이 전체 캔버스에 핸들 표시 (프레임 밖에서도 보이도록)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);

      // 이미지 테두리 (파란색 실선)
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height);

      // 8개 핸들 위치 (회전 전 로컬 좌표)
      const handles: { pos: HandlePosition; lx: number; ly: number; isCorner: boolean }[] = [
        // 4 corners
        { pos: 'tl', lx: -bounds.width / 2, ly: -bounds.height / 2, isCorner: true },
        { pos: 'tr', lx: bounds.width / 2, ly: -bounds.height / 2, isCorner: true },
        { pos: 'bl', lx: -bounds.width / 2, ly: bounds.height / 2, isCorner: true },
        { pos: 'br', lx: bounds.width / 2, ly: bounds.height / 2, isCorner: true },
        // 4 edges
        { pos: 't', lx: 0, ly: -bounds.height / 2, isCorner: false },
        { pos: 'r', lx: bounds.width / 2, ly: 0, isCorner: false },
        { pos: 'b', lx: 0, ly: bounds.height / 2, isCorner: false },
        { pos: 'l', lx: -bounds.width / 2, ly: 0, isCorner: false },
      ];

      // 핸들 그리기
      handles.forEach(handle => {
        const size = handle.isCorner ? handleSize : edgeHandleSize;
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(handle.lx - size / 2, handle.ly - size / 2, size, size);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(handle.lx - size / 2 + 2, handle.ly - size / 2 + 2, size - 4, size - 4);
      });

      // 회전 핸들 (상단 중앙 위에)
      const rotateHandleY = -bounds.height / 2 - rotateHandleDistance;

      // 회전 핸들 연결선
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -bounds.height / 2);
      ctx.lineTo(0, rotateHandleY);
      ctx.stroke();

      // 회전 핸들 원
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(0, rotateHandleY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, rotateHandleY, 5, 0, Math.PI * 2);
      ctx.fill();

      // 회전 아이콘 (화살표)
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, rotateHandleY, 4, -Math.PI * 0.7, Math.PI * 0.2);
      ctx.stroke();

      ctx.restore();

      // 클릭 영역 추가 (회전된 좌표)
      handles.forEach(handle => {
        const size = handle.isCorner ? handleSize : edgeHandleSize;
        const rotated = rotatePoint(centerX + handle.lx, centerY + handle.ly);
        newClickableAreas.push({
          type: 'resize-handle',
          x: rotated.x - size / 2 - 5,
          y: rotated.y - size / 2 - 5,
          width: size + 10,
          height: size + 10,
          handlePosition: handle.pos,
          targetImage: target,
        });
      });

      // 회전 핸들 클릭 영역
      const rotateHandleWorld = rotatePoint(centerX, centerY - bounds.height / 2 - rotateHandleDistance);
      newClickableAreas.push({
        type: 'resize-handle',
        x: rotateHandleWorld.x - 12,
        y: rotateHandleWorld.y - 12,
        width: 24,
        height: 24,
        handlePosition: 'rotate',
        targetImage: target,
      });
    };

    // 레이아웃에 따른 그리기 (frameX, frameY 오프셋 적용)
    switch (layout) {
      case 'horizontal': {
        const halfWidth = width / 2;
        if (beforeImg) {
          drawImageCover(ctx, beforeImg, frameX, frameY, halfWidth, height, beforeTransform, selectedImage === 'before');
          newClickableAreas.push({ type: 'before-image', x: frameX, y: frameY, width: halfWidth, height });
        }
        if (afterImg) {
          drawImageCover(ctx, afterImg, frameX + halfWidth, frameY, halfWidth, height, afterTransform, selectedImage === 'after');
          newClickableAreas.push({ type: 'after-image', x: frameX + halfWidth, y: frameY, width: halfWidth, height });
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(frameX + halfWidth, frameY);
        ctx.lineTo(frameX + halfWidth, frameY + height);
        ctx.stroke();

        // 선택된 이미지에만 리사이즈 핸들 표시
        if (selectedImage === 'before' && beforeImg) {
          drawImageResizeHandles(beforeImg, frameX, frameY, halfWidth, height, beforeTransform, 'before');
        }
        if (selectedImage === 'after' && afterImg) {
          drawImageResizeHandles(afterImg, frameX + halfWidth, frameY, halfWidth, height, afterTransform, 'after');
        }
        break;
      }
      case 'vertical': {
        const halfHeight = height / 2;
        if (beforeImg) {
          drawImageCover(ctx, beforeImg, frameX, frameY, width, halfHeight, beforeTransform, selectedImage === 'before');
          newClickableAreas.push({ type: 'before-image', x: frameX, y: frameY, width, height: halfHeight });
        }
        if (afterImg) {
          drawImageCover(ctx, afterImg, frameX, frameY + halfHeight, width, halfHeight, afterTransform, selectedImage === 'after');
          newClickableAreas.push({ type: 'after-image', x: frameX, y: frameY + halfHeight, width, height: halfHeight });
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(frameX, frameY + halfHeight);
        ctx.lineTo(frameX + width, frameY + halfHeight);
        ctx.stroke();

        // 선택된 이미지에만 리사이즈 핸들 표시
        if (selectedImage === 'before' && beforeImg) {
          drawImageResizeHandles(beforeImg, frameX, frameY, width, halfHeight, beforeTransform, 'before');
        }
        if (selectedImage === 'after' && afterImg) {
          drawImageResizeHandles(afterImg, frameX, frameY + halfHeight, width, halfHeight, afterTransform, 'after');
        }
        break;
      }
      case 'slider': {
        const dividerX = (sliderPosition / 100) * width;
        if (afterImg) {
          drawImageCover(ctx, afterImg, frameX, frameY, width, height, afterTransform, selectedImage === 'after');
        }
        if (beforeImg) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(frameX, frameY, dividerX, height);
          ctx.clip();
          drawImageCover(ctx, beforeImg, frameX, frameY, width, height, beforeTransform, selectedImage === 'before');
          ctx.restore();
        }
        // 이미지 클릭 영역 (슬라이더 핸들 영역 제외)
        newClickableAreas.push({ type: 'before-image', x: frameX, y: frameY, width: dividerX - 30, height });
        newClickableAreas.push({ type: 'after-image', x: frameX + dividerX + 30, y: frameY, width: width - dividerX - 30, height });

        // 슬라이더 라인 그리기
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(frameX + dividerX, frameY);
        ctx.lineTo(frameX + dividerX, frameY + height);
        ctx.stroke();

        // 슬라이더 핸들 (원형)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(frameX + dividerX, frameY + height / 2, 24, 0, Math.PI * 2);
        ctx.fill();

        // 드래그 중일 때 하이라이트
        if (dragTarget === 'slider-divider') {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        ctx.fillStyle = '#333333';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◀▶', frameX + dividerX, frameY + height / 2);

        // 슬라이더 핸들 클릭 영역 (이미지보다 위에 추가)
        newClickableAreas.push({ type: 'slider-divider', x: frameX + dividerX - 30, y: frameY, width: 60, height });

        // 선택된 이미지에만 리사이즈 핸들 표시
        if (selectedImage === 'before' && beforeImg) {
          drawImageResizeHandles(beforeImg, frameX, frameY, width, height, beforeTransform, 'before');
        }
        if (selectedImage === 'after' && afterImg) {
          drawImageResizeHandles(afterImg, frameX, frameY, width, height, afterTransform, 'after');
        }
        break;
      }
      case 'diagonal': {
        if (afterImg) {
          drawImageCover(ctx, afterImg, frameX, frameY, width, height, afterTransform, selectedImage === 'after');
        }
        if (beforeImg) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(frameX, frameY);
          ctx.lineTo(frameX + width, frameY);
          ctx.lineTo(frameX, frameY + height);
          ctx.closePath();
          ctx.clip();
          drawImageCover(ctx, beforeImg, frameX, frameY, width, height, beforeTransform, selectedImage === 'before');
          ctx.restore();
        }
        newClickableAreas.push({ type: 'before-image', x: frameX, y: frameY, width: width / 2, height: height / 2 });
        newClickableAreas.push({ type: 'after-image', x: frameX + width / 2, y: frameY + height / 2, width: width / 2, height: height / 2 });

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(frameX + width, frameY);
        ctx.lineTo(frameX, frameY + height);
        ctx.stroke();

        // 선택된 이미지에만 리사이즈 핸들 표시
        if (selectedImage === 'before' && beforeImg) {
          drawImageResizeHandles(beforeImg, frameX, frameY, width, height, beforeTransform, 'before');
        }
        if (selectedImage === 'after' && afterImg) {
          drawImageResizeHandles(afterImg, frameX, frameY, width, height, afterTransform, 'after');
        }
        break;
      }
      case 'circle': {
        if (afterImg) {
          drawImageCover(ctx, afterImg, frameX, frameY, width, height, afterTransform, selectedImage === 'after');
        }
        if (beforeImg) {
          ctx.save();
          ctx.beginPath();
          const radius = Math.min(width, height) * 0.35;
          ctx.arc(frameX + width / 2, frameY + height / 2, radius, 0, Math.PI * 2);
          ctx.clip();
          drawImageCover(ctx, beforeImg, frameX, frameY, width, height, beforeTransform, selectedImage === 'before');
          ctx.restore();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(frameX + width / 2, frameY + height / 2, radius, 0, Math.PI * 2);
          ctx.stroke();

          const circleRadius = Math.min(width, height) * 0.35;
          newClickableAreas.push({
            type: 'before-image',
            x: frameX + width / 2 - circleRadius,
            y: frameY + height / 2 - circleRadius,
            width: circleRadius * 2,
            height: circleRadius * 2
          });
        }
        newClickableAreas.push({ type: 'after-image', x: frameX, y: frameY, width, height });

        // 선택된 이미지에만 리사이즈 핸들 표시
        if (selectedImage === 'before' && beforeImg) {
          drawImageResizeHandles(beforeImg, frameX, frameY, width, height, beforeTransform, 'before');
        }
        if (selectedImage === 'after' && afterImg) {
          drawImageResizeHandles(afterImg, frameX, frameY, width, height, afterTransform, 'after');
        }
        break;
      }
    }

    // 라벨 그리기 (frameX, frameY 오프셋 적용)
    if (labels.showLabels) {
      ctx.font = `bold ${labels.fontSize}px "Pretendard", "Noto Sans KR", sans-serif`;

      const drawLabel = (text: string, position: LabelPosition, type: ClickableArea['type']) => {
        const metrics = ctx.measureText(text);
        const padding = 12;
        const labelHeight = labels.fontSize + padding * 2;
        const labelWidth = metrics.width + padding * 2;

        const labelX = frameX + position.x - labelWidth / 2;
        const labelY = frameY + position.y - labelHeight / 2;

        ctx.fillStyle = labels.backgroundColor;
        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 6);
        ctx.fill();

        if (dragTarget === type) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.fillStyle = labels.fontColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, frameX + position.x, frameY + position.y);

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

        const labelX = frameX + labels.customPosition.x - labelWidth / 2;
        const labelY = frameY + labels.customPosition.y - labelHeight / 2;

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
        ctx.fillText(labels.customText, frameX + labels.customPosition.x, frameY + labels.customPosition.y);

        newClickableAreas.push({ type: 'custom-label', x: labelX, y: labelY, width: labelWidth, height: labelHeight });
      }

      if (labels.showDate) {
        const dateText = new Date().toLocaleDateString('ko-KR');
        ctx.font = `${labels.fontSize * 0.6}px "Pretendard", "Noto Sans KR", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.textAlign = 'right';
        ctx.fillText(dateText, frameX + width - 20, frameY + height - 20);
      }
    }

    // 워터마크 그리기 (frameX, frameY 오프셋 적용)
    if (watermark.enabled && watermarkImg) {
      const wmSize = watermark.size;
      const aspect = watermarkImg.width / watermarkImg.height;
      const wmWidth = wmSize;
      const wmHeight = wmSize / aspect;

      const wmX = frameX + watermark.x;
      const wmY = frameY + watermark.y;

      ctx.globalAlpha = watermark.opacity / 100;
      ctx.drawImage(watermarkImg, wmX, wmY, wmWidth, wmHeight);
      ctx.globalAlpha = 1;

      if (dragTarget === 'watermark') {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(wmX, wmY, wmWidth, wmHeight);
        ctx.setLineDash([]);
      }

      newClickableAreas.push({ type: 'watermark', x: wmX, y: wmY, width: wmWidth, height: wmHeight });
    }

    // 드래그 중인 이미지 영역 하이라이트 (frameX, frameY 오프셋 적용)
    if (dragTarget === 'before-image' || dragTarget === 'after-image') {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 10]);

      if (layout === 'horizontal') {
        const x = dragTarget === 'before-image' ? frameX : frameX + width / 2;
        ctx.strokeRect(x + 2, frameY + 2, width / 2 - 4, height - 4);
      } else if (layout === 'vertical') {
        const y = dragTarget === 'before-image' ? frameY : frameY + height / 2;
        ctx.strokeRect(frameX + 2, y + 2, width - 4, height / 2 - 4);
      } else {
        ctx.strokeRect(frameX + 2, frameY + 2, width - 4, height - 4);
      }
      ctx.setLineDash([]);
    }

    // 버퍼 캔버스에서 메인 캔버스로 복사 (전체 캔버스 - 프레임 + 여백)
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const mainCtx = canvas.getContext('2d')!;
    mainCtx.drawImage(bufferCanvas, 0, 0);

    setClickableAreas(newClickableAreas);
  }, [beforeTransform, afterTransform, layout, sliderPosition, labels, watermark, outputSize, dragTarget, drawImageCover, imagesLoaded, selectedImage, processedBeforeImage, processedAfterImage, outline.enabled]);

  // 미리보기 업데이트 (requestAnimationFrame 사용)
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(renderPreview);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderPreview]);

  // 이미지 다운로드 (프레임 영역만 추출)
  const downloadImage = useCallback(async (format: 'png' | 'jpg') => {
    setDragTarget(null);
    setSelectedImage(null); // 리사이즈 핸들 숨기기

    // 대기 중인 디바운스 타이머 취소하고 즉시 적용
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // 대기 중인 업데이트가 있으면 즉시 적용
    const pendingBefore = pendingUpdateRef.current.before;
    const pendingAfter = pendingUpdateRef.current.after;
    if ((pendingBefore || pendingAfter) && (beforeMaskData || afterMaskData)) {
      pendingUpdateRef.current = { before: false, after: false };
      await reapplyOutlineFromCache({ before: pendingBefore, after: pendingAfter });
    }

    // 렌더링 완료 대기
    await new Promise(resolve => setTimeout(resolve, 150));

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);

    setTimeout(() => {
      const { width: frameWidth, height: frameHeight } = outputSize;
      const frameScale = 0.7;
      const canvasWidth = Math.round(frameWidth / frameScale);
      const canvasHeight = Math.round(frameHeight / frameScale);
      const frameX = Math.round((canvasWidth - frameWidth) / 2);
      const frameY = Math.round((canvasHeight - frameHeight) / 2);

      // 프레임 영역만 추출하기 위한 임시 캔버스
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = frameWidth;
      exportCanvas.height = frameHeight;
      const exportCtx = exportCanvas.getContext('2d')!;

      // 원본 캔버스에서 프레임 영역만 복사
      exportCtx.drawImage(
        canvas,
        frameX, frameY, frameWidth, frameHeight,
        0, 0, frameWidth, frameHeight
      );

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const quality = format === 'jpg' ? 0.9 : undefined;
      const dataUrl = exportCanvas.toDataURL(mimeType, quality);

      const link = document.createElement('a');
      link.download = `before-after-${Date.now()}.${format}`;
      link.href = dataUrl;
      link.click();

      setIsGenerating(false);
      toast.success('이미지가 다운로드되었습니다');
    }, 100);
  }, [outputSize, beforeMaskData, afterMaskData, reapplyOutlineFromCache]);

  // 초기화
  const resetAll = useCallback(() => {
    setBeforeImage(null);
    setAfterImage(null);
    setProcessedBeforeImage(null);
    setProcessedAfterImage(null);
    setBeforeTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    setAfterTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    setLayout('horizontal');
    setSliderPosition(50);
    setOutline({ enabled: true, color: '#ffffff', beforeThickness: 4, afterThickness: 4, style: 'solid' });
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
    setSelectedImage(null);
    setResizeHandle(null);
    imageCacheRef.current = { before: null, after: null, watermark: null };
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
    <div className="min-h-screen bg-gradient-to-b from-white to-[#f5f5f5] py-4 px-3">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-[#6b7280] hover:text-[#111111]"
          >
            <ArrowLeft className="w-3 h-3" />
            홈으로
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#60a5fa] flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#111111]">
              비포애프터 생성기
            </h1>
          </div>
          <div className="w-16"></div>
        </div>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={beforeInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageUpload(e, setBeforeImage, setProcessedBeforeImage)}
        />
        <input
          ref={afterInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageUpload(e, setAfterImage, setProcessedAfterImage)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-3">
          {/* 왼쪽: 미리보기 (크게) */}
          <div className="space-y-2">
            <Card className="border-[#eeeeee] shadow-sm">
              <CardHeader className="pb-1 pt-2 px-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* 레이아웃 버튼들 */}
                    <div className="flex gap-0.5">
                      {layoutOptions.map((option) => (
                        <Button
                          key={option.type}
                          variant={layout === option.type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setLayout(option.type)}
                          className={`h-6 w-6 p-0 ${layout === option.type
                            ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'
                            : 'border-[#eeeeee]'}`}
                        >
                          <option.icon className="w-3 h-3" />
                        </Button>
                      ))}
                    </div>
                    {/* 출력 크기 */}
                    <div className="flex gap-0.5">
                      {OUTPUT_SIZES.filter(s => s.label !== '커스텀').map((size) => (
                        <Button
                          key={size.label}
                          variant={!isCustomSize && outputSize.label === size.label ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setIsCustomSize(false);
                            setOutputSize(size);
                          }}
                          className={`h-8 text-sm px-1.5 ${!isCustomSize && outputSize.label === size.label
                            ? 'bg-[#111111] hover:bg-[#333333] text-white'
                            : 'border-[#eeeeee]'}`}
                        >
                          {size.label.split(' ')[0]}
                        </Button>
                      ))}
                      <Button
                        variant={isCustomSize ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setIsCustomSize(true);
                          setOutputSize({ width: customWidth, height: customHeight, label: '커스텀' });
                        }}
                        className={`h-8 text-sm px-1.5 ${isCustomSize
                          ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white'
                          : 'border-[#eeeeee]'}`}
                      >
                        커스텀
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetAll}
                    className="border-[#eeeeee] h-8 text-sm px-2"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    초기화
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                {/* 드래그 안내 */}
                {(beforeImage || afterImage) && (
                  <div className={`flex items-center gap-1 text-xs p-1.5 rounded ${
                    isEraserMode && (beforeMaskData || afterMaskData)
                      ? 'text-orange-500 bg-orange-500/10'
                      : 'text-[#3b82f6] bg-[#3b82f6]/10'
                  }`}>
                    {isEraserMode && (beforeMaskData || afterMaskData) ? (
                      <>
                        <Eraser className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>
                          지우개 모드: 이미지를 클릭하여 아웃라인 제거 | 지워진 영역: {erasedAreas.before.length + erasedAreas.after.length}개
                        </span>
                      </>
                    ) : (
                      <>
                        <Hand className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>
                          드래그: 이동 | 핸들: 크기 | <RotateCw className="w-2.5 h-2.5 inline" />: 회전 (Shift: 15°)
                          {layout === 'slider' && ' | 바: 조절'}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Canvas 미리보기 */}
                <div
                  ref={previewContainerRef}
                  className={`relative bg-[#1a1a1a] rounded-xl overflow-hidden select-none ${
                    isEraserMode && (beforeMaskData || afterMaskData)
                      ? 'cursor-crosshair hover:ring-2 hover:ring-orange-500/50'
                      : (beforeImage || afterImage)
                        ? 'cursor-move hover:ring-2 hover:ring-[#3b82f6]/50'
                        : ''
                  } ${isDragOver ? 'ring-4 ring-[#3b82f6] ring-inset' : ''}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full h-auto"
                    style={{ aspectRatio: `${Math.round(outputSize.width / 0.7)}/${Math.round(outputSize.height / 0.7)}` }}
                  />

                  {/* 드래그앤드롭 오버레이 - 프레임 영역에 맞춤 */}
                  {isDragOver && (
                    <div className="absolute pointer-events-none" style={{ top: '15%', left: '15%', width: '70%', height: '70%' }}>
                      <div className={`w-full h-full flex transition-colors ${
                        layout === 'vertical' ? 'flex-col' : ''
                      }`}>
                        <div className={`flex items-center justify-center ${
                          layout === 'horizontal' || layout === 'slider' ? 'w-1/2 h-full' :
                          layout === 'vertical' ? 'w-full h-1/2' : 'w-1/2 h-full'
                        } ${dropTarget === 'before' ? 'bg-[#3b82f6]/30' : 'bg-black/20'}`}>
                          <div className="text-center text-white">
                            <Upload className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm font-medium">Before</p>
                          </div>
                        </div>
                        <div className={`flex items-center justify-center ${
                          layout === 'horizontal' || layout === 'slider' ? 'w-1/2 h-full' :
                          layout === 'vertical' ? 'w-full h-1/2' : 'w-1/2 h-full'
                        } ${dropTarget === 'after' ? 'bg-[#10b981]/30' : 'bg-black/20'}`}>
                          <div className="text-center text-white">
                            <Upload className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm font-medium">After</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 둘 다 없을 때: 둘 다 업로드 버튼 - 프레임 영역에 맞춤 */}
                  {!beforeImage && !afterImage && !isDragOver && (
                    <div className="absolute" style={{ top: '15%', left: '15%', width: '70%', height: '70%' }}>
                      <div className={`flex w-full h-full ${layout === 'vertical' ? 'flex-col' : ''}`}>
                        <div
                          className={`flex flex-col items-center justify-center hover:bg-white/5 cursor-pointer transition-all ${
                            layout === 'vertical' ? 'flex-1 border-b border-[#333]' : 'flex-1 border-r border-[#333]'
                          }`}
                          onClick={() => beforeInputRef.current?.click()}
                        >
                          <div className="p-4 rounded-lg border-2 border-dashed border-[#666] hover:border-[#999] transition-colors">
                            <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 flex items-center justify-center mb-2 mx-auto">
                              <Upload className="w-4 h-4 text-[#3b82f6]" />
                            </div>
                            <p className="text-xs font-medium text-[#3b82f6] text-center">Before</p>
                            <p className="text-xs text-[#9ca3af] mt-0.5 text-center">클릭하여 업로드</p>
                          </div>
                        </div>
                        <div
                          className="flex-1 flex flex-col items-center justify-center hover:bg-white/5 cursor-pointer transition-all"
                          onClick={() => afterInputRef.current?.click()}
                        >
                          <div className="p-4 rounded-lg border-2 border-dashed border-[#666] hover:border-[#999] transition-colors">
                            <div className="w-8 h-8 rounded-full bg-[#10b981]/20 flex items-center justify-center mb-2 mx-auto">
                              <Upload className="w-4 h-4 text-[#10b981]" />
                            </div>
                            <p className="text-xs font-medium text-[#10b981] text-center">After</p>
                            <p className="text-xs text-[#9ca3af] mt-0.5 text-center">클릭하여 업로드</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Before만 있고 After가 없을 때: After 업로드 버튼 - 프레임 영역에 맞춤 */}
                  {beforeImage && !afterImage && !isDragOver && (
                    <div
                      className="absolute flex items-center justify-center hover:bg-white/10 cursor-pointer transition-all"
                      style={{
                        top: layout === 'vertical' ? '57.5%' : '15%',
                        left: layout === 'horizontal' || layout === 'slider' ? '50%' : '15%',
                        width: layout === 'vertical' ? '70%' : '35%',
                        height: layout === 'vertical' ? '35%' : '70%'
                      }}
                      onClick={() => afterInputRef.current?.click()}
                    >
                      <div className="p-4 rounded-lg border-2 border-dashed border-[#666] hover:border-[#10b981] transition-colors bg-black/30">
                        <div className="w-8 h-8 rounded-full bg-[#10b981]/20 flex items-center justify-center mb-2 mx-auto">
                          <Upload className="w-4 h-4 text-[#10b981]" />
                        </div>
                        <p className="text-xs font-medium text-[#10b981] text-center">After</p>
                        <p className="text-xs text-[#9ca3af] mt-0.5 text-center">클릭하여 업로드</p>
                      </div>
                    </div>
                  )}

                  {/* After만 있고 Before가 없을 때: Before 업로드 버튼 - 프레임 영역에 맞춤 */}
                  {!beforeImage && afterImage && !isDragOver && (
                    <div
                      className="absolute flex items-center justify-center hover:bg-white/10 cursor-pointer transition-all"
                      style={{
                        top: '15%',
                        left: '15%',
                        width: layout === 'vertical' ? '70%' : '35%',
                        height: layout === 'vertical' ? '35%' : '70%'
                      }}
                      onClick={() => beforeInputRef.current?.click()}
                    >
                      <div className="p-4 rounded-lg border-2 border-dashed border-[#666] hover:border-[#3b82f6] transition-colors bg-black/30">
                        <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 flex items-center justify-center mb-2 mx-auto">
                          <Upload className="w-4 h-4 text-[#3b82f6]" />
                        </div>
                        <p className="text-xs font-medium text-[#3b82f6] text-center">Before</p>
                        <p className="text-xs text-[#9ca3af] mt-0.5 text-center">클릭하여 업로드</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 이전단계 버튼 */}
                <div className="flex gap-1.5 mb-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-8 text-sm border-[#eeeeee] hover:bg-gray-50"
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    title="이전 단계 (Ctrl+Z)"
                  >
                    <Undo2 className="w-3 h-3 mr-1" />
                    이전단계
                  </Button>
                </div>

                {/* 이미지 삭제 버튼 */}
                <div className="flex gap-1.5 mb-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-8 text-sm border-[#eeeeee] hover:bg-gray-50"
                    onClick={deleteBeforeImage}
                    disabled={!beforeImage}
                    title="Before 이미지 삭제"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Before 삭제
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-8 text-sm border-[#eeeeee] hover:bg-gray-50"
                    onClick={deleteAfterImage}
                    disabled={!afterImage}
                    title="After 이미지 삭제"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    After 삭제
                  </Button>
                </div>

                {/* 다운로드 버튼 */}
                <div className="flex gap-1.5">
                  <Button
                    className="flex-1 h-8 bg-[#f72c5b] hover:bg-[#e0264f] text-white text-xs"
                    onClick={() => downloadImage('png')}
                    disabled={isGenerating || (!beforeImage && !afterImage)}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3 mr-1" />
                    )}
                    PNG
                  </Button>
                  <Button
                    className="flex-1 h-8 bg-[#111111] hover:bg-[#333333] text-white text-xs"
                    onClick={() => downloadImage('jpg')}
                    disabled={isGenerating || (!beforeImage && !afterImage)}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3 mr-1" />
                    )}
                    JPG
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 오른쪽: 설정 패널 */}
          <div className="space-y-2">
            {/* 슬라이더 위치 (슬라이더 레이아웃일 때만) */}
            {layout === 'slider' && (
              <Card className="border-[#eeeeee] shadow-sm">
                <CardContent className="pt-2 pb-2 px-2">
                  <Label className="text-xs mb-1 block">슬라이더: {sliderPosition}%</Label>
                  <Slider
                    value={[sliderPosition]}
                    onValueChange={([value]) => setSliderPosition(value)}
                    min={10}
                    max={90}
                    step={1}
                  />
                </CardContent>
              </Card>
            )}

            {/* 레이아웃 설정 */}
            <Card className="border-[#eeeeee] shadow-sm">
              <CardHeader className="pb-1 pt-2 px-2">
                <CardTitle className="flex items-center gap-1 text-sm">
                  <Settings className="w-3 h-3 text-[#6b7280]" />
                  레이아웃
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 px-2 pb-2">
                <div className="flex flex-wrap gap-0.5">
                  {layoutOptions.map((option) => (
                    <Button
                      key={option.type}
                      variant={layout === option.type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLayout(option.type)}
                      className={`h-5 px-1.5 text-xs ${layout === option.type
                        ? 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'
                        : 'border-[#eeeeee]'}`}
                    >
                      <option.icon className="w-2.5 h-2.5 mr-0.5" />
                      {option.label}
                    </Button>
                  ))}
                </div>

                {layout === 'slider' && (
                  <div className="space-y-0.5">
                    <Label className="text-xs">슬라이더: {sliderPosition}%</Label>
                    <Slider
                      value={[sliderPosition]}
                      onValueChange={([value]) => setSliderPosition(value)}
                      min={10}
                      max={90}
                      step={1}
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">출력 크기</Label>
                  <div className="flex flex-wrap gap-0.5">
                    {OUTPUT_SIZES.filter(s => s.label !== '커스텀').map((size) => (
                      <Button
                        key={size.label}
                        variant={!isCustomSize && outputSize.label === size.label ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setIsCustomSize(false);
                          setOutputSize(size);
                        }}
                        className={`h-5 px-1 text-xs ${!isCustomSize && outputSize.label === size.label
                          ? 'bg-[#111111] hover:bg-[#333333] text-white'
                          : 'border-[#eeeeee]'}`}
                      >
                        {size.label.split(' ')[0]}
                      </Button>
                    ))}
                    <Button
                      variant={isCustomSize ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setIsCustomSize(true);
                        setOutputSize({ width: customWidth, height: customHeight, label: '커스텀' });
                      }}
                      className={`h-5 px-1 text-xs ${isCustomSize
                        ? 'bg-[#8b5cf6] hover:bg-[#7c3aed] text-white'
                        : 'border-[#eeeeee]'}`}
                    >
                      커스텀
                    </Button>
                  </div>
                  {isCustomSize && (
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        type="number"
                        value={customWidth}
                        onChange={(e) => {
                          const w = Math.max(100, Math.min(4000, parseInt(e.target.value) || 100));
                          setCustomWidth(w);
                          setOutputSize({ width: w, height: customHeight, label: '커스텀' });
                        }}
                        className="h-8 text-sm w-16 px-1 text-center"
                        min={100}
                        max={4000}
                      />
                      <span className="text-xs text-gray-500">×</span>
                      <Input
                        type="number"
                        value={customHeight}
                        onChange={(e) => {
                          const h = Math.max(100, Math.min(4000, parseInt(e.target.value) || 100));
                          setCustomHeight(h);
                          setOutputSize({ width: customWidth, height: h, label: '커스텀' });
                        }}
                        className="h-8 text-sm w-16 px-1 text-center"
                        min={100}
                        max={4000}
                      />
                      <span className="text-xs text-gray-400">px</span>
                    </div>
                  )}
                  {isCustomSize && (
                    <p className="text-xs text-gray-500">
                      현재: {outputSize.width} × {outputSize.height}px
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 배경 제거 (누끼) */}
            <Card className="border-[#eeeeee] shadow-sm">
              <CardHeader className="pb-1 pt-2 px-2">
                <CardTitle className="flex items-center gap-1 text-sm">
                  <Scissors className="w-3 h-3 text-[#6b7280]" />
                  AI 배경 제거
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 px-2 pb-2">
                <p className="text-xs text-gray-500">
                  AI 모델로 인물을 정확하게 인식하여 배경을 제거합니다.<br/>
                  * 첫 실행 시 모델 로딩에 시간이 걸립니다
                </p>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    variant="outline"
                    className="h-8 text-sm border-[#eeeeee] hover:bg-gray-50"
                    onClick={() => applyRemoveBackground('before')}
                    disabled={isRemovingBg || !beforeImage}
                  >
                    {isRemovingBg ? (
                      <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                    ) : (
                      <Scissors className="w-2.5 h-2.5 mr-0.5" />
                    )}
                    Before
                  </Button>
                  <Button
                    variant="outline"
                    className="h-8 text-sm border-[#eeeeee] hover:bg-gray-50"
                    onClick={() => applyRemoveBackground('after')}
                    disabled={isRemovingBg || !afterImage}
                  >
                    {isRemovingBg ? (
                      <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                    ) : (
                      <Scissors className="w-2.5 h-2.5 mr-0.5" />
                    )}
                    After
                  </Button>
                </div>
                <Button
                  className="w-full h-8 text-sm bg-[#111111] hover:bg-[#333333] text-white"
                  onClick={() => applyRemoveBackground('both')}
                  disabled={isRemovingBg || (!beforeImage && !afterImage)}
                >
                  {isRemovingBg ? (
                    <>
                      <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                      처리중
                    </>
                  ) : (
                    <>
                      <Scissors className="w-2.5 h-2.5 mr-0.5" />
                      둘 다 제거
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-400">
                  * 배경이 단색일수록 정확도가 높습니다
                </p>
              </CardContent>
            </Card>

            {/* 아웃라인 설정 */}
            <Card className="border-[#eeeeee] shadow-sm">
              <CardHeader className="pb-1 pt-2 px-2">
                <CardTitle className="flex items-center gap-1 text-sm">
                  <Palette className="w-3 h-3 text-[#6b7280]" />
                  아웃라인
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 px-2 pb-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">사용</Label>
                  <Button
                    variant={outline.enabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOutline(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`h-8 text-sm px-2 ${outline.enabled ? 'bg-[#111111] hover:bg-[#333333]' : ''}`}
                  >
                    {outline.enabled ? 'ON' : 'OFF'}
                  </Button>
                </div>

                {outline.enabled && (
                  <>
                    <div className="space-y-0.5">
                      <Label className="text-xs">색상</Label>
                      <div className="flex gap-0.5">
                        {['#ffffff', '#000000', '#f72c5b', '#3b82f6', '#10b981'].map((color) => (
                          <button
                            key={color}
                            className={`w-5 h-5 rounded-full border-2 transition-all ${
                              outline.color === color ? 'border-[#111111] scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              setOutline(prev => ({ ...prev, color }));
                              if (beforeMaskData || afterMaskData) debouncedReapplyOutline();
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          value={outline.color}
                          onChange={(e) => {
                            setOutline(prev => ({ ...prev, color: e.target.value }));
                            if (beforeMaskData || afterMaskData) debouncedReapplyOutline();
                          }}
                          className="w-5 h-5 rounded-full cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="space-y-0.5">
                        <Label className="text-xs">Before 두께: {outline.beforeThickness}px</Label>
                        <Slider
                          value={[outline.beforeThickness]}
                          onValueChange={([value]) => {
                            setOutline(prev => ({ ...prev, beforeThickness: value }));
                            if (beforeMaskData) debouncedReapplyOutline({ before: true });
                          }}
                          min={1}
                          max={100}
                          step={1}
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-xs">After 두께: {outline.afterThickness}px</Label>
                        <Slider
                          value={[outline.afterThickness]}
                          onValueChange={([value]) => {
                            setOutline(prev => ({ ...prev, afterThickness: value }));
                            if (afterMaskData) debouncedReapplyOutline({ after: true });
                          }}
                          min={1}
                          max={100}
                          step={1}
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <Label className="text-xs">스타일</Label>
                      <div className="flex gap-1">
                        {[
                          { value: 'solid' as const, label: '실선' },
                          { value: 'gradient' as const, label: '그라데이션' },
                          { value: 'glow' as const, label: '글로우' },
                        ].map(({ value, label }) => (
                          <button
                            key={value}
                            className={`flex-1 px-1 py-0.5 text-xs rounded transition-colors ${
                              outline.style === value
                                ? 'bg-[#111111] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            onClick={() => {
                              setOutline(prev => ({ ...prev, style: value }));
                              if (beforeMaskData || afterMaskData) debouncedReapplyOutline();
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 지우개 모드 */}
                    {(beforeMaskData || afterMaskData) && (
                      <div className="space-y-1 border-t border-gray-200 pt-2 mt-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1">
                            <Eraser className="w-3 h-3" />
                            라인 지우개
                          </Label>
                          <Button
                            variant={isEraserMode ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setIsEraserMode(!isEraserMode);
                              if (!isEraserMode) setIsAreaExcludeMode(false);
                            }}
                            className={`h-8 text-sm px-2 ${isEraserMode ? 'bg-[#111111] hover:bg-[#333333]' : ''}`}
                          >
                            {isEraserMode ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        {isEraserMode && (
                          <div className="space-y-0.5">
                            <Label className="text-xs">지우개 크기: {eraserSize}px</Label>
                            <Slider
                              value={[eraserSize]}
                              onValueChange={([value]) => setEraserSize(value)}
                              min={5}
                              max={100}
                              step={5}
                            />
                          </div>
                        )}
                        {(erasedAreas.before.length > 0 || erasedAreas.after.length > 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearErasedAreas}
                            className="w-full h-8 text-sm"
                          >
                            지운 영역 초기화
                          </Button>
                        )}
                      </div>
                    )}

                    {/* 영역 제외 모드 */}
                    {(beforeMaskData || afterMaskData) && (
                      <div className="space-y-1 border-t border-gray-200 pt-2 mt-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1">
                            <Scissors className="w-3 h-3" />
                            영역 제외
                          </Label>
                          <Button
                            variant={isAreaExcludeMode ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setIsAreaExcludeMode(!isAreaExcludeMode);
                              if (!isAreaExcludeMode) setIsEraserMode(false);
                            }}
                            className={`h-8 text-sm px-2 ${isAreaExcludeMode ? 'bg-[#111111] hover:bg-[#333333]' : ''}`}
                          >
                            {isAreaExcludeMode ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        {isAreaExcludeMode && (
                          <p className="text-xs text-gray-500">
                            아웃라인을 클릭하면 연결된 영역이 제외됩니다
                          </p>
                        )}
                        {(excludedRegions.before.size > 0 || excludedRegions.after.size > 0) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearExcludedRegions}
                            className="w-full h-8 text-sm"
                          >
                            제외 영역 초기화 ({excludedRegions.before.size + excludedRegions.after.size}개 픽셀)
                          </Button>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-1">
                      * AI가 인물을 감지하여 외곽선 생성<br/>
                      * 원본 이미지 위에 아웃라인 오버레이<br/>
                      {(beforeMaskData || afterMaskData) && '* 두께/색상/스타일 변경 시 실시간 적용'}
                    </p>

                    <Button
                      className="w-full h-8 text-sm bg-[#f72c5b] hover:bg-[#e0264f] text-white"
                      onClick={applyOutline}
                      disabled={isProcessingOutline || (!beforeImage && !afterImage)}
                    >
                      {isProcessingOutline ? (
                        <>
                          <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                          처리중
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                          적용
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 라벨 설정 */}
            <Card className="border-[#eeeeee] shadow-sm">
              <CardHeader className="pb-1 pt-2 px-2">
                <CardTitle className="flex items-center gap-1 text-sm">
                  <Type className="w-3 h-3 text-[#6b7280]" />
                  라벨
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 px-2 pb-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">표시</Label>
                  <Button
                    variant={labels.showLabels ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLabels(prev => ({ ...prev, showLabels: !prev.showLabels }))}
                    className={`h-8 text-sm px-2 ${labels.showLabels ? 'bg-[#111111] hover:bg-[#333333]' : ''}`}
                  >
                    {labels.showLabels ? 'ON' : 'OFF'}
                  </Button>
                </div>

                {labels.showLabels && (
                  <>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <Label className="text-xs">Before</Label>
                        <Input
                          value={labels.beforeText}
                          onChange={(e) => setLabels(prev => ({ ...prev, beforeText: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">After</Label>
                        <Input
                          value={labels.afterText}
                          onChange={(e) => setLabels(prev => ({ ...prev, afterText: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">커스텀</Label>
                      <Input
                        value={labels.customText}
                        onChange={(e) => setLabels(prev => ({ ...prev, customText: e.target.value }))}
                        placeholder="4주 결과"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label className="text-xs">날짜</Label>
                      <Button
                        variant={labels.showDate ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLabels(prev => ({ ...prev, showDate: !prev.showDate }))}
                        className={`h-8 text-sm px-2 ${labels.showDate ? 'bg-[#111111] hover:bg-[#333333]' : ''}`}
                      >
                        {labels.showDate ? 'ON' : 'OFF'}
                      </Button>
                    </div>

                    <div className="space-y-0.5">
                      <Label className="text-xs">크기: {labels.fontSize}px</Label>
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
            <Card className="border-[#eeeeee] shadow-sm">
              <CardHeader className="pb-1 pt-2 px-2">
                <CardTitle className="flex items-center gap-1 text-sm">
                  <Stamp className="w-3 h-3 text-[#6b7280]" />
                  워터마크
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 px-2 pb-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">사용</Label>
                  <Button
                    variant={watermark.enabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setWatermark(prev => ({ ...prev, enabled: !prev.enabled }))}
                    className={`h-8 text-sm px-2 ${watermark.enabled ? 'bg-[#111111] hover:bg-[#333333]' : ''}`}
                  >
                    {watermark.enabled ? 'ON' : 'OFF'}
                  </Button>
                </div>

                {watermark.enabled && (
                  <>
                    <div
                      className="h-10 rounded border-2 border-dashed border-[#e5e5e5] flex items-center justify-center cursor-pointer hover:border-[#6366f1] transition-colors"
                      onClick={() => watermarkInputRef.current?.click()}
                    >
                      {watermark.image ? (
                        <img src={watermark.image} alt="Watermark" className="h-7 object-contain" />
                      ) : (
                        <span className="text-xs text-[#9ca3af]">로고</span>
                      )}
                    </div>
                    <input
                      ref={watermarkInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleWatermarkUpload}
                    />

                    <div className="space-y-0.5">
                      <Label className="text-xs">투명도: {watermark.opacity}%</Label>
                      <Slider
                        value={[watermark.opacity]}
                        onValueChange={([value]) => setWatermark(prev => ({ ...prev, opacity: value }))}
                        min={10}
                        max={100}
                        step={5}
                      />
                    </div>

                    <div className="space-y-0.5">
                      <Label className="text-xs">크기: {watermark.size}px</Label>
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
        </div>
      </div>
    </div>
  );
}
