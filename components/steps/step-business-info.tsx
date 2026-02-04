'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth-context';
import { CATEGORIES, CATEGORY_ATTRIBUTES, ATTRIBUTE_PLACEHOLDERS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Building2, Target, Lightbulb, ArrowRight, Search, Loader2, MapPin, Plus, X, Save, Download, ChevronDown, ChevronRight, Pencil, Check, Trash2, HelpCircle } from 'lucide-react';

interface NaverPlaceResult {
  title: string;
  category: string;
  address: string;
  roadAddress: string;
  telephone: string;
  link: string;
}

interface NaverPlaceDetail {
  name: string;
  category: string;
  roadAddress: string;
  fullAddress: string;
  phone: string;
  virtualPhone: string;
  menus: string[];
  businessHoursStatus: string;
  businessHoursDescription: string;
  dayOff: string | null;
  dayOffDescription: string | null;
  visitorReviewCount: string;
  bookingUrl: string | null;
}

interface SavedBusinessInfo {
  category: string;
  businessName: string;
  mainKeyword: string;
  targetAudience: string;
  uniquePoint: string;
  attributes: Record<string, string>;
  customAttributes: string[];
  attributeLabels?: Record<string, string>;
  hiddenAttributes?: string[];
  customCategoryName?: string;
  savedAt: string;
}

// 운영시간/휴무일 그룹
const OPERATING_HOURS_ATTRS = ['평일 운영', '주말 운영', '공휴일 운영', '휴무일'];
const OPERATING_HOURS_SECTION_TITLE_KEY = '섹션_운영시간';
const DEFAULT_OPERATING_HOURS_TITLE = '운영시간 / 휴무일';

// 가격 관련
const PRICE_ATTR = '가격';

const STORAGE_KEY = 'blogbooster_saved_business_info';

