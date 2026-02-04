import { NextRequest, NextResponse } from 'next/server';

interface PlaceDetail {
  name: string;
  category: string;
  roadAddress: string;
  fullAddress: string;
  phone: string;
  virtualPhone: string;
  menus: string[];
  businessHoursStatus: string;
  businessHoursDescription: string;
  dayOff: string | null;
  dayOffDescription: string | null;
  visitorReviewCount: string;
  bookingUrl: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: '검색어를 입력해주세요' }, { status: 400 });
    }

    // 네이버 모바일 검색에서 플레이스 상세 데이터 추출
    const searchUrl = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(query)}&where=m`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: '네이버 검색 오류' }, { status: response.status });
    }

    const html = await response.text();

    // HTML에서 플레이스 데이터 JSON 추출
    // 네이버 모바일 검색 결과에는 인라인 JSON으로 플레이스 데이터가 포함됨
    const placeDetails = extractPlaceDetails(html);

    if (!placeDetails || placeDetails.length === 0) {
      return NextResponse.json({ detail: null, message: '상세 정보를 찾을 수 없습니다' });
    }

    return NextResponse.json({ details: placeDetails });
  } catch (error) {
    console.error('Naver place detail error:', error);
    return NextResponse.json({ error: '상세 정보 조회 중 오류가 발생했습니다' }, { status: 500 });
  }
}

function extractPlaceDetails(html: string): PlaceDetail[] {
  const results: PlaceDetail[] = [];

  // 패턴: "id":"숫자" 로 시작하는 플레이스 데이터 블록 추출
  // 네이버 모바일 검색에서 플레이스 정보는 JSON 형태로 HTML 안에 포함됨
  const idPattern = /"id":"(\d{5,})","gdid"/g;
  let match;
  const placeIds: string[] = [];

  while ((match = idPattern.exec(html)) !== null) {
    if (!placeIds.includes(match[1])) {
      placeIds.push(match[1]);
    }
  }

  for (const placeId of placeIds) {
    try {
      const detail = extractSinglePlace(html, placeId);
      if (detail) {
        results.push(detail);
      }
    } catch {
      // 개별 파싱 실패는 무시
    }
  }

  return results;
}

function extractSinglePlace(html: string, placeId: string): PlaceDetail | null {
  // 해당 placeId부터 시작하는 데이터 블록 찾기
  const startIdx = html.indexOf(`"id":"${placeId}","gdid"`);
  if (startIdx === -1) return null;

  // 충분한 범위의 텍스트 추출 (플레이스 데이터는 보통 2000~4000자)
  const chunk = html.substring(startIdx, startIdx + 5000);

  const getString = (key: string): string => {
    // "key":"value" 또는 "key":null 패턴 매칭
    const regex = new RegExp(`"${key}"\\s*:\\s*(?:"([^"]*?)"|null)`);
    const m = chunk.match(regex);
    return m ? (m[1] || '') : '';
  };

  const name = getString('normalizedName') || getString('name');
  if (!name) return null;

  // menus 배열 추출: "menus":["item1","item2",...]
  let menus: string[] = [];
  const menusMatch = chunk.match(/"menus"\s*:\s*\[([^\]]*)\]/);
  if (menusMatch && menusMatch[1]) {
    menus = menusMatch[1]
      .match(/"([^"]*)"/g)
      ?.map(s => s.replace(/^"|"$/g, '')) || [];
  }

  // newBusinessHours 추출
  const hoursMatch = chunk.match(/"newBusinessHours"\s*:\s*\{[^}]*"status"\s*:\s*"?([^",}]*)"?[^}]*"description"\s*:\s*"?([^",}]*)"?/);
  const dayOffMatch = chunk.match(/"dayOff"\s*:\s*"?([^",}]*)"?/);
  const dayOffDescMatch = chunk.match(/"dayOffDescription"\s*:\s*"?([^",}]*)"?/);

  // 주소의 유니코드 이스케이프 처리
  const decodeUnicode = (str: string) => {
    return str.replace(/\\u002F/g, '/').replace(/\\u003C[^>]*\\u003E/g, '');
  };

  return {
    name: decodeUnicode(name).replace(/<[^>]*>/g, ''),
    category: getString('category'),
    roadAddress: decodeUnicode(getString('roadAddress')),
    fullAddress: decodeUnicode(getString('fullAddress')),
    phone: getString('phone'),
    virtualPhone: getString('virtualPhone'),
    menus: menus.map(m => decodeUnicode(m)),
    businessHoursStatus: hoursMatch?.[1]?.replace(/null/g, '') || '',
    businessHoursDescription: hoursMatch?.[2]?.replace(/null/g, '') || '',
    dayOff: dayOffMatch?.[1] && dayOffMatch[1] !== 'null' ? dayOffMatch[1] : null,
    dayOffDescription: dayOffDescMatch?.[1] && dayOffDescMatch[1] !== 'null' ? dayOffDescMatch[1] : null,
    visitorReviewCount: getString('visitorReviewCount'),
    bookingUrl: getString('bookingUrl') || null,
  };
}
