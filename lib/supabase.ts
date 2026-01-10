import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Supabase 환경변수가 없으면 null 반환 (빌드 에러 방지)
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Supabase가 설정되어 있는지 확인
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey);
};

// Database types for vector storage
export interface BlogVector {
  id: string;
  keyword: string;
  title: string;
  content: string;
  url: string;
  embedding: number[];
  metadata: {
    source: string;
    crawled_at: string;
    word_count: number;
  };
  created_at: string;
}

// 사용자 글 저장용 타입
export interface SupabaseUserPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  post_type: string;
  category: string;
  embedding?: number[];
  created_at?: string;
}

// Supabase에 사용자 글 저장 (provider에 따라 다른 테이블 사용)
export async function saveUserPostToSupabase(
  post: Omit<SupabaseUserPost, 'created_at'>,
  provider: 'openai' | 'gemini' = 'openai'
): Promise<void> {
  if (!supabase) {
    console.log('Supabase not configured, skipping vector storage');
    return;
  }

  // OpenAI: 1536차원, Gemini: 768차원 - 다른 테이블 사용
  const tableName = provider === 'gemini' ? 'user_posts_gemini' : 'user_posts';

  try {
    const { error } = await supabase
      .from(tableName)
      .upsert({
        id: post.id,
        user_id: post.user_id,
        title: post.title,
        content: post.content,
        post_type: post.post_type,
        category: post.category,
        embedding: post.embedding,
        embedding_model: provider,
      });

    if (error) {
      console.error('Supabase save error:', error);
      throw error;
    }

    console.log(`Post saved to Supabase (${tableName})`);
  } catch (error) {
    console.error('Failed to save to Supabase:', error);
  }
}

// 유사 글 검색 (벡터 검색) - provider에 따라 다른 RPC 함수 사용
export async function searchSimilarUserPosts(
  userId: string,
  queryEmbedding: number[],
  matchCount: number = 5,
  threshold: number = 0.5,
  provider: 'openai' | 'gemini' = 'openai'
): Promise<{ id: string; content: string; title: string; similarity: number }[]> {
  if (!supabase) {
    console.log('Supabase not configured, skipping vector search');
    return [];
  }

  // OpenAI: match_user_posts, Gemini: match_user_posts_gemini
  const rpcFunction = provider === 'gemini' ? 'match_user_posts_gemini' : 'match_user_posts';

  try {
    const { data, error } = await supabase.rpc(rpcFunction, {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_threshold: threshold,
      match_count: matchCount,
    });

    if (error) {
      console.error('Supabase search error:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} similar posts from Supabase (${rpcFunction})`);
    return data || [];
  } catch (error) {
    console.error('Failed to search Supabase:', error);
    return [];
  }
}

// 최근 글 조회 (Supabase에서) - provider에 따라 다른 테이블 사용
export async function getRecentUserPostsFromSupabase(
  userId: string,
  matchCount: number = 3,
  provider: 'openai' | 'gemini' = 'openai'
): Promise<{ id: string; title: string; content: string; post_type: string; category: string }[]> {
  if (!supabase) {
    console.log('Supabase not configured, skipping recent posts fetch');
    return [];
  }

  // OpenAI: get_recent_user_posts, Gemini: get_recent_user_posts_gemini
  const rpcFunction = provider === 'gemini' ? 'get_recent_user_posts_gemini' : 'get_recent_user_posts';

  try {
    const { data, error } = await supabase.rpc(rpcFunction, {
      match_user_id: userId,
      match_count: matchCount,
    });

    if (error) {
      console.error('Supabase recent posts error:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} recent posts from Supabase`);
    return data || [];
  } catch (error) {
    console.error('Failed to get recent posts from Supabase:', error);
    return [];
  }
}

// Supabase에 저장된 글 개수 조회
export async function getUserPostCountFromSupabase(
  userId: string,
  provider: 'openai' | 'gemini' = 'openai'
): Promise<number> {
  if (!supabase) {
    return 0;
  }

  const tableName = provider === 'gemini' ? 'user_posts_gemini' : 'user_posts';

  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase count error:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Failed to get post count from Supabase:', error);
    return 0;
  }
}

// Supabase 테이블 생성 SQL (참고용 - Supabase SQL Editor에서 실행)
export const SUPABASE_USER_POSTS_SQL = `
-- Enable the pgvector extension
create extension if not exists vector;

-- Create user_posts table with vector column
create table if not exists user_posts (
  id uuid primary key,
  user_id text not null,
  title text,
  content text,
  post_type text,
  category text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Create index for user_id
create index if not exists user_posts_user_id_idx on user_posts(user_id);

-- Create index for faster similarity search
create index if not exists user_posts_embedding_idx on user_posts
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create function for similarity search
create or replace function match_user_posts(
  query_embedding vector(1536),
  match_user_id text,
  match_threshold float default 0.7,
  match_count int default 3
)
returns table (id uuid, title text, content text, similarity float)
language sql stable
as $$
  select
    id,
    title,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from user_posts
  where user_id = match_user_id
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
`;
