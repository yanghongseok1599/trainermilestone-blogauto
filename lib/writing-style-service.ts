import { createSupabaseBrowserClient } from './supabase-client';

const supabase = createSupabaseBrowserClient();

export interface WritingSample {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface WritingStyleProfile {
  user_id: string;
  style_summary: string;
  sample_count: number;
  updated_at: string;
}

// 글 샘플 저장
export async function saveWritingSample(
  userId: string,
  title: string,
  content: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('writing_samples')
      .insert({ user_id: userId, title, content })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to save writing sample:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Failed to save writing sample:', error);
    return { success: false, error: '저장 중 오류가 발생했습니다.' };
  }
}

// 글 샘플 목록 조회
export async function getWritingSamples(userId: string): Promise<WritingSample[]> {
  try {
    const { data, error } = await supabase
      .from('writing_samples')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as WritingSample[];
  } catch {
    return [];
  }
}

// 글 샘플 삭제
export async function deleteWritingSample(userId: string, sampleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('writing_samples')
      .delete()
      .eq('id', sampleId)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}

// 문체 프로필 조회
export async function getWritingStyleProfile(userId: string): Promise<WritingStyleProfile | null> {
  try {
    const { data, error } = await supabase
      .from('writing_style_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return data as WritingStyleProfile;
  } catch {
    return null;
  }
}

// 문체 프로필 저장/업데이트
export async function upsertWritingStyleProfile(
  userId: string,
  styleSummary: string,
  sampleCount: number
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('writing_style_profiles')
      .upsert({
        user_id: userId,
        style_summary: styleSummary,
        sample_count: sampleCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    return !error;
  } catch {
    return false;
  }
}
