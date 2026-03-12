import { createSupabaseBrowserClient } from './supabase-client';
import { SavedPost, PostType, SeoSchedule, SeoScheduleItem, POST_TYPE_INFO } from '@/types/post';
import { FitnessCategory, SearchIntent } from '@/types';

const supabase = createSupabaseBrowserClient();

// 글 저장 입력 타입
export interface SavePostInput {
  title: string;
  content: string;
  category: FitnessCategory;
  postType: PostType;
  searchIntent: SearchIntent;
  mainKeyword: string;
  businessName: string;
  imagePrompts: { korean: string; english: string }[];
}

// 글 저장
export async function savePost(userId: string, post: SavePostInput): Promise<string> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      title: post.title,
      content: post.content,
      category: post.category,
      post_type: post.postType,
      search_intent: post.searchIntent,
      main_keyword: post.mainKeyword,
      business_name: post.businessName,
      image_prompts: post.imagePrompts,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(`글 저장 실패: ${error?.message}`);

  // SEO 스케줄 업데이트
  await updateSeoSchedule(userId, post.postType);

  return data.id;
}

// 글 조회 (단일)
export async function getPost(userId: string, postId: string): Promise<SavedPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  return mapPostRow(data);
}

// 글 목록 조회
export async function getPosts(
  userId: string,
  options?: {
    postType?: PostType;
    limit?: number;
  }
): Promise<SavedPost[]> {
  let query = supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId);

  if (options?.postType) {
    query = query.eq('post_type', options.postType);
  }

  query = query.order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return data.map(mapPostRow);
}

// 최근 글 조회 (RAG용)
export async function getRecentPosts(userId: string, count: number = 3): Promise<SavedPost[]> {
  return getPosts(userId, { limit: count });
}

// 글 삭제
export async function deletePost(userId: string, postId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);

  if (error) throw new Error(`글 삭제 실패: ${error.message}`);
}

// 글 수정
export async function updatePost(
  userId: string,
  postId: string,
  updates: Partial<SavePostInput>
): Promise<void> {
  // snake_case 변환
  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.content !== undefined) updateData.content = updates.content;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.postType !== undefined) updateData.post_type = updates.postType;
  if (updates.searchIntent !== undefined) updateData.search_intent = updates.searchIntent;
  if (updates.mainKeyword !== undefined) updateData.main_keyword = updates.mainKeyword;
  if (updates.businessName !== undefined) updateData.business_name = updates.businessName;
  if (updates.imagePrompts !== undefined) updateData.image_prompts = updates.imagePrompts;

  const { error } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', postId)
    .eq('user_id', userId);

  if (error) throw new Error(`글 수정 실패: ${error.message}`);
}

// SEO 스케줄 조회
export async function getSeoSchedule(userId: string): Promise<SeoSchedule | null> {
  const { data, error } = await supabase
    .from('seo_schedules')
    .select('*')
    .eq('user_id', userId);

  if (error || !data || data.length === 0) return getDefaultSeoSchedule();

  const schedule: SeoSchedule = getDefaultSeoSchedule();

  for (const row of data) {
    const postType = row.post_type as PostType;
    if (postType in schedule) {
      schedule[postType] = {
        lastPublished: row.last_published ? new Date(row.last_published) : null,
        nextDue: row.next_due ? new Date(row.next_due) : null,
      };
    }
  }

  return schedule;
}

// 기본 SEO 스케줄
function getDefaultSeoSchedule(): SeoSchedule {
  return {
    center_intro: { lastPublished: null, nextDue: null },
    equipment: { lastPublished: null, nextDue: null },
    program: { lastPublished: null, nextDue: null },
    trainer: { lastPublished: null, nextDue: null },
    review: { lastPublished: null, nextDue: null },
  };
}

// SEO 스케줄 업데이트
export async function updateSeoSchedule(userId: string, postType: PostType): Promise<void> {
  const now = new Date();
  const cycleDays = POST_TYPE_INFO[postType].cycleDays;
  const nextDue = new Date(now);
  nextDue.setDate(nextDue.getDate() + cycleDays);

  const { error } = await supabase
    .from('seo_schedules')
    .upsert({
      user_id: userId,
      post_type: postType,
      last_published: now.toISOString(),
      next_due: nextDue.toISOString(),
    }, { onConflict: 'user_id,post_type' });

  if (error) console.error('SEO 스케줄 업데이트 실패:', error);
}

// 글 통계 조회
export async function getPostStats(userId: string): Promise<{
  totalPosts: number;
  thisMonthPosts: number;
  postsByType: Record<PostType, number>;
}> {
  const posts = await getPosts(userId);
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const postsByType: Record<PostType, number> = {
    center_intro: 0,
    equipment: 0,
    program: 0,
    trainer: 0,
    review: 0,
  };

  let thisMonthPosts = 0;

  posts.forEach((post) => {
    postsByType[post.postType]++;
    if (post.createdAt >= thisMonthStart) {
      thisMonthPosts++;
    }
  });

  return {
    totalPosts: posts.length,
    thisMonthPosts,
    postsByType,
  };
}

// RAG용 컨텍스트 생성
export async function generateRagContext(userId: string): Promise<string> {
  const recentPosts = await getRecentPosts(userId, 3);

  if (recentPosts.length === 0) return '';

  const context = recentPosts.map((post, idx) => {
    const contentPreview = post.content.slice(0, 500);
    return `[참고 글 ${idx + 1}] - ${post.title}
카테고리: ${post.category} | 글 유형: ${POST_TYPE_INFO[post.postType].name}
---
${contentPreview}...
---`;
  }).join('\n\n');

  return `## 이전에 작성한 글 참고 (스타일 일관성 유지)

${context}

위 글들의 어조와 스타일을 참고하여 일관성 있게 작성해주세요.`;
}

// Helper: DB row → SavedPost
function mapPostRow(row: Record<string, unknown>): SavedPost {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    category: row.category as FitnessCategory,
    postType: row.post_type as PostType,
    searchIntent: row.search_intent as SearchIntent,
    mainKeyword: (row.main_keyword as string) || '',
    businessName: (row.business_name as string) || '',
    imagePrompts: (row.image_prompts as { korean: string; english: string }[]) || [],
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}
