import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { keywords } = await request.json();

    // Generate related keywords based on common search patterns
    const suffixes = ['가격', '추천', '후기', '비용', '위치', '영업시간', '이벤트', '체험'];

    const results = keywords.map((kw: string) => ({
      keyword: kw,
      relatedKeywords: suffixes.map(s => `${kw} ${s}`).slice(0, 5)
    }));

    return NextResponse.json({ results });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
