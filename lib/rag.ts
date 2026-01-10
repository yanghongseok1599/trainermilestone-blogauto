import { supabase } from './supabase';
import OpenAI from 'openai';

// Create embedding using OpenAI
export async function createEmbedding(text: string, apiKey: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey });

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // Limit to avoid token limit
  });

  return response.data[0].embedding;
}

// Store blog content with embedding
export async function storeBlogVector(
  keyword: string,
  title: string,
  content: string,
  url: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase가 설정되지 않았습니다.' };
    }

    // Create embedding from title + content
    const textToEmbed = `${title}\n\n${content}`.slice(0, 8000);
    const embedding = await createEmbedding(textToEmbed, apiKey);

    const { error } = await supabase.from('blog_vectors').insert({
      keyword,
      title,
      content: content.slice(0, 10000), // Limit content size
      url,
      embedding,
      metadata: {
        source: 'naver_blog',
        crawled_at: new Date().toISOString(),
        word_count: content.length,
      },
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error storing blog vector:', error);
    return { success: false, error: String(error) };
  }
}

// Search similar blog content
export async function searchSimilarBlogs(
  query: string,
  apiKey: string,
  options: {
    keyword?: string;
    matchCount?: number;
    matchThreshold?: number;
  } = {}
): Promise<{
  results: Array<{
    id: string;
    keyword: string;
    title: string;
    content: string;
    url: string;
    similarity: number;
  }>;
  error?: string;
}> {
  try {
    if (!supabase) {
      return { results: [], error: 'Supabase가 설정되지 않았습니다.' };
    }

    const { keyword, matchCount = 5, matchThreshold = 0.7 } = options;

    // Create embedding for the query
    const queryEmbedding = await createEmbedding(query, apiKey);

    // Search using the match function
    const { data, error } = await supabase.rpc('match_blog_vectors', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_keyword: keyword || null,
    });

    if (error) throw error;

    return { results: data || [] };
  } catch (error) {
    console.error('Error searching similar blogs:', error);
    return { results: [], error: String(error) };
  }
}

// Build RAG context from similar blogs
export function buildRAGContext(
  similarBlogs: Array<{
    title: string;
    content: string;
    similarity: number;
  }>
): string {
  if (similarBlogs.length === 0) {
    return '';
  }

  const context = similarBlogs
    .map((blog, index) => {
      // Truncate content for context
      const truncatedContent = blog.content.slice(0, 1500);
      return `[참고 글 ${index + 1}] (유사도: ${(blog.similarity * 100).toFixed(1)}%)
제목: ${blog.title}
내용 요약: ${truncatedContent}...`;
    })
    .join('\n\n---\n\n');

  return `
다음은 상위노출된 블로그 글들의 참고 자료입니다. 이 글들의 패턴(제목 구조, 키워드 배치, 문체, 구성)을 분석하여 새로운 글을 작성할 때 참고하세요:

${context}

위 참고 자료의 패턴을 분석하여:
1. 제목 스타일 (키워드 위치, 후킹 포인트)
2. 본문 구성 (서론-본론-결론 패턴)
3. 키워드 배치 빈도
4. 독자 공감 요소
를 반영하여 새로운 글을 작성해주세요.
`;
}

// Get vector count for a keyword
export async function getVectorCount(keyword?: string): Promise<number> {
  try {
    if (!supabase) {
      return 0;
    }

    let query = supabase.from('blog_vectors').select('id', { count: 'exact', head: true });

    if (keyword) {
      query = query.ilike('keyword', `%${keyword}%`);
    }

    const { count, error } = await query;

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting vector count:', error);
    return 0;
  }
}
