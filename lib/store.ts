import { create } from 'zustand';
import { AppState, FitnessCategory, ApiProvider, ImageData, ImageAnalysisResult, SearchIntent, LearningResult } from '@/types';

const initialState = {
  currentStep: 0,
  apiProvider: 'gemini' as ApiProvider,
  category: '헬스장' as FitnessCategory,
  businessName: '',
  mainKeyword: '',
  subKeywords: ['', '', ''],
  tailKeywords: ['', '', ''],
  targetAudience: '',
  uniquePoint: '',
  attributes: {} as Record<string, string>,
  customCategoryName: '',
  customAttributes: [] as string[],
  attributeLabels: {} as Record<string, string>, // 라벨 수정용
  hiddenAttributes: [] as string[], // 삭제(숨김) 처리된 기본 속성
  images: [] as ImageData[],
  imageAnalysisContext: '',
  generatedContent: '',
  extractedImagePrompts: [] as { korean: string; english: string }[],
  searchIntent: 'location' as SearchIntent,
  contentType: 'center_intro' as AppState['contentType'],
  writerPersona: '',
  targetReader: '',
  customTitle: '',
  liteMode: true, // 기본값: 라이트 모드 (무료 API용)
  // PRO 기능: 상위노출 블로그 학습
  topBlogsLearning: null as LearningResult | null,
  isLearningTopBlogs: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  setCurrentStep: (step) => set({ currentStep: step }),

  setApiProvider: (provider) => set({ apiProvider: provider }),
  setCategory: (category) => set({ category, attributes: {}, ...(category !== '기타' && { customCategoryName: '' }) }),
  setCustomCategoryName: (name) => set({ customCategoryName: name }),

  setBusinessInfo: (info) => set((state) => ({ ...state, ...info })),
  setMainKeyword: (keyword) => set({ mainKeyword: keyword }),
  setSubKeywords: (keywords) => set({ subKeywords: keywords }),
  setTailKeywords: (keywords) => set({ tailKeywords: keywords }),
  setAttribute: (key, value) => set((state) => ({
    attributes: { ...state.attributes, [key]: value }
  })),
  setAttributes: (attrs) => set({ attributes: attrs }),
  // Set place info from Naver search (category + business info + attributes in one call)
  setPlaceInfo: (info: { category?: FitnessCategory; businessName?: string; mainKeyword?: string; attributes?: Record<string, string> }) =>
    set((state) => ({
      ...(info.category && { category: info.category }),
      ...(info.businessName && { businessName: info.businessName }),
      ...(info.mainKeyword && { mainKeyword: info.mainKeyword }),
      attributes: { ...state.attributes, ...(info.attributes || {}) }
    })),
  deleteAttribute: (key) => set((state) => {
    const newAttributes = { ...state.attributes };
    delete newAttributes[key];
    return { attributes: newAttributes };
  }),
  addCustomAttribute: (key) => set((state) => ({
    customAttributes: state.customAttributes.includes(key)
      ? state.customAttributes
      : [...state.customAttributes, key]
  })),
  removeCustomAttribute: (key) => set((state) => {
    const newAttributes = { ...state.attributes };
    delete newAttributes[key];
    return {
      customAttributes: state.customAttributes.filter((attr) => attr !== key),
      attributes: newAttributes
    };
  }),
  setCustomAttributes: (attrs) => set({ customAttributes: attrs }),

  // 라벨 수정 기능
  setAttributeLabel: (key, label) => set((state) => ({
    attributeLabels: { ...state.attributeLabels, [key]: label }
  })),
  // 기본 속성 숨김 기능
  hideAttribute: (key) => set((state) => ({
    hiddenAttributes: state.hiddenAttributes.includes(key)
      ? state.hiddenAttributes
      : [...state.hiddenAttributes, key]
  })),
  showAttribute: (key) => set((state) => ({
    hiddenAttributes: state.hiddenAttributes.filter((attr) => attr !== key)
  })),
  setHiddenAttributes: (attrs) => set({ hiddenAttributes: attrs }),
  setAttributeLabels: (labels) => set({ attributeLabels: labels }),

  addImage: (image) => set((state) => ({
    images: [...state.images, image]
  })),
  removeImage: (id) => set((state) => ({
    images: state.images.filter((img) => img.id !== id)
  })),
  updateImageAnalysis: (id, analysis, analysisJson?) => set((state) => ({
    images: state.images.map((img) =>
      img.id === id ? { ...img, analysis, ...(analysisJson && { analysisJson }) } : img
    )
  })),
  setImageAnalysisContext: (context) => set({ imageAnalysisContext: context }),

  setGeneratedContent: (content) => set({ generatedContent: content }),

  setExtractedImagePrompts: (prompts) => set({ extractedImagePrompts: prompts }),

  setSearchIntent: (intent) => set({ searchIntent: intent }),
  setContentType: (type) => set({ contentType: type }),

  setWriterPersona: (persona) => set({ writerPersona: persona }),
  setTargetReader: (target) => set({ targetReader: target }),

  setCustomTitle: (title) => set({ customTitle: title }),

  setLiteMode: (mode) => set({ liteMode: mode }),

  // PRO 기능: 상위노출 블로그 학습
  setTopBlogsLearning: (result) => set({ topBlogsLearning: result }),
  setIsLearningTopBlogs: (isLearning) => set({ isLearningTopBlogs: isLearning }),
  clearTopBlogsLearning: () => set({ topBlogsLearning: null, isLearningTopBlogs: false }),

  reset: () => set(initialState),
}));
