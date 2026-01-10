import {
  saveUserPostToSupabase,
  searchSimilarUserPosts,
  getRecentUserPostsFromSupabase,
  getUserPostCountFromSupabase,
  isSupabaseConfigured
} from './supabase';
import { getRecentPosts } from './post-service';
import { POST_TYPE_INFO, PostType } from '@/types/post';

// 임베딩 생성 (OpenAI API 사용)
export async function generateEmbedding(
  text: string,
  apiKey: string,
  provider: 'openai' | 'gemini' = 'openai'
): Promise<number[] | null> {
  try {
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text.slice(0, 8000), // 토큰 제한
        }),
      });

      const data = await response.json();
      if (data.error) {
        console.error('OpenAI embedding error:', data.error);
        return null;
      }

      return data.data?.[0]?.embedding || null;
    } else {
      // Gemini embedding (text-embedding-004)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: {
              parts: [{ text: text.slice(0, 8000) }],
            },
          }),
        }
      );

      const data = await response.json();
      if (data.error) {
        console.error('Gemini embedding error:', data.error);
        return null;
      }

      return data.embedding?.values || null;
    }
  } catch (error) {
    console.error('Embedding generation error:', error);
    return null;
  }
}

// 글 저장 시 임베딩 생성 및 Supabase 저장
export async function savePostWithEmbedding(
  postId: string,
  userId: string,
  title: string,
  content: string,
  postType: string,
  category: string,
  apiKey: string,
  apiProvider: 'openai' | 'gemini'
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, skipping embedding storage');
    return;
  }

  try {
    // 제목 + 본문 앞부분으로 임베딩 생성
    const textForEmbedding = `${title}\n\n${content.slice(0, 2000)}`;
    const embedding = await generateEmbedding(textForEmbedding, apiKey, apiProvider);

    // provider에 따라 다른 테이블에 저장 (차원 호환성)
    await saveUserPostToSupabase({
      id: postId,
      user_id: userId,
      title,
      content: content.slice(0, 5000), // 저장 시 내용 제한
      post_type: postType,
      category,
      embedding: embedding || undefined,
    }, apiProvider);

    console.log(`Post saved with embedding to Supabase (${apiProvider})`);
  } catch (error) {
    console.error('Failed to save post with embedding:', error);
  }
}

// RAG 컨텍스트 생성 (Supabase 전용 - 모든 글에서 검색)
export async function generateRagContext(
  userId: string,
  currentKeyword: string,
  currentCategory: string,
  apiKey: string,
  apiProvider: 'openai' | 'gemini'
): Promise<string> {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, falling back to simple RAG');
    return generateSimpleRagContext(userId);
  }

  const contexts: string[] = [];

  // 저장된 글 개수 확인
  const postCount = await getUserPostCountFromSupabase(userId, apiProvider);
  console.log(`User has ${postCount} posts in Supabase`);

  // 1. Supabase에서 최근 글 3개 가져오기 (스타일 일관성용)
  try {
    const recentPosts = await getRecentUserPostsFromSupabase(userId, 3, apiProvider);
    if (recentPosts.length > 0) {
      const recentContext = recentPosts.map((post, idx) => {
        const contentPreview = post.content.slice(0, 400);
        const postTypeName = POST_TYPE_INFO[post.post_type as PostType]?.name || post.post_type;
        return `[최근 작성 글 ${idx + 1}] ${post.title}
유형: ${postTypeName} | 카테고리: ${post.category}
---
${contentPreview}...`;
      }).join('\n\n');

      contexts.push(`### 최근 작성한 글 (스타일 참고)\n\n${recentContext}`);
    }
  } catch (error) {
    console.error('Failed to get recent posts from Supabase:', error);
  }

  // 2. Supabase에서 유사 글 검색 (벡터 검색 - 모든 글에서)
  try {
    const queryText = `${currentKeyword} ${currentCategory}`;
    const queryEmbedding = await generateEmbedding(queryText, apiKey, apiProvider);

    if (queryEmbedding) {
      // 유사 글 5개까지 검색 (낮은 threshold로 더 많은 결과)
      const similarPosts = await searchSimilarUserPosts(userId, queryEmbedding, 5, 0.4, apiProvider);

      if (similarPosts.length > 0) {
        const similarContext = similarPosts.map((post, idx) => {
          const contentPreview = post.content.slice(0, 400);
          return `[유사 글 ${idx + 1}] ${post.title}
유사도: ${(post.similarity * 100).toFixed(1)}%
---
${contentPreview}...`;
        }).join('\n\n');

        contexts.push(`### 유사한 기존 글 (총 ${postCount}개 글 중 검색)\n\n${similarContext}`);
      }
    }
  } catch (error) {
    console.error('Failed to search similar posts:', error);
  }

  if (contexts.length === 0) {
    return '';
  }

  return `## 이전에 작성한 글 참고 (AI 학습 - 총 ${postCount}개 글 누적)

${contexts.join('\n\n---\n\n')}

위 글들의 어조, 문체, 구성을 참고하여 일관성 있게 작성해주세요.
단, 내용을 그대로 복사하지 말고 새로운 글을 작성하세요.`;
}

// 간단한 RAG 컨텍스트 (Firebase만 사용, API 키 불필요)
export async function generateSimpleRagContext(userId: string): Promise<string> {
  try {
    const recentPosts = await getRecentPosts(userId, 3);

    if (recentPosts.length === 0) {
      return '';
    }

    const context = recentPosts.map((post, idx) => {
      const contentPreview = post.content.slice(0, 500);
      return `[참고 글 ${idx + 1}] ${post.title || post.mainKeyword}
카테고리: ${post.category} | 유형: ${POST_TYPE_INFO[post.postType]?.name || post.postType}
---
${contentPreview}...`;
    }).join('\n\n');

    return `## 이전에 작성한 글 참고 (스타일 일관성 유지)

${context}

위 글들의 어조와 스타일을 참고하여 일관성 있게 작성해주세요.`;
  } catch (error) {
    console.error('Failed to generate simple RAG context:', error);
    return '';
  }
}
