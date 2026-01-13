import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface TrendingKeyword {
  keyword: string;
  rank: number;
  source: 'nate' | 'zum' | 'fallback';
}

// 폴백 데이터 (크롤링 실패 시 사용)
const NATE_FALLBACK: TrendingKeyword[] = [
  { keyword: '설연휴', rank: 1, source: 'nate' },
  { keyword: '새해운세', rank: 2, source: 'nate' },
  { keyword: '연말정산', rank: 3, source: 'nate' },
  { keyword: '신년계획', rank: 4, source: 'nate' },
  { keyword: '다이어트', rank: 5, source: 'nate' },
  { keyword: '헬스장', rank: 6, source: 'nate' },
  { keyword: '이직', rank: 7, source: 'nate' },
  { keyword: '자기계발', rank: 8, source: 'nate' },
  { keyword: '금연', rank: 9, source: 'nate' },
  { keyword: '여행지추천', rank: 10, source: 'nate' },
];

const ZUM_FALLBACK: TrendingKeyword[] = [
  { keyword: '챗GPT', rank: 1, source: 'zum' },
  { keyword: 'AI', rank: 2, source: 'zum' },
  { keyword: '운동루틴', rank: 3, source: 'zum' },
  { keyword: '재테크', rank: 4, source: 'zum' },
  { keyword: '부동산', rank: 5, source: 'zum' },
  { keyword: '주식', rank: 6, source: 'zum' },
  { keyword: '영어공부', rank: 7, source: 'zum' },
  { keyword: '자격증', rank: 8, source: 'zum' },
  { keyword: '취업', rank: 9, source: 'zum' },
  { keyword: '면접', rank: 10, source: 'zum' },
];

/**
 * 네이트 실시간 검색어 크롤링
 */
async function getNateTrending(): Promise<TrendingKeyword[]> {
  try {
    const response = await fetch('https://www.nate.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 300 }, // 5분 캐시
    });

    if (!response.ok) {
      console.error('Nate fetch failed:', response.status);
      return NATE_FALLBACK;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const keywords: TrendingKeyword[] = [];

    // 네이트 실시간 검색어 여러 셀렉터 시도
    const selectors = [
      '.keyword_area li a',
      '.realtime_keyword li',
      '.rank_list li a',
      '.search_list li a',
      '[class*="keyword"] li a',
      '[class*="realtime"] li a',
    ];

    for (const selector of selectors) {
      $(selector).each((index, element) => {
        let keyword = $(element).text().trim();
        // 순위 번호 제거
        keyword = keyword.replace(/^\d+\.?\s*/, '').replace(/\s+/g, ' ').trim();

        if (keyword && keyword.length > 1 && keyword.length < 30 && index < 20) {
          // 중복 체크
          if (!keywords.find(k => k.keyword === keyword)) {
            keywords.push({
              keyword,
              rank: keywords.length + 1,
              source: 'nate',
            });
          }
        }
      });

      if (keywords.length >= 10) break;
    }

    console.log('Nate keywords found:', keywords.length);
    return keywords.length > 0 ? keywords.slice(0, 10) : NATE_FALLBACK;
  } catch (error) {
    console.error('Nate crawling error:', error);
    return NATE_FALLBACK;
  }
}

/**
 * 줌 실시간 검색어 크롤링
 */
async function getZumTrending(): Promise<TrendingKeyword[]> {
  try {
    const response = await fetch('https://zum.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      next: { revalidate: 300 }, // 5분 캐시
    });

    if (!response.ok) {
      console.error('Zum fetch failed:', response.status);
      return ZUM_FALLBACK;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const keywords: TrendingKeyword[] = [];

    // 줌 실시간 검색어 여러 셀렉터 시도
    const selectors = [
      '.issue_keyword a',
      '.rank_txt',
      '.realtime_keyword li a',
      '.keyword_list li a',
      '[class*="issue"] li a',
      '[class*="keyword"] a',
    ];

    for (const selector of selectors) {
      $(selector).each((index, element) => {
        let keyword = $(element).text().trim();
        // 순위 번호 제거
        keyword = keyword.replace(/^\d+\.?\s*/, '').replace(/\s+/g, ' ').trim();

        if (keyword && keyword.length > 1 && keyword.length < 30 && index < 20) {
          // 중복 체크
          if (!keywords.find(k => k.keyword === keyword)) {
            keywords.push({
              keyword,
              rank: keywords.length + 1,
              source: 'zum',
            });
          }
        }
      });

      if (keywords.length >= 10) break;
    }

    console.log('Zum keywords found:', keywords.length);
    return keywords.length > 0 ? keywords.slice(0, 10) : ZUM_FALLBACK;
  } catch (error) {
    console.error('Zum crawling error:', error);
    return ZUM_FALLBACK;
  }
}

export async function GET() {
  try {
    // 네이트와 줌 병렬로 크롤링
    const [nateKeywords, zumKeywords] = await Promise.all([
      getNateTrending(),
      getZumTrending(),
    ]);

    // 중복 제거하면서 결합
    const keywordMap = new Map<string, TrendingKeyword>();

    [...nateKeywords, ...zumKeywords].forEach(item => {
      if (!keywordMap.has(item.keyword)) {
        keywordMap.set(item.keyword, item);
      }
    });

    const allKeywords = Array.from(keywordMap.values());

    console.log('Total trending keywords:', allKeywords.length);

    return NextResponse.json({
      keywords: allKeywords,
      nateKeywords,
      zumKeywords,
      sources: {
        nate: nateKeywords.length,
        zum: zumKeywords.length,
      },
      total: allKeywords.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Trending keywords API error:', error);
    // 에러 시에도 폴백 데이터 반환
    return NextResponse.json({
      keywords: [...NATE_FALLBACK, ...ZUM_FALLBACK],
      nateKeywords: NATE_FALLBACK,
      zumKeywords: ZUM_FALLBACK,
      sources: {
        nate: NATE_FALLBACK.length,
        zum: ZUM_FALLBACK.length,
      },
      total: NATE_FALLBACK.length + ZUM_FALLBACK.length,
      timestamp: new Date().toISOString(),
      fallback: true,
    });
  }
}
