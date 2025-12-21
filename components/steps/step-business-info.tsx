'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { CATEGORIES, CATEGORY_ATTRIBUTES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Building2, Target, Lightbulb, ArrowRight, ArrowLeft, Wand2, Search, Loader2, MapPin, Plus, X, Save, Download, ChevronDown, ChevronRight, Pencil, Check, Trash2 } from 'lucide-react';

interface NaverPlaceResult {
  title: string;
  category: string;
  address: string;
  roadAddress: string;
  telephone: string;
  link: string;
}

interface SavedBusinessInfo {
  category: string;
  businessName: string;
  mainKeyword: string;
  subKeywords: string[];
  targetAudience: string;
  uniquePoint: string;
  attributes: Record<string, string>;
  customAttributes: string[];
  attributeLabels?: Record<string, string>;
  hiddenAttributes?: string[];
  savedAt: string;
}

// 운영시간/휴무일 그룹
const OPERATING_HOURS_ATTRS = ['평일 운영', '주말 운영', '공휴일 운영', '휴무일'];

// 가격 관련 속성 (별도 섹션으로 분리)
const PRICE_ATTR = '가격';

// 기본 가격 항목
const DEFAULT_PRICE_ITEMS = [
  { id: '1개월', label: '1개월' },
  { id: '3개월', label: '3개월' },
  { id: '6개월', label: '6개월' },
  { id: '12개월', label: '12개월' },
];

const STORAGE_KEY = 'blogbooster_saved_business_info';

