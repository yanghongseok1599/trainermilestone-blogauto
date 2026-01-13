import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// 네이버 검색 API 인증 정보 (문서수 조회용)
const NAVER_CLIENT_ID = 'rSdTHY4KsnCjj7s7oAwL';
const NAVER_CLIENT_SECRET = 'LoCw_04IUC';

interface KeywordResult {
  keyword: string;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  totalSearchCount: number;
  docCount: number;
  competition: string;
  competitionScore: number;
}

/**
 * 네이버 광고 API 서명 생성
 * 가이드 문서 기준: message = "{timestamp}.{method}.{uri}"
 * HMAC-SHA256 → Base64 인코딩
 */
function generateSignature(timestamp: string, method: string, uri: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${uri}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');
  return signature;
}

/**
 * 검색량 정규화 (< 10 처리)
 */
function normalizeCount(value: number | string): number {
  if (typeof value === 'string') {
    return 5; // "< 10" 등의 문자열은 5로 처리
  }
  return value || 0;
}

/**
 * 경쟁강도 계산
 */
function calculateCompetition(compIdx: string, docCount: number): { level: string; score: number } {
  let score = 0;

  // 네이버 광고 API 경쟁지수 기반
  if (compIdx === '낮음') score += 40;
  else if (compIdx === '중간') score += 20;
  else score += 0;

  // 문서 수 기반 추가 점수
  if (docCount < 10000) score += 30;
  else if (docCount < 50000) score += 20;
  else if (docCount < 200000) score += 10;
  else score += 0;

  // 최종 레벨 결정
  let level = '높음';
  if (score >= 50) level = '낮음';
  else if (score >= 25) level = '중간';

  return { level, score };
}

/**
 * 딜레이 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 네이버 블로그 검색으로 문서 수 가져오기
 */
