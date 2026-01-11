import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface TrendingKeyword {
  keyword: string;
  rank: number;
  source: 'nate' | 'zum';
}

/**
 * 네이트 실시간 검색어 크롤링
 */
async function getNateTrending(): Promise<TrendingKeyword[]> {
  try {
    const response = await fetch('https://www.nate.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.error('Nate fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const keywords: TrendingKeyword[] = [];

    // 네이트 실시간 검색어 셀렉터 (HTML 구조에 따라 조정 필요)
    $('.search_list_item, .realtime_keyword li, .rank_list li').each((index, element) => {
      const keyword = $(element).text().trim().replace(/^\d+\.?\s*/, ''); // 순위 번호 제거
      if (keyword && index < 20) {
        keywords.push({
          keyword,
          rank: index + 1,
          source: 'nate',
        });
      }
    });

    console.log('Nate keywords found:', keywords.length);
    return keywords;
  } catch (error) {
    console.error('Nate crawling error:', error);
    return [];
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
      },
    });

    if (!response.ok) {
      console.error('Zum fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const keywords: TrendingKeyword[] = [];

    // 줌 실시간 검색어 셀렉터 (HTML 구조에 따라 조정 필요)
    $('.rank_txt, .issue_keyword_list li, .realtime_keyword li').each((index, element) => {
      const keyword = $(element).text().trim().replace(/^\d+\.?\s*/, ''); // 순위 번호 제거
      if (keyword && index < 20) {
        keywords.push({
          keyword,
          rank: index + 1,
          source: 'zum',
        });
      }
    });

    console.log('Zum keywords found:', keywords.length);
    return keywords;
  } catch (error) {
    console.error('Zum crawling error:', error);
    return [];
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
      sources: {
        nate: nateKeywords.length,
        zum: zumKeywords.length,
      },
      total: allKeywords.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Trending keywords API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending keywords' },
      { status: 500 }
    );
  }
}
