-- Supabase Vector Database Schema for BlogBooster RAG
-- Run this in Supabase SQL Editor

-- Enable the pgvector extension
create extension if not exists vector;

-- Create the blog_vectors table
create table if not exists blog_vectors (
  id uuid default gen_random_uuid() primary key,
  keyword text not null,
  title text not null,
  content text not null,
  url text,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an index for faster vector similarity search
create index if not exists blog_vectors_embedding_idx
  on blog_vectors
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create an index for keyword search
create index if not exists blog_vectors_keyword_idx
  on blog_vectors (keyword);

-- Function to search similar blog content
create or replace function match_blog_vectors (
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5,
  filter_keyword text default null
)
returns table (
  id uuid,
  keyword text,
  title text,
  content text,
  url text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    blog_vectors.id,
    blog_vectors.keyword,
    blog_vectors.title,
    blog_vectors.content,
    blog_vectors.url,
    blog_vectors.metadata,
    1 - (blog_vectors.embedding <=> query_embedding) as similarity
  from blog_vectors
  where
    1 - (blog_vectors.embedding <=> query_embedding) > match_threshold
    and (filter_keyword is null or blog_vectors.keyword ilike '%' || filter_keyword || '%')
  order by blog_vectors.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Enable Row Level Security (optional, for production)
-- alter table blog_vectors enable row level security;

-- Create policy for public read access (adjust as needed)
-- create policy "Allow public read" on blog_vectors for select using (true);
-- create policy "Allow authenticated insert" on blog_vectors for insert with check (true);