export function StepBusinessInfo() {
  const {
    category,
    businessName,
    mainKeyword,
    subKeywords,
    targetAudience,
    uniquePoint,
    attributes,
    customAttributes,
    attributeLabels,
    hiddenAttributes,
    setCategory,
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

  const setCurrentStep = useAppStore((state) => state.setCurrentStep);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NaverPlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [showAddAttribute, setShowAddAttribute] = useState(false);
  const [hasSavedInfo, setHasSavedInfo] = useState(false);

  // 운영시간 섹션 열기/닫기
  const [isOperatingHoursOpen, setIsOperatingHoursOpen] = useState(false);
  // 가격 섹션 열기/닫기
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  // 가격 항목 추가
  const [newPriceItem, setNewPriceItem] = useState('');
  const [showAddPriceItem, setShowAddPriceItem] = useState(false);
  // 라벨 편집 모드
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');

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

  const saveBusinessInfo = () => {
    const infoToSave: SavedBusinessInfo = {
      category,
      businessName,
      mainKeyword,
      subKeywords,
      targetAudience,
      uniquePoint,
      attributes,
      customAttributes,
      attributeLabels,
      hiddenAttributes,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(infoToSave));
    setHasSavedInfo(true);
    toast.success('내 정보가 저장되었습니다');
  };

  const loadSavedInfo = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const info: SavedBusinessInfo = JSON.parse(saved);
      setCategory(info.category as typeof category);
      setBusinessInfo({
        businessName: info.businessName,
        mainKeyword: info.mainKeyword,
        subKeywords: info.subKeywords,
        targetAudience: info.targetAudience,
        uniquePoint: info.uniquePoint,
      });
      // Set attributes
      Object.entries(info.attributes).forEach(([key, value]) => {
        setAttribute(key, value);
      });
      // Set custom attributes
      if (info.customAttributes) {
        setCustomAttributes(info.customAttributes);
      }
      // Set attribute labels
      if (info.attributeLabels) {
        setAttributeLabels(info.attributeLabels);
      }
      // Set hidden attributes
      if (info.hiddenAttributes) {
        setHiddenAttributes(info.hiddenAttributes);
      }
      toast.success('저장된 정보를 불러왔습니다');
    }
  };

  const deleteSavedInfo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHasSavedInfo(false);
    toast.success('저장된 정보가 삭제되었습니다');
  };

  const handleNaverSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('검색어를 입력해주세요');
      return;
    }

    setIsSearching(true);
    setShowResults(false);

    try {
      const response = await fetch('/api/naver/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleSelectPlace = (place: NaverPlaceResult) => {
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

    // Build attributes to set
    const newAttributes: Record<string, string> = {};
    const address = place.roadAddress || place.address;
    if (address) {
      newAttributes['위치'] = address;
    }
    if (place.telephone && place.telephone.trim()) {
      newAttributes['전화번호'] = place.telephone;
    }

    // Set all place info at once to avoid timing issues
    setPlaceInfo({
      category: detectedCategory || undefined,
      businessName: place.title,
      mainKeyword: locationKeyword || mainKeyword,
      attributes: newAttributes,
    });

    setShowResults(false);
    setSearchQuery('');

    // Show what was loaded
    const loadedItems = ['업체명'];
    if (address) loadedItems.push('위치');
    if (place.telephone && place.telephone.trim()) {
      loadedItems.push('전화번호');
    }
    toast.success(`"${place.title}" 정보 불러옴 (${loadedItems.join(', ')})`);
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
    setCurrentStep(2);
  };

  const handleKeywordSuggest = async () => {
    if (!mainKeyword.trim()) {
      toast.error('먼저 메인 키워드를 입력해주세요');
      return;
    }

    try {
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: [mainKeyword] }),
      });
      const data = await response.json();

      if (data.results?.[0]?.relatedKeywords) {
        const related = data.results[0].relatedKeywords;
        setBusinessInfo({
          subKeywords: [related[0] || '', related[1] || '', related[2] || ''],
        });
        toast.success('키워드를 추천했습니다');
      }
    } catch {
      toast.error('키워드 추천 실패');
    }
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

  // 가격 항목 관리 (attributes에서 가격_ 접두사로 저장)
  const getPriceItems = () => {
    const items: { id: string; label: string; value: string }[] = [];
    // 기본 항목 추가
    DEFAULT_PRICE_ITEMS.forEach((item) => {
      const key = `가격_${item.id}`;
      items.push({
        id: item.id,
        label: attributeLabels[key] || item.label,
        value: attributes[key] || '',
      });
    });
    // 커스텀 가격 항목 추가
    Object.keys(attributes).forEach((key) => {
      if (key.startsWith('가격_') && !DEFAULT_PRICE_ITEMS.find((d) => `가격_${d.id}` === key)) {
        const id = key.replace('가격_', '');
        items.push({
          id,
          label: attributeLabels[key] || id,
          value: attributes[key] || '',
        });
      }
    });
    return items;
  };

  const priceItems = getPriceItems();

  // 가격 항목 추가
  const handleAddPriceItem = () => {
    if (!newPriceItem.trim()) {
      toast.error('상품명을 입력해주세요');
      return;
    }
    const key = `가격_${newPriceItem.trim()}`;
    if (attributes[key] !== undefined) {
      toast.error('이미 존재하는 상품입니다');
      return;
    }
    setAttribute(key, '');
    setNewPriceItem('');
    setShowAddPriceItem(false);
    toast.success(`"${newPriceItem.trim()}" 상품이 추가되었습니다`);
  };

  // 가격 항목 삭제
  const handleDeletePriceItem = (id: string) => {
    const key = `가격_${id}`;
    const newAttrs = { ...attributes };
    delete newAttrs[key];
    // Store의 setAttributes 사용
    Object.keys(newAttrs).forEach((k) => setAttribute(k, newAttrs[k]));
    // 해당 키 삭제는 deleteAttribute 없이 빈값으로 처리
    setAttribute(key, '');
    toast.success(`"${attributeLabels[key] || id}" 상품이 삭제되었습니다`);
  };

  // 라벨 가져오기 (커스텀 라벨이 있으면 사용, 없으면 기본)
  const getLabel = (attr: string) => attributeLabels[attr] || attr;

  // 라벨 편집 시작
  const startEditLabel = (attr: string) => {
    setEditingLabel(attr);
    setTempLabel(getLabel(attr));
  };

  // 라벨 편집 완료
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
                className="p-0.5 hover:bg-green-100 rounded"
                onClick={finishEditLabel}
              >
                <Check className="w-3 h-3 text-green-600" />
              </button>
            </div>
          ) : (
            <>
              <label className="text-xs font-medium text-[#6b7280] truncate flex-1">
                {label}
              </label>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  className="p-0.5 hover:bg-blue-100 rounded"
                  onClick={() => startEditLabel(attr)}
                  title="항목명 수정"
                >
                  <Pencil className="w-3 h-3 text-blue-500" />
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
          placeholder={`${label} 입력`}
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
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">업종 선택</Label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
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
                      <span className="text-xs text-[#9ca3af]">• {place.telephone}</span>
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

        {/* Sub Keywords */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">보조 키워드 (최대 3개)</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[#f72c5b] hover:text-[#f72c5b] hover:bg-[#f72c5b]/10"
              onClick={handleKeywordSuggest}
            >
              <Wand2 className="w-4 h-4 mr-1" />
              키워드 추천
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((idx) => (
              <Input
                key={idx}
                placeholder={`보조키워드 ${idx + 1}`}
                value={subKeywords[idx] || ''}
                onChange={(e) => {
                  const newKeywords = [...subKeywords];
                  newKeywords[idx] = e.target.value;
                  setBusinessInfo({ subKeywords: newKeywords });
                }}
                className="h-11 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
              />
            ))}
          </div>
        </div>

        {/* Target & Unique Point */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="flex items-center gap-1">
              <Target className="w-4 h-4 text-[#f72c5b]" />
              타겟 고객
            </Label>
            <Input
              id="targetAudience"
              placeholder="예: 20-30대 직장인 여성"
              value={targetAudience}
              onChange={(e) => setBusinessInfo({ targetAudience: e.target.value })}
              className="h-11 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uniquePoint" className="flex items-center gap-1">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              핵심 차별점
            </Label>
            <Input
              id="uniquePoint"
              placeholder="예: 1:1 맞춤 프로그램"
              value={uniquePoint}
              onChange={(e) => setBusinessInfo({ uniquePoint: e.target.value })}
              className="h-11 bg-white border-[#eeeeee] focus:border-[#f72c5b]"
            />
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

          {/* 기본 속성들 (운영시간 제외) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {otherBaseAttrs.map(renderAttributeField)}
          </div>

          {/* 운영시간/휴무일 - 열어보기 섹션 */}
          {operatingHoursAttrs.length > 0 && (
            <div className="border border-[#eeeeee] rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-3 bg-[#f9fafb] hover:bg-[#f5f5f5] transition-colors"
                onClick={() => setIsOperatingHoursOpen(!isOperatingHoursOpen)}
              >
                <span className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
                  운영시간 / 휴무일
                  <span className="text-xs text-[#9ca3af]">
                    ({operatingHoursAttrs.length}개 항목)
                  </span>
                </span>
                {isOperatingHoursOpen ? (
                  <ChevronDown className="w-4 h-4 text-[#6b7280]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#6b7280]" />
                )}
              </button>
              {isOperatingHoursOpen && (
                <div className="p-3 bg-white grid grid-cols-2 md:grid-cols-4 gap-3">
                  {operatingHoursAttrs.map(renderAttributeField)}
                </div>
              )}
            </div>
          )}

          {/* 가격 - 열어보기 섹션 (상품별/개월별) */}
          {hasPriceAttr && (
            <div className="border border-[#eeeeee] rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-3 bg-[#f9fafb] hover:bg-[#f5f5f5] transition-colors"
                onClick={() => setIsPriceOpen(!isPriceOpen)}
              >
                <span className="text-sm font-medium text-[#6b7280] flex items-center gap-2">
                  가격 (상품별/개월별)
                  <span className="text-xs text-[#9ca3af]">
                    ({priceItems.length}개 항목)
                  </span>
                </span>
                {isPriceOpen ? (
                  <ChevronDown className="w-4 h-4 text-[#6b7280]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#6b7280]" />
                )}
              </button>
              {isPriceOpen && (
                <div className="p-3 bg-white space-y-3">
                  {/* 가격 항목 목록 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {priceItems.map((item) => {
                      const key = `가격_${item.id}`;
                      const isEditing = editingLabel === key;
                      const isDefault = DEFAULT_PRICE_ITEMS.some((d) => d.id === item.id);

                      return (
                        <div key={item.id} className="space-y-1 relative group">
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
                                  className="p-0.5 hover:bg-green-100 rounded"
                                  onClick={finishEditLabel}
                                >
                                  <Check className="w-3 h-3 text-green-600" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <label className="text-xs font-medium text-[#6b7280] truncate flex-1">
                                  {item.label}
                                </label>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    className="p-0.5 hover:bg-blue-100 rounded"
                                    onClick={() => startEditLabel(key)}
                                    title="상품명 수정"
                                  >
                                    <Pencil className="w-3 h-3 text-blue-500" />
                                  </button>
                                  {!isDefault && (
                                    <button
                                      className="p-0.5 hover:bg-red-100 rounded"
                                      onClick={() => handleDeletePriceItem(item.id)}
                                      title="상품 삭제"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-500" />
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <Input
                            placeholder="예: 150,000원"
                            value={attributes[key] || ''}
                            onChange={(e) => setAttribute(key, e.target.value)}
                            className="h-10 bg-white border-[#eeeeee] focus:border-[#f72c5b] text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* 상품 추가 */}
                  {showAddPriceItem ? (
                    <div className="flex gap-2 p-3 bg-[#f9fafb] rounded-lg border border-[#eeeeee]">
                      <Input
                        placeholder="상품명 입력 (예: PT 10회, 개인레슨)"
                        value={newPriceItem}
                        onChange={(e) => setNewPriceItem(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPriceItem()}
                        className="h-9 bg-white border-[#eeeeee] focus:border-[#f72c5b] text-sm"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-9 px-3 bg-[#f72c5b] hover:bg-[#e01f4f] text-white"
                        onClick={handleAddPriceItem}
                      >
                        추가
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2"
                        onClick={() => {
                          setShowAddPriceItem(false);
                          setNewPriceItem('');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-[#6b7280] hover:text-[#111111] hover:bg-[#f5f5f5]"
                      onClick={() => setShowAddPriceItem(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      상품 추가
                    </Button>
                  )}
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

          {/* Save Button under detailed info */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              className="h-10 px-6 text-[#f72c5b] border-[#f72c5b]/50 hover:bg-[#f72c5b]/10"
              onClick={saveBusinessInfo}
            >
              <Save className="w-4 h-4 mr-2" />
              내 정보 저장하기
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="h-12 px-6 border-[#eeeeee] hover:bg-[#f5f5f5]"
            onClick={() => setCurrentStep(0)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            이전
          </Button>
          <Button
            className="flex-1 h-12 text-base font-semibold bg-[#111111] text-white hover:bg-[#333333] transition-all duration-300 shadow-lg"
            onClick={handleNext}
          >
            다음 단계
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
