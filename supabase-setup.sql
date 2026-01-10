-- ============================================
-- BlogBooster Supabase 벡터 검색 설정 SQL
-- ============================================
--
-- 사용법:
-- 1. Supabase Dashboard (https://supabase.com/dashboard) 접속
-- 2. 프로젝트 선택 → SQL Editor 클릭
-- 3. 이 파일 전체 내용 복사하여 붙여넣기
-- 4. "Run" 버튼 클릭
--
-- 환경변수 설정 (.env.local):
-- NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
-- NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
--
-- ============================================

-- 1. pgvector 확장 활성화 (벡터 검색용)
create extension if not exists vector;

-- ============================================
-- OpenAI 전용 테이블 (text-embedding-ada-002: 1536차원)
-- ============================================
create table if not exists user_posts (
  id uuid primary key,
  user_id text not null,
  title text,
  content text,
  post_type text,
  category text,
  embedding vector(1536),
  embedding_model text default 'openai',
  created_at timestamptz default now()
);

-- user_id 인덱스 생성 (사용자별 조회 최적화)
create index if not exists user_posts_user_id_idx on user_posts(user_id);

-- 벡터 유사도 검색 인덱스 (IVFFlat)
create index if not exists user_posts_embedding_idx on user_posts
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- ============================================
-- Gemini 전용 테이블 (text-embedding-004: 768차원)
-- ============================================
create table if not exists user_posts_gemini (
  id uuid primary key,
  user_id text not null,
  title text,
  content text,
  post_type text,
  category text,
  embedding vector(768),
  embedding_model text default 'gemini',
  created_at timestamptz default now()
);

-- Gemini 테이블 인덱스
create index if not exists user_posts_gemini_user_id_idx on user_posts_gemini(user_id);

create index if not exists user_posts_gemini_embedding_idx on user_posts_gemini
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- ============================================
-- 유사 글 검색 함수 (OpenAI용: 1536차원)
-- ============================================
create or replace function match_user_posts(
  query_embedding vector(1536),
  match_user_id text,
  match_threshold float default 0.5,
  match_count int default 5
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
    and embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================
-- 유사 글 검색 함수 (Gemini용: 768차원)
-- ============================================
create or replace function match_user_posts_gemini(
  query_embedding vector(768),
  match_user_id text,
  match_threshold float default 0.5,
  match_count int default 5
)
returns table (id uuid, title text, content text, similarity float)
language sql stable
as $$
  select
    id,
    title,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from user_posts_gemini
  where user_id = match_user_id
    and embedding is not null
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================
-- 최근 글 조회 함수 (OpenAI)
-- ============================================
create or replace function get_recent_user_posts(
  match_user_id text,
  match_count int default 3
)
returns table (id uuid, title text, content text, post_type text, category text, created_at timestamptz)
language sql stable
as $$
  select id, title, content, post_type, category, created_at
  from user_posts
  where user_id = match_user_id
  order by created_at desc
  limit match_count;
$$;

-- ============================================
-- 최근 글 조회 함수 (Gemini)
-- ============================================
create or replace function get_recent_user_posts_gemini(
  match_user_id text,
  match_count int default 3
)
returns table (id uuid, title text, content text, post_type text, category text, created_at timestamptz)
language sql stable
as $$
  select id, title, content, post_type, category, created_at
  from user_posts_gemini
  where user_id = match_user_id
  order by created_at desc
  limit match_count;
$$;

-- ============================================
-- RLS (Row Level Security) 설정
-- ============================================
alter table user_posts enable row level security;
alter table user_posts_gemini enable row level security;

-- 모든 사용자 읽기/쓰기 허용 (Firebase Auth 사용하므로)
create policy "Allow all operations" on user_posts for all using (true) with check (true);
create policy "Allow all operations" on user_posts_gemini for all using (true) with check (true);

-- ============================================
-- 설정 완료!
-- ============================================
-- 테스트 쿼리:
-- select count(*) from user_posts;
-- select count(*) from user_posts_gemini;
-- ============================================
