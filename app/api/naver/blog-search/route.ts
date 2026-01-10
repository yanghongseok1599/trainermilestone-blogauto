import { NextRequest, NextResponse } from 'next/server';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || '';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || '';

export interface BlogItem {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  bloggerlink: string;
  postdate: string;
}

export async function POST(request: NextRequest) {
  try {
    const { query, display = 10, start = 1, sort = 'sim' } = await request.json();

    if (!query) {
      return NextResponse.json({ error: '검색어를 입력해주세요' }, { status: 400 });
    }

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      return NextResponse.json({ error: '네이버 API 키가 설정되지 않았습니다' }, { status: 500 });
    }

    const response = await fetch(
      `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=${sort}`,
      {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `네이버 API 오류: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();

    // Parse and clean up the results
    const results: BlogItem[] = data.items?.map((item: BlogItem) => ({
      title: item.title.replace(/<[^>]*>/g, ''), // Remove HTML tags
      link: item.link,
      description: item.description.replace(/<[^>]*>/g, ''), // Remove HTML tags
      bloggername: item.bloggername,
      bloggerlink: item.bloggerlink,
      postdate: item.postdate,
    })) || [];

    return NextResponse.json({
      total: data.total,
      start: data.start,
      display: data.display,
      results
    });
  } catch (error) {
    console.error('Naver blog search error:', error);
    return NextResponse.json({ error: '블로그 검색 중 오류가 발생했습니다' }, { status: 500 });
  }
}
