import { createSupabaseBrowserClient } from './supabase-client';
import { FitnessCategory } from '@/types';

const supabase = createSupabaseBrowserClient();

// Types
export interface BusinessInfo {
  category: FitnessCategory;
  businessName: string;
  mainKeyword: string;
  subKeywords: string[];
  tailKeywords: string[];
  targetAudience: string;
  uniquePoint: string;
  attributes: Record<string, string>;
  customAttributes: string[];
}

export interface Preset {
  id: string;
  name: string;
  category: FitnessCategory;
  businessName: string;
  mainKeyword: string;
  subKeywords: string[];
  tailKeywords?: string[];
  targetAudience: string;
  uniquePoint: string;
  attributes: Record<string, string>;
  customAttributes?: string[];
  hiddenAttributes?: string[];
  attributeLabels?: Record<string, string>;
  createdAt: Date;
  updatedAt?: Date;
}

// Save business info
export async function saveBusinessInfo(userId: string, data: BusinessInfo): Promise<void> {
  const { error } = await supabase
    .from('business_info')
    .upsert({
      user_id: userId,
      category: data.category,
      business_name: data.businessName,
      main_keyword: data.mainKeyword,
      sub_keywords: data.subKeywords,
      tail_keywords: data.tailKeywords,
      target_audience: data.targetAudience,
      unique_point: data.uniquePoint,
      attributes: data.attributes,
      custom_attributes: data.customAttributes,
    }, { onConflict: 'user_id' });

  if (error) throw new Error(`저장 실패: ${error.message}`);
}

// Load business info
export async function loadBusinessInfo(userId: string): Promise<BusinessInfo | null> {
  const { data, error } = await supabase
    .from('business_info')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  return {
    category: data.category || '헬스장',
    businessName: data.business_name || '',
    mainKeyword: data.main_keyword || '',
    subKeywords: data.sub_keywords || ['', '', ''],
    tailKeywords: data.tail_keywords || ['', '', ''],
    targetAudience: data.target_audience || '',
    uniquePoint: data.unique_point || '',
    attributes: data.attributes || {},
    customAttributes: data.custom_attributes || [],
  };
}

// Save preset
export async function savePreset(userId: string, preset: Omit<Preset, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const { data, error } = await supabase
    .from('presets')
    .insert({
      user_id: userId,
      name: preset.name,
      category: preset.category,
      business_name: preset.businessName,
      main_keyword: preset.mainKeyword,
      sub_keywords: preset.subKeywords,
      tail_keywords: preset.tailKeywords || [],
      target_audience: preset.targetAudience,
      unique_point: preset.uniquePoint,
      attributes: preset.attributes,
      custom_attributes: preset.customAttributes || [],
      hidden_attributes: preset.hiddenAttributes || [],
      attribute_labels: preset.attributeLabels || {},
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(`프리셋 저장 실패: ${error?.message}`);
  return data.id;
}

// Load all presets
export async function loadPresets(userId: string): Promise<Preset[]> {
  const { data, error } = await supabase
    .from('presets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    businessName: p.business_name,
    mainKeyword: p.main_keyword,
    subKeywords: p.sub_keywords || ['', '', ''],
    tailKeywords: p.tail_keywords || ['', '', ''],
    targetAudience: p.target_audience,
    uniquePoint: p.unique_point,
    attributes: p.attributes || {},
    customAttributes: p.custom_attributes || [],
    hiddenAttributes: p.hidden_attributes || [],
    attributeLabels: p.attribute_labels || {},
    createdAt: new Date(p.created_at),
    updatedAt: p.updated_at ? new Date(p.updated_at) : undefined,
  }));
}

// Delete preset
export async function deletePreset(userId: string, presetId: string): Promise<void> {
  const { error } = await supabase
    .from('presets')
    .delete()
    .eq('id', presetId)
    .eq('user_id', userId);

  if (error) throw new Error(`프리셋 삭제 실패: ${error.message}`);
}

// Save API settings
export async function saveApiSettings(userId: string, apiProvider: string, apiKey: string): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      api_provider: apiProvider,
      api_key: apiKey,
    }, { onConflict: 'user_id' });

  if (error) throw new Error(`API 설정 저장 실패: ${error.message}`);
}

// Load API settings
export async function loadApiSettings(userId: string): Promise<{ apiProvider: string; apiKey: string } | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('api_provider, api_key')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  return {
    apiProvider: data.api_provider || 'gemini',
    apiKey: data.api_key || '',
  };
}

// Save reference text
export async function saveReferenceText(userId: string, text: string): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      reference_text: text.slice(0, 10000),
    }, { onConflict: 'user_id' });

  if (error) throw new Error(`참고 글 저장 실패: ${error.message}`);
}

// Load reference text
export async function loadReferenceText(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('reference_text')
    .eq('user_id', userId)
    .single();

  if (error || !data) return '';
  return data.reference_text || '';
}
