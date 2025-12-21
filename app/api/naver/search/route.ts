import { NextRequest, NextResponse } from 'next/server';

const NAVER_CLIENT_ID = 'NEFXuvwLuzt101nnOdBQ';
const NAVER_CLIENT_SECRET = 'UgDqM_16Sb';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: '검색어를 입력해주세요' }, { status: 400 });
    }

    const response = await fetch(
      `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=comment`,
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
    const results = data.items?.map((item: {
      title: string;
      category: string;
      address: string;
      roadAddress: string;
      telephone: string;
      link: string;
    }) => ({
      title: item.title.replace(/<[^>]*>/g, ''), // Remove HTML tags
      category: item.category,
      address: item.address,
      roadAddress: item.roadAddress,
      telephone: item.telephone,
      link: item.link,
    })) || [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Naver search error:', error);
    return NextResponse.json({ error: '검색 중 오류가 발생했습니다' }, { status: 500 });
  }
}
