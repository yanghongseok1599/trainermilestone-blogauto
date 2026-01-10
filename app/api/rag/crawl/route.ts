import { NextRequest, NextResponse } from 'next/server';
import { storeBlogVector } from '@/lib/rag';

export async function POST(request: NextRequest) {
  try {
    const { keyword, blogs, apiKey } = await request.json();

    if (!keyword || !blogs || !Array.isArray(blogs)) {
      return NextResponse.json(
        { error: '키워드와 블로그 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const blog of blogs) {
      if (!blog.title || !blog.content) {
        errorCount++;
        continue;
      }

      const result = await storeBlogVector(
        keyword,
        blog.title,
        blog.content,
        blog.url || '',
        apiKey
      );

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      results.push({
        title: blog.title,
        success: result.success,
        error: result.error,
      });

      // Rate limiting - small delay between embeddings
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return NextResponse.json({
      success: true,
      message: `${successCount}개 저장 완료, ${errorCount}개 실패`,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error('RAG crawl error:', error);
    return NextResponse.json(
      { error: '크롤링 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
