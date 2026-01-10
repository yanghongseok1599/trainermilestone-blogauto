import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarBlogs, buildRAGContext, getVectorCount } from '@/lib/rag';

export async function POST(request: NextRequest) {
  try {
    const { query, keyword, apiKey, matchCount = 5 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: '검색 쿼리가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API 키가 필요합니다.' },
        { status: 400 }
      );
    }

    // Get total vector count
    const totalCount = await getVectorCount();
    const keywordCount = keyword ? await getVectorCount(keyword) : totalCount;

    // Search similar blogs
    const { results, error } = await searchSimilarBlogs(query, apiKey, {
      keyword,
      matchCount,
      matchThreshold: 0.5, // Lower threshold for more results
    });

    if (error) {
      return NextResponse.json(
        { error: `검색 오류: ${error}` },
        { status: 500 }
      );
    }

    // Build RAG context
    const ragContext = buildRAGContext(results);

    return NextResponse.json({
      success: true,
      results,
      ragContext,
      stats: {
        totalVectors: totalCount,
        keywordVectors: keywordCount,
        matchedCount: results.length,
      },
    });
  } catch (error) {
    console.error('RAG search error:', error);
    return NextResponse.json(
      { error: '검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET endpoint for stats
export async function GET() {
  try {
    const totalCount = await getVectorCount();

    return NextResponse.json({
      success: true,
      totalVectors: totalCount,
    });
  } catch (error) {
    console.error('RAG stats error:', error);
    return NextResponse.json(
      { error: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
