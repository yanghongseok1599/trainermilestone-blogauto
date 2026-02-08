import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface TrendingKeyword {
  keyword: string;
  rank: number;
  source: 'google' | 'nate' | 'zum' | 'fallback';
}

/**
 * Google Trends 한국 실시간 검색어 (RSS)
 * 가장 안정적인 소스
 */
async function getGoogleTrends(): Promise<TrendingKeyword[]> {
  try {
    const response = await fetch('https://trends.google.co.kr/trending/rss?geo=KR', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogBooster/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      next: { revalidate: 600 }, // 10분 캐시
    });

    if (!response.ok) {
      console.error('Google Trends fetch failed:', response.status);
      return [];
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const keywords: TrendingKeyword[] = [];

    $('item title').each((index, element) => {
      const keyword = $(element).text().trim();
      if (keyword && keyword.length > 0 && keyword.length < 50 && index < 20) {
        if (!keywords.find(k => k.keyword === keyword)) {
          keywords.push({
            keyword,
            rank: keywords.length + 1,
            source: 'google',
          });
        }
      }
    });

    console.log('Google Trends keywords found:', keywords.length);
    return keywords.slice(0, 10);
  } catch (error) {
    console.error('Google Trends error:', error);
    return [];
  }
}

/**
 * 네이트 모바일 실시간 검색어 크롤링
 * 모바일 페이지가 구조가 단순하여 안정적
 */
async function getNateTrending(): Promise<TrendingKeyword[]> {
  try {
    const response = await fetch('https://m.nate.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      next: { revalidate: 300 }, // 5분 캐시
    });

    if (!response.ok) {
      console.error('Nate mobile fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const keywords: TrendingKeyword[] = [];

    // 네이트 모바일: .biztrend ol li a .keyword
    const selectors = [
      '.biztrend ol li a',
      '.biztrend li a',
      'ol li a .keyword',
      '.keyword_area li a',
    ];

    for (const selector of selectors) {
      $(selector).each((index, element) => {
        // .keyword span 텍스트 우선, 없으면 전체 텍스트
        let keyword = $(element).find('.keyword').text().trim();
        if (!keyword) {
          keyword = $(element).text().trim();
        }
        // 순위 번호 제거
        keyword = keyword.replace(/^\d+\.?\s*/, '').replace(/\s+/g, ' ').trim();
        // HOT 뱃지 등 제거
        keyword = keyword.replace(/HOT|NEW|↑|↓/gi, '').trim();

        if (keyword && keyword.length > 1 && keyword.length < 30) {
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

    // 데스크톱 네이트도 시도
    if (keywords.length === 0) {
      const desktopRes = await fetch('https://www.nate.com/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        next: { revalidate: 300 },
      });
      if (desktopRes.ok) {
        const desktopHtml = await desktopRes.text();
        const $d = cheerio.load(desktopHtml);
        $d('[class*="keyword"] li a, [class*="realtime"] li a, .rank_list li a').each((index, element) => {
          let keyword = $d(element).text().trim().replace(/^\d+\.?\s*/, '').replace(/\s+/g, ' ').trim();
          if (keyword && keyword.length > 1 && keyword.length < 30 && !keywords.find(k => k.keyword === keyword)) {
            keywords.push({ keyword, rank: keywords.length + 1, source: 'nate' });
          }
        });
      }
    }

    console.log('Nate keywords found:', keywords.length);
    return keywords.slice(0, 10);
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.error('Zum fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const keywords: TrendingKeyword[] = [];

    const selectors = [
      '.issue_keyword a',
      '.rank_txt',
      '[class*="issue"] li a',
      '[class*="keyword"] a',
      '[class*="realtime"] li a',
    ];

    for (const selector of selectors) {
      $(selector).each((index, element) => {
        let keyword = $(element).text().trim();
        keyword = keyword.replace(/^\d+\.?\s*/, '').replace(/\s+/g, ' ').trim();

        if (keyword && keyword.length > 1 && keyword.length < 30 && index < 20) {
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
    return keywords.slice(0, 10);
  } catch (error) {
    console.error('Zum crawling error:', error);
    return [];
  }
}

export async function GET() {
  try {
    // 3개 소스 병렬 크롤링
    const [googleKeywords, nateKeywords, zumKeywords] = await Promise.all([
      getGoogleTrends(),
      getNateTrending(),
      getZumTrending(),
    ]);

    // 각 소스의 실제 수집 결과 로깅
    console.log(`Trending sources - Google: ${googleKeywords.length}, Nate: ${nateKeywords.length}, Zum: ${zumKeywords.length}`);

    // 중복 제거하면서 결합 (Google > Nate > Zum 우선순위)
    const keywordMap = new Map<string, TrendingKeyword>();
    [...googleKeywords, ...nateKeywords, ...zumKeywords].forEach(item => {
      if (!keywordMap.has(item.keyword)) {
        keywordMap.set(item.keyword, item);
      }
    });

    const allKeywords = Array.from(keywordMap.values());

    // 어떤 소스에서도 키워드를 가져오지 못한 경우에만 fallback 표시
    const isFallback = allKeywords.length === 0;

    return NextResponse.json({
      keywords: allKeywords,
      // 개별 소스별 (프론트에서 탭 분리용)
      googleKeywords,
      nateKeywords: nateKeywords.length > 0 ? nateKeywords : googleKeywords.slice(0, 10),
      zumKeywords: zumKeywords.length > 0 ? zumKeywords : [],
      sources: {
        google: googleKeywords.length,
        nate: nateKeywords.length,
        zum: zumKeywords.length,
      },
      total: allKeywords.length,
      timestamp: new Date().toISOString(),
      fallback: isFallback,
    });
  } catch (error) {
    console.error('Trending keywords API error:', error);
    return NextResponse.json({
      keywords: [],
      googleKeywords: [],
      nateKeywords: [],
      zumKeywords: [],
      sources: { google: 0, nate: 0, zum: 0 },
      total: 0,
      timestamp: new Date().toISOString(),
      fallback: true,
    });
  }
}