async function getDocumentCount(keyword: string): Promise<number> {
  try {
    const response = await fetch(
      `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=1`,
      {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.total || 0;
    } else {
      console.error('Blog search failed:', response.status, await response.text());
    }
  } catch (e) {
    console.error('Blog search error:', e);
  }
  return 0;
}

/**
 * 순차적으로 문서수 조회 (Rate Limit 방지)
 */
async function getDocumentCountsSequentially(keywords: string[]): Promise<number[]> {
  const results: number[] = [];
  for (let i = 0; i < keywords.length; i++) {
    const count = await getDocumentCount(keywords[i]);
    results.push(count);
    // 요청 간 100ms 딜레이
    if (i < keywords.length - 1) {
      await delay(100);
    }
  }
  return results;
}

/**
 * 네이버 광고 API로 키워드 검색량 가져오기
 * Python 가이드 문서 기준으로 구현
 */
async function getKeywordStats(
  keyword: string,
  apiKey: string,
  secretKey: string,
  customerId: string
): Promise<{
  keywords: Array<{
    relKeyword: string;
    monthlyPcQcCnt: number | string;
    monthlyMobileQcCnt: number | string;
    compIdx: string;
  }>;
  error?: string;
}> {
  const BASE_URL = 'https://api.naver.com';
  const KEYWORD_TOOL_URI = '/keywordstool';
  const method = 'GET';
  const timestamp = String(Math.floor(Date.now()));

  // 서명 생성
  const signature = generateSignature(timestamp, method, KEYWORD_TOOL_URI, secretKey);

  // 헤더 구성 (가이드 문서 기준)
  const headers: Record<string, string> = {
    'X-Timestamp': timestamp,
    'X-API-KEY': apiKey,
    'X-Customer': customerId,
    'X-Signature': signature,
    'Content-Type': 'application/json; charset=UTF-8',
  };

  // 파라미터
  const params = new URLSearchParams({
    hintKeywords: keyword,
    showDetail: '1',
  });

  const url = `${BASE_URL}${KEYWORD_TOOL_URI}?${params.toString()}`;

  console.log('=== Naver Ads API Request ===');
  console.log('URL:', url);
  console.log('Timestamp:', timestamp);
  console.log('Message:', `${timestamp}.${method}.${KEYWORD_TOOL_URI}`);
  console.log('Customer ID:', customerId);

  try {
    const response = await fetch(url, {
      method: method,
      headers: headers,
    });

    const responseText = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response Body:', responseText.substring(0, 500));

    if (response.status === 200) {
      const data = JSON.parse(responseText);
      console.log('Keywords found:', data.keywordList?.length || 0);
      return { keywords: data.keywordList || [] };
    } else {
      console.error('Naver Ads API Error:', response.status, responseText);
      return { keywords: [], error: `Status ${response.status}: ${responseText || '(empty)'}` };
    }
  } catch (e) {
    console.error('Naver Ads API error:', e);
    return { keywords: [], error: String(e) };
  }
}

/**
 * 네이버 연관검색어 API로 추가 키워드 가져오기
 */
async function getNaverRelatedKeywords(keyword: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(keyword)}&con=0&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100&std=1`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const items = data.items?.[0] || [];
      const relatedKeywords = items.map((item: string[][]) => item[0]).filter((kw: string) => kw && kw.length > 0);
      console.log('Naver related keywords:', relatedKeywords);
      return relatedKeywords.slice(0, 30);
    }
  } catch (e) {
    console.error('Naver related keywords error:', e);
  }
  return [];
}

/**
 * 연관 키워드 생성 (API 없을 때 폴백)
 */
function generateRelatedKeywords(mainKeyword: string): string[] {
  // 짧은 접미사 (기본 확장 키워드)
  const shortSuffixes = [
    '추천', '가격', '후기', '비용', '효과',
    '방법', '순위', '비교', '종류', '선택',
    '할인', '이벤트', '위치', '장점', '단점', '팁'
  ];

  // 긴 접미사 (롱테일 키워드)
  const longSuffixes = [
    '추천 순위', '가격 비교', '후기 모음', '비용 절약',
    '효과 좋은', '이용 방법', '장단점 비교', '종류 정리',
    '예약 방법', '할인 이벤트', '이용 후기', '추천 이유',
    '선택 가이드', '완벽 가이드', '구매 가이드', '비교 분석',
    '사용법 정리', '주의사항', '꿀팁 모음', '베스트 추천',
    '실제 후기', '상세 리뷰', '전격 비교', '총정리',
    '추천 best', '인기 순위', 'TOP 추천', '완벽 정리'
  ];

  const keywords: string[] = [mainKeyword];

  // 짧은 접미사 추가 (띄어쓰기 O, X 모두)
  shortSuffixes.forEach(suffix => {
    keywords.push(`${mainKeyword} ${suffix}`);
    keywords.push(`${mainKeyword}${suffix}`);
  });

  // 긴 접미사 추가 (띄어쓰기 O만)
  longSuffixes.forEach(suffix => {
    keywords.push(`${mainKeyword} ${suffix}`);
  });

  return keywords.slice(0, 80);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const keyword = body.keyword?.trim();
    const apiKey = body.apiKey?.trim();
    const secretKey = body.secretKey?.trim();
    const customerId = body.customerId?.trim()?.replace(/-/g, '');
    const offset = body.offset || 0; // 오프셋 (더보기용)
    const limit = body.limit || 50; // 한 번에 가져올 개수

    if (!keyword) {
      return NextResponse.json({ error: '키워드를 입력해주세요' }, { status: 400 });
    }

    // 여러 키워드 지원 (쉼표, 세미콜론, 줄바꿈으로 구분)
    const keywords = keyword
      .split(/[,;，\n]+/)
      .map((k: string) => k.trim().replace(/\s+/g, ''))
      .filter((k: string) => k.length > 0);

    if (keywords.length === 0) {
      return NextResponse.json({ error: '키워드를 입력해주세요' }, { status: 400 });
    }

    // 네이버 연관검색어 API로 추가 키워드 가져오기
    const relatedKeywordsFromNaver = await getNaverRelatedKeywords(keywords[0]);
    const generatedKeywords = generateRelatedKeywords(keywords[0]);

    // 네이버 연관검색어 + 생성한 키워드 결합 (중복 제거)
    const allRelatedKeywords = Array.from(new Set([
      keywords[0], // 원본 키워드
      ...relatedKeywordsFromNaver,
      ...generatedKeywords
    ]));

    console.log('Total related keywords:', allRelatedKeywords.length);

    // API 키가 있으면 네이버 광고 API 사용
    // 네이버 광고 API는 여러 키워드를 줄바꿈으로 구분
    const keywordsForApi = allRelatedKeywords.join('\n');
    if (apiKey && secretKey && customerId) {
      const adsResult = await getKeywordStats(keywordsForApi, apiKey, secretKey, customerId);

      if (!adsResult.error && adsResult.keywords && adsResult.keywords.length > 0) {
        // API 성공 - 검색량 데이터 포함
        const totalAvailable = adsResult.keywords.length;
        const keywordsToProcess = adsResult.keywords.slice(offset, offset + limit);

        // 더 이상 키워드가 없으면 빈 배열 반환
        if (keywordsToProcess.length === 0) {
          return NextResponse.json({
            keywords: [],
            total: 0,
            totalAvailable,
            hasMore: false,
            searchedKeyword: keyword,
            hasSearchVolume: true,
          });
        }

        const docCounts = await getDocumentCountsSequentially(
          keywordsToProcess.map(kw => kw.relKeyword)
        );

        const keywords: KeywordResult[] = keywordsToProcess.map((item, idx) => {
          const pcCount = normalizeCount(item.monthlyPcQcCnt);
          const mobileCount = normalizeCount(item.monthlyMobileQcCnt);
          const docCount = docCounts[idx];
          const competition = calculateCompetition(item.compIdx || '', docCount);

          return {
            keyword: item.relKeyword,
            monthlyPcQcCnt: pcCount,
            monthlyMobileQcCnt: mobileCount,
            totalSearchCount: pcCount + mobileCount,
            docCount,
            competition: competition.level,
            competitionScore: competition.score,
          };
        });

        // 총 검색량 기준 정렬 (가이드 문서처럼)
        keywords.sort((a, b) => {
          if (b.competitionScore !== a.competitionScore) {
            return b.competitionScore - a.competitionScore;
          }
          return b.totalSearchCount - a.totalSearchCount;
        });

        return NextResponse.json({
          keywords,
          total: keywords.length,
          totalAvailable,
          hasMore: offset + limit < totalAvailable,
          searchedKeyword: keyword,
          hasSearchVolume: true,
        });
      }

      // API 실패 시 에러 로그
      console.log('API failed, falling back to basic mode:', adsResult.error);
    }

    // API 키 없거나 실패 시 - 문서수만 조회
    const docCounts = await getDocumentCountsSequentially(allRelatedKeywords);

    const fallbackKeywords: KeywordResult[] = allRelatedKeywords.map((kw, idx) => {
      const docCount = docCounts[idx];
      let score = 0;
      if (docCount < 5000) score = 80;
      else if (docCount < 10000) score = 70;
      else if (docCount < 30000) score = 50;
      else if (docCount < 100000) score = 30;
      else score = 10;

      let level = '높음';
      if (score >= 60) level = '낮음';
      else if (score >= 30) level = '중간';

      return {
        keyword: kw,
        monthlyPcQcCnt: 0,
        monthlyMobileQcCnt: 0,
        totalSearchCount: 0,
        docCount,
        competition: level,
        competitionScore: score,
      };
    });

    fallbackKeywords.sort((a, b) => b.competitionScore - a.competitionScore);

    return NextResponse.json({
      keywords: fallbackKeywords,
      total: fallbackKeywords.length,
      searchedKeyword: keyword,
      hasSearchVolume: false,
      note: '검색량 데이터를 보려면 네이버 광고 API 설정이 필요합니다.',
    });

  } catch (error: unknown) {
    console.error('Keyword extractor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