export function StepBusinessInfo() {
  const {
    category,
    businessName,
    mainKeyword,
    targetAudience,
    uniquePoint,
    attributes,
    customAttributes,
    attributeLabels,
    hiddenAttributes,
    customCategoryName,
    setCategory,
    setCustomCategoryName,
    setBusinessInfo,
    setAttribute,
    setPlaceInfo,
    addCustomAttribute,
    removeCustomAttribute,
    setCustomAttributes,
    setAttributeLabel,
    hideAttribute,
    setHiddenAttributes,
    setAttributeLabels,
  } = useAppStore();
  const { getAuthHeaders } = useAuth();

  const setCurrentStep = useAppStore((state) => state.setCurrentStep);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NaverPlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [hasSavedInfo, setHasSavedInfo] = useState(false);

  // 운영시간 섹션 열기/닫기
  const [isOperatingHoursOpen, setIsOperatingHoursOpen] = useState(false);
  // 가격 섹션 열기/닫기
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  // 라벨 편집 모드
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');
  // 운영시간 섹션 타이틀 편집
  const [isEditingOperatingTitle, setIsEditingOperatingTitle] = useState(false);
  const [tempOperatingTitle, setTempOperatingTitle] = useState('');

  // ============================================================
  // 입력 완성도 계산
  // ============================================================
  const completionInfo = useMemo(() => {
    const items: { label: string; filled: boolean; required?: boolean; recommended?: boolean }[] = [
      { label: '업체명', filled: !!businessName.trim(), required: true },
      { label: '메인 키워드', filled: !!mainKeyword.trim(), required: true },
      { label: '타겟 고객', filled: !!targetAudience.trim(), recommended: true },
      { label: '핵심 차별점', filled: !!uniquePoint.trim(), recommended: true },
      { label: '위치', filled: !!attributes['위치']?.trim() },
      { label: '전화번호', filled: !!attributes['전화번호']?.trim() },
      { label: '운영시간', filled: OPERATING_HOURS_ATTRS.some(a => !!attributes[a]?.trim()) },
      { label: '가격', filled: !!attributes[PRICE_ATTR]?.trim() },
    ];
    const filled = items.filter(i => i.filled).length;
    const total = items.length;
    const percent = Math.round((filled / total) * 100);
    return { items, filled, total, percent };
  }, [businessName, mainKeyword, targetAudience, uniquePoint, attributes]);

  // 운영시간 미입력 여부
  const hasOperatingHours = OPERATING_HOURS_ATTRS.some(a => !!attributes[a]?.trim());
  // 가격 미입력 여부
  const hasPriceValue = !!attributes[PRICE_ATTR]?.trim();

  // Load saved info on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setHasSavedInfo(true);
      // Auto-load saved info if no current data
      if (!businessName) {
        loadSavedInfo();
      }
    }
  }, []);

  const saveBusinessInfo = (silent = false) => {
    const infoToSave: SavedBusinessInfo = {
      category,
      businessName,
      mainKeyword,
      targetAudience,
      uniquePoint,
      attributes,
      customAttributes,
      attributeLabels,
      hiddenAttributes,
      customCategoryName,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(infoToSave));
    setHasSavedInfo(true);
    if (!silent) {
      toast.success('내 정보가 저장되었습니다');
    }
  };

  const loadSavedInfo = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const info: SavedBusinessInfo = JSON.parse(saved);
      setCategory(info.category as typeof category);
      setBusinessInfo({
        businessName: info.businessName,
        mainKeyword: info.mainKeyword,
        targetAudience: info.targetAudience,
        uniquePoint: info.uniquePoint,
      });
      Object.entries(info.attributes).forEach(([key, value]) => {
        setAttribute(key, value);
      });
      if (info.customAttributes) {
        setCustomAttributes(info.customAttributes);
      }
      if (info.attributeLabels) {
        setAttributeLabels(info.attributeLabels);
      }
      if (info.hiddenAttributes) {
        setHiddenAttributes(info.hiddenAttributes);
      }
      if (info.customCategoryName) {
        setCustomCategoryName(info.customCategoryName);
      }
      toast.success('저장된 정보를 불러왔습니다');
    }
  };

  const handleNaverSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('검색어를 입력해주세요');
      return;
    }

    setIsSearching(true);
    setShowResults(false);

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/naver/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
        setShowResults(true);
        toast.success(`${data.results.length}개의 업체를 찾았습니다`);
      } else {
        toast.info('검색 결과가 없습니다');
      }
    } catch {
      toast.error('검색 중 오류가 발생했습니다');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = async (place: NaverPlaceResult) => {
    const categoryMap: Record<string, typeof category> = {
      '헬스클럽': '헬스장',
      '헬스장': '헬스장',
      '휘트니스': '헬스장',
      '피트니스': '헬스장',
      '필라테스': '필라테스',
      '피티샵': 'PT샵',
      'PT': 'PT샵',
      '퍼스널트레이닝': 'PT샵',
      '요가': '요가',
      '요가원': '요가',
      '크로스핏': '크로스핏',
      '복싱': '복싱',
      '복싱장': '복싱',
      '바레': '바레',
    };

    let detectedCategory: typeof category | null = null;
    const placeCategories = place.category.split('>').map(c => c.trim());
    for (const cat of placeCategories) {
      for (const [key, value] of Object.entries(categoryMap)) {
        if (cat.includes(key)) {
          detectedCategory = value;
          break;
        }
      }
      if (detectedCategory) break;
    }

    const addressParts = (place.roadAddress || place.address).split(' ');
    const locationKeyword = addressParts.length >= 2
      ? `${addressParts[1]} ${detectedCategory || category}`
      : '';

    const newAttributes: Record<string, string> = {};
    const address = place.roadAddress || place.address;
    if (address) {
      newAttributes['위치'] = address;
    }
    if (place.telephone && place.telephone.trim()) {
      newAttributes['전화번호'] = place.telephone;
    }

    // 기본 정보 먼저 반영
    setPlaceInfo({
      category: detectedCategory || undefined,
      businessName: place.title,
      mainKeyword: locationKeyword || mainKeyword,
      attributes: newAttributes,
    });

    setShowResults(false);
    setSearchQuery('');

    const loadedItems = ['업체명'];
    if (address) loadedItems.push('위치');
    if (place.telephone && place.telephone.trim()) {
      loadedItems.push('전화번호');
    }
    toast.success(`"${place.title}" 기본 정보 불러옴 (${loadedItems.join(', ')})`);

    // 상세 정보 (운영시간, 가격 등) 추가 조회
    setIsFetchingDetail(true);
    try {
      const detailAuthHeaders = await getAuthHeaders();
      const detailRes = await fetch('/api/naver/place-detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...detailAuthHeaders },
        body: JSON.stringify({ query: place.title }),
      });
      const detailData = await detailRes.json();

      if (detailData.details && detailData.details.length > 0) {
        // 이름이 가장 유사한 결과 찾기
        const detail: NaverPlaceDetail = detailData.details.find(
          (d: NaverPlaceDetail) => d.name.replace(/\s/g, '') === place.title.replace(/\s/g, '')
        ) || detailData.details[0];

        const extraItems: string[] = [];

        // 전화번호 보완 (기존에 없으면 virtualPhone 사용)
        if (!place.telephone?.trim() && detail.virtualPhone) {
          setAttribute('전화번호', detail.virtualPhone);
          extraItems.push('전화번호');
        }

        // 상세 주소 보완
        if (detail.fullAddress && detail.fullAddress.length > (address?.length || 0)) {
          setAttribute('위치', detail.fullAddress);
        }

        // 운영시간 정보
        if (detail.businessHoursDescription) {
          // "21:00에 영업 종료" → 운영시간 형태로 변환
          const hoursText = detail.businessHoursStatus
            ? `${detail.businessHoursStatus} (${detail.businessHoursDescription})`
            : detail.businessHoursDescription;
          setAttribute('평일 운영', hoursText);
          extraItems.push('운영시간');
        }

        // 휴무일 정보
        if (detail.dayOff || detail.dayOffDescription) {
          setAttribute('휴무일', detail.dayOffDescription || detail.dayOff || '');
          extraItems.push('휴무일');
        }

        // 가격/메뉴 정보
        if (detail.menus && detail.menus.length > 0) {
          // 이모지 및 특수문자 제거
          const removeEmoji = (str: string) =>
            str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, '').trim();
          const cleanedMenus = detail.menus.map(removeEmoji);

          // 홍보 문구 (가격 0 또는 "무료") → 핵심 차별점으로 활용
          const promoItems = cleanedMenus
            .filter(m => m.endsWith(' 0') || m.endsWith(' 무료') || m.includes('변동가격(업주문의)'))
            .map(m => m
              .replace(/\s+0$/, '')
              .replace(/\s+무료$/, '')
              .replace(/\s*변동가격\(업주문의\)/, '')
              .trim()
            )
            .filter(m => m.length > 0);

          // 실제 가격 항목
          const priceLines = cleanedMenus
            .filter(m => {
              if (m.includes('변동가격(업주문의)')) return false;
              if (m.endsWith(' 0')) return false;
              if (m.endsWith(' 무료')) return false;
              return true;
            })
            .map(m => {
              // "구독 멤버십 BASIC 43,900" → "구독 멤버십 BASIC: 43,900원"
              const priceMatch = m.match(/^(.+?)\s+([\d,]+)$/);
              if (priceMatch) {
                return `${priceMatch[1].trim()}: ${priceMatch[2]}원`;
              }
              return m;
            });

          if (priceLines.length > 0) {
            setAttribute(PRICE_ATTR, priceLines.join('\n'));
            extraItems.push('가격');
          }

          // 홍보 문구를 핵심 차별점에 추가
          if (promoItems.length > 0 && !uniquePoint.trim()) {
            setBusinessInfo({ uniquePoint: promoItems.join(', ') });
            extraItems.push('차별점');
          }
        }

        if (extraItems.length > 0) {
          toast.success(`상세 정보 추가 완료 (${extraItems.join(', ')})`);
        }
      }
    } catch {
      // 상세 정보 조회 실패는 무시 (기본 정보는 이미 반영됨)
      console.warn('플레이스 상세 정보 조회 실패');
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleNext = () => {
    if (!businessName.trim()) {
      toast.error('업체명을 입력해주세요');
      return;
    }
    if (!mainKeyword.trim()) {
      toast.error('메인 키워드를 입력해주세요');
      return;
    }
    // 자동 저장 후 다음 단계
    saveBusinessInfo(true);
    setCurrentStep(1);
  };

  const handleAddAttribute = () => {
    if (!newAttributeName.trim()) {
      toast.error('속성명을 입력해주세요');
      return;
    }
    if (CATEGORY_ATTRIBUTES[category].includes(newAttributeName) || customAttributes.includes(newAttributeName)) {
      toast.error('이미 존재하는 속성입니다');
      return;
    }
    addCustomAttribute(newAttributeName);
    setNewAttributeName('');
    setShowAddAttribute(false);
    toast.success(`"${newAttributeName}" 속성이 추가되었습니다`);
  };

  // 표시할 속성 필터링 (숨김 처리 제외)
  const baseAttributes = CATEGORY_ATTRIBUTES[category].filter(
    (attr) => !hiddenAttributes.includes(attr)
  );
  const visibleCustomAttributes = customAttributes.filter(
    (attr) => !hiddenAttributes.includes(attr)
  );

  // 운영시간 그룹과 기타 속성 분리 (가격도 제외)
  const operatingHoursAttrs = baseAttributes.filter((attr) =>
    OPERATING_HOURS_ATTRS.includes(attr)
  );
  const hasPriceAttr = baseAttributes.includes(PRICE_ATTR);
  const otherBaseAttrs = baseAttributes.filter(
    (attr) => !OPERATING_HOURS_ATTRS.includes(attr) && attr !== PRICE_ATTR
  );

  // 라벨 가져오기
  const getLabel = (attr: string) => attributeLabels[attr] || attr;

  // 라벨 편집
  const startEditLabel = (attr: string) => {
    setEditingLabel(attr);
    setTempLabel(getLabel(attr));
  };

  const finishEditLabel = () => {
    if (editingLabel && tempLabel.trim()) {
      setAttributeLabel(editingLabel, tempLabel.trim());
      toast.success('항목명이 변경되었습니다');
    }
    setEditingLabel(null);
    setTempLabel('');
  };

  // 속성 삭제 (숨김 처리)
  const handleDeleteAttribute = (attr: string) => {
    const isCustom = customAttributes.includes(attr);
    if (isCustom) {
      removeCustomAttribute(attr);
    } else {
      hideAttribute(attr);
    }
    toast.success(`"${getLabel(attr)}" 항목이 삭제되었습니다`);
  };

  // 속성 입력 필드 렌더링
  const renderAttributeField = (attr: string) => {
    const label = getLabel(attr);
    const isEditing = editingLabel === attr;

    return (
      <div key={attr} className="space-y-1 relative group">
        <div className="flex items-center justify-between min-h-[20px]">
          {isEditing ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={tempLabel}
                onChange={(e) => setTempLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && finishEditLabel()}
                className="h-6 text-xs py-0 px-1 w-full"
                autoFocus
              />
              <button
                className="p-0.5 hover:bg-[#03C75A]/10 rounded"
                onClick={finishEditLabel}
              >
                <Check className="w-3 h-3 text-[#03C75A]" />
              </button>
            </div>
          ) : (
            <>
              <label className="text-xs font-medium text-[#6b7280] truncate flex-1">
                {label}
              </label>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-0.5 hover:bg-[#f5f5f5] rounded"
                  onClick={() => startEditLabel(attr)}
                  title="항목명 수정"
                >
                  <Pencil className="w-3 h-3 text-[#111111]" />
                </button>
                <button
                  className="p-0.5 hover:bg-red-100 rounded"
                  onClick={() => handleDeleteAttribute(attr)}
                  title="항목 삭제"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            </>
          )}
        </div>
        <Input
          placeholder={ATTRIBUTE_PLACEHOLDERS[attr] || `${label} 입력`}
          value={attributes[attr] || ''}
          onChange={(e) => setAttribute(attr, e.target.value)}
          className="h-10 bg-white border-[#eeeeee] focus:border-[#f72c5b] text-sm"
        />
      </div>
    );
  };

  return (
    <Card className="border border-[#eeeeee] shadow-lg bg-white">
      <CardHeader className="space-y-1 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#f72c5b]/10 text-[#f72c5b]">
              <Building2 className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl">업체 정보 입력</CardTitle>
          </div>
          {hasSavedInfo && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[#03c75a] border-[#03c75a]/50 hover:bg-[#03c75a]/10"
              onClick={loadSavedInfo}
            >
              <Download className="w-3 h-3 mr-1" />
              불러오기
            </Button>
          )}
        </div>
        <CardDescription className="text-base">블로그 글 생성에 필요한 정보를 입력하세요</CardDescription>

        {/* 입력 완성도 프로그레스 */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[#6b7280]">입력 완성도</span>
            <span className={cn(
              'text-xs font-semibold',
              completionInfo.percent >= 80 ? 'text-[#03C75A]' :
              completionInfo.percent >= 50 ? 'text-[#f72c5b]' : 'text-[#6b7280]'
            )}>
              {completionInfo.percent}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#f5f5f5] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                completionInfo.percent >= 80 ? 'bg-[#03C75A]' :
                completionInfo.percent >= 50 ? 'bg-[#f72c5b]' : 'bg-[#d1d5db]'
              )}
              style={{ width: `${completionInfo.percent}%` }}
            />
          </div>
          <p className="text-[10px] text-[#9ca3af] mt-1">
            정보를 많이 입력할수록 AI가 더 정확하고 풍부한 블로그 글을 생성합니다
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">업종 선택</Label>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={cn(
                  'px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border',
                  category === cat
                    ? 'bg-[#f72c5b]/20 border-[#f72c5b] text-[#f72c5b]'
                    : 'bg-white border-[#eeeeee] text-[#6b7280] hover:border-[#eeeeee] hover:text-[#111111]'
                )}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          {category === '기타' && (
            <Input
              placeholder="업종명을 직접 입력하세요 (예: 수영, 댄스, 폴댄스 등)"
              value={customCategoryName}
              onChange={(e) => setCustomCategoryName(e.target.value)}
              className="mt-2"
            />
          )}
        </div>

        {/* Naver Place Search */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#03c75a]" />
            네이버 플레이스 검색
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="업체명 검색 (예: 홍대 헬스장)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNaverSearch()}
              className="h-11 bg-white border-[#eeeeee] focus:border-[#03c75a]"
            />
            <Button
              type="button"
              onClick={handleNaverSearch}
              disabled={isSearching}
              className="h-11 px-4 bg-[#03c75a] hover:bg-[#02b350] text-white"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {isFetchingDetail ? (
            <p className="text-xs text-[#03c75a] flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              상세 정보 불러오는 중... (운영시간, 가격 등)
            </p>
          ) : (
            <p className="text-xs text-[#03c75a]/70">
              검색하면 업체명, 위치, 전화번호, 운영시간, 가격이 자동 입력됩니다
            </p>
          )}

          {/* Search Results */}
          {showResults && searchResults.length > 0 && (
            <div className="border border-[#eeeeee] rounded-lg overflow-hidden bg-white shadow-lg">
              {searchResults.map((place, idx) => (
                <button
                  key={idx}
                  className="w-full text-left p-3 hover:bg-[#f9fafb] border-b border-[#eeeeee] last:border-b-0 transition-colors"
                  onClick={() => handleSelectPlace(place)}
                >
                  <p className="font-medium text-[#111111]">{place.title}</p>
                  <p className="text-sm text-[#6b7280] mt-1">{place.roadAddress || place.address}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#9ca3af]">{place.category}</span>
                    {place.telephone && (
                      <span className="text-xs text-[#9ca3af]">&bull; {place.telephone}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="businessName" className="flex items-center gap-1">
              업체명 <span className="text-[#f72c5b]">*</span>
            </Label>
            <Input
              id="businessName"
              placeholder="예: OO피트니스 홍대점"
              value={businessName}
              onChange={(e) => setBusinessInfo({ businessName: e.target.value })}
              className="h-11 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mainKeyword" className="flex items-center gap-1">
              메인 키워드 <span className="text-[#f72c5b]">*</span>
            </Label>
            <Input
              id="mainKeyword"
              placeholder="예: 홍대 헬스장"
              value={mainKeyword}
              onChange={(e) => setBusinessInfo({ mainKeyword: e.target.value })}
              className="h-11 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
            />
          </div>
        </div>

        {/* Target & Unique Point */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="flex items-center gap-1">
              <Target className="w-4 h-4 text-[#f72c5b]" />
              타겟 고객
              <span className="text-[10px] text-[#f72c5b] bg-[#f72c5b]/10 px-1.5 py-0.5 rounded-full font-medium">권장</span>
            </Label>
            <Input
              id="targetAudience"
              placeholder="예: 20-30대 직장인 여성"
              value={targetAudience}
              onChange={(e) => setBusinessInfo({ targetAudience: e.target.value })}
              className="h-11 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
            />
            <p className="text-[10px] text-[#9ca3af] flex items-start gap-1">
              <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              AI가 이 고객층의 관심사와 고민에 맞춘 글을 작성합니다
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="uniquePoint" className="flex items-center gap-1">
              <Lightbulb className="w-4 h-4 text-[#f72c5b]" />
              핵심 차별점
              <span className="text-[10px] text-[#f72c5b] bg-[#f72c5b]/10 px-1.5 py-0.5 rounded-full font-medium">권장</span>
            </Label>
            <Input
              id="uniquePoint"
              placeholder="예: 1:1 맞춤 프로그램, 24시 운영"
              value={uniquePoint}
              onChange={(e) => setBusinessInfo({ uniquePoint: e.target.value })}
              className="h-11 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
            />
            <p className="text-[10px] text-[#9ca3af] flex items-start gap-1">
              <HelpCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              블로그 글에서 경쟁업체와의 차별화 포인트로 강조됩니다
            </p>
          </div>
        </div>

        {/* Category Attributes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              상세 정보
              <span className="text-xs text-muted-foreground">({category})</span>
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[#6b7280] hover:text-[#111111] hover:bg-[#f5f5f5]"
              onClick={() => setShowAddAttribute(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              항목 추가
            </Button>
          </div>

          {/* Add New Attribute */}
          {showAddAttribute && (
            <div className="flex gap-2 p-3 bg-[#f9fafb] rounded-lg border border-[#eeeeee]">
              <Input
                placeholder="새 항목명 입력 (예: 주차요금)"
                value={newAttributeName}
                onChange={(e) => setNewAttributeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAttribute()}
                className="h-9 bg-white border-[#eeeeee] focus:border-[#f72c5b] text-sm"
              />
              <Button
                size="sm"
                className="h-9 px-3 bg-[#f72c5b] hover:bg-[#e01f4f] text-white"
                onClick={handleAddAttribute}
              >
                추가
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2"
                onClick={() => {
                  setShowAddAttribute(false);
                  setNewAttributeName('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* 기본 속성들 (운영시간, 가격 제외) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {otherBaseAttrs.map(renderAttributeField)}
          </div>

          {/* 운영시간/휴무일 - 접기/펼치기 섹션 */}
          {operatingHoursAttrs.length > 0 && (
            <div className="border border-[#eeeeee] rounded-lg overflow-hidden">
              <div className="w-full flex items-center justify-between p-3 bg-[#f9fafb] hover:bg-[#f5f5f5] transition-colors group">
                {isEditingOperatingTitle ? (
                  <div className="flex items-center gap-2 flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={tempOperatingTitle}
                      onChange={(e) => setTempOperatingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (tempOperatingTitle.trim()) {
                            setAttributeLabel(OPERATING_HOURS_SECTION_TITLE_KEY, tempOperatingTitle.trim());
                          }
                          setIsEditingOperatingTitle(false);
                          setTempOperatingTitle('');
                        } else if (e.key === 'Escape') {
                          setIsEditingOperatingTitle(false);
                          setTempOperatingTitle('');
                        }
                      }}
                      className="h-7 text-sm py-0 px-2 w-40"
                      autoFocus
                    />
                    <button
                      className="p-1 hover:bg-[#03C75A]/10 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (tempOperatingTitle.trim()) {
                          setAttributeLabel(OPERATING_HOURS_SECTION_TITLE_KEY, tempOperatingTitle.trim());
                        }
                        setIsEditingOperatingTitle(false);
                        setTempOperatingTitle('');
                      }}
                    >
                      <Check className="w-4 h-4 text-[#03C75A]" />
                    </button>
                    <button
                      className="p-1 hover:bg-gray-100 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingOperatingTitle(false);
                        setTempOperatingTitle('');
                      }}
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <button
                    className="flex-1 flex items-center justify-start gap-2"
                    onClick={() => setIsOperatingHoursOpen(!isOperatingHoursOpen)}
                  >
                    <span className="text-sm font-medium text-[#6b7280]">
                      {attributeLabels[OPERATING_HOURS_SECTION_TITLE_KEY] || DEFAULT_OPERATING_HOURS_TITLE}
                    </span>
                    {!isOperatingHoursOpen && !hasOperatingHours && (
                      <span className="text-[10px] text-[#9ca3af] bg-[#f5f5f5] px-2 py-0.5 rounded-full">미입력</span>
                    )}
                    {!isOperatingHoursOpen && hasOperatingHours && (
                      <span className="text-[10px] text-[#03C75A] bg-[#03C75A]/10 px-2 py-0.5 rounded-full">입력됨</span>
                    )}
                  </button>
                )}
                <div className="flex items-center gap-1">
                  {!isEditingOperatingTitle && (
                    <button
                      className="p-1 hover:bg-[#f5f5f5] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempOperatingTitle(attributeLabels[OPERATING_HOURS_SECTION_TITLE_KEY] || DEFAULT_OPERATING_HOURS_TITLE);
                        setIsEditingOperatingTitle(true);
                      }}
                      title="섹션명 수정"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#111111]" />
                    </button>
                  )}
                  <button
                    className="p-1"
                    onClick={() => setIsOperatingHoursOpen(!isOperatingHoursOpen)}
                  >
                    {isOperatingHoursOpen ? (
                      <ChevronDown className="w-4 h-4 text-[#6b7280]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#6b7280]" />
                    )}
                  </button>
                </div>
              </div>
              {isOperatingHoursOpen && (
                <div className="p-3 bg-white grid grid-cols-2 md:grid-cols-4 gap-3">
                  {operatingHoursAttrs.map(renderAttributeField)}
                </div>
              )}
            </div>
          )}

          {/* 가격 - 텍스트 자유 입력 */}
          {hasPriceAttr && (
            <div className="border border-[#eeeeee] rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-3 bg-[#f9fafb] hover:bg-[#f5f5f5] transition-colors"
                onClick={() => setIsPriceOpen(!isPriceOpen)}
              >
                <span className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
                  가격 정보
                  {!isPriceOpen && !hasPriceValue && (
                    <span className="text-[10px] text-[#9ca3af] bg-[#f5f5f5] px-2 py-0.5 rounded-full">미입력</span>
                  )}
                  {!isPriceOpen && hasPriceValue && (
                    <span className="text-[10px] text-[#03C75A] bg-[#03C75A]/10 px-2 py-0.5 rounded-full">입력됨</span>
                  )}
                </span>
                {isPriceOpen ? (
                  <ChevronDown className="w-4 h-4 text-[#6b7280]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#6b7280]" />
                )}
              </button>
              {isPriceOpen && (
                <div className="p-3 bg-white space-y-2">
                  <Textarea
                    placeholder={`자유롭게 입력하세요. AI가 자동으로 정리합니다.\n\n예시:\n1개월 15만원\n3개월 39만원\n6개월 69만원\nPT 10회 50만원\n그룹수업 월 8만원\nvat 별도`}
                    value={attributes[PRICE_ATTR] || ''}
                    onChange={(e) => setAttribute(PRICE_ATTR, e.target.value)}
                    className="min-h-[120px] bg-white border-[#eeeeee] focus:border-[#f72c5b] text-sm resize-none"
                  />
                  <p className="text-[10px] text-[#9ca3af]">
                    상품명과 가격을 자유롭게 입력하면 AI가 블로그 글에 맞게 정리합니다
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 커스텀 속성들 */}
          {visibleCustomAttributes.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {visibleCustomAttributes.map(renderAttributeField)}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              className="h-10 px-6 text-[#f72c5b] border-[#f72c5b]/50 hover:bg-[#f72c5b]/10"
              onClick={() => saveBusinessInfo()}
            >
              <Save className="w-4 h-4 mr-2" />
              내 정보 저장하기
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button
            className="flex-1 h-12 text-base font-semibold bg-[#111111] text-white hover:bg-[#333333] transition-all duration-300 shadow-lg"
            onClick={handleNext}
          >
            다음 단계 (자동 저장)
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
