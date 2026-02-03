import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { authenticateRequest } from '@/lib/api-auth';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID || '';
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET || '';

interface BlogItem {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  postdate: string;
}

interface LearnedBlog {
  title: string;
  url: string;
  content: string;
  structure: {
    hasIntro: boolean;
    hasConclusion: boolean;
    sectionCount: number;
    imageCount: number;
    hasFAQ: boolean;
    hasTable: boolean;
  };
  keywords: string[];
  wordCount: number;
  bloggername: string;
}

interface LearningResult {
  keyword: string;
  totalBlogs: number;
  successfulBlogs: number;
  blogs: LearnedBlog[];
  analysis: {
    avgWordCount: number;
    avgSections: number;
    avgImages: number;
    commonStructures: string[];
    titlePatterns: string[];
  };
}

// 네이버 블로그 본문 크롤링
async function crawlBlogContent(url: string): Promise<{ content: string; imageCount: number } | null> {
  try {
    // 네이버 블로그 URL 변환 (모바일 버전이 크롤링하기 쉬움)
    let crawlUrl = url;
    if (url.includes('blog.naver.com')) {
      // PC URL을 모바일 URL로 변환
      const match = url.match(/blog\.naver\.com\/([^/]+)\/(\d+)/);
      if (match) {
        crawlUrl = `https://m.blog.naver.com/${match[1]}/${match[2]}`;
      }
    }

    const response = await fetch(crawlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      console.log(`Failed to fetch ${crawlUrl}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 네이버 블로그 본문 추출 (여러 선택자 시도)
    let content = '';
    const selectors = [
      '.se-main-container',  // 스마트에디터
      '#postViewArea',       // 구버전
      '.post_ct',            // 모바일
      '.se_component_wrap',  // 스마트에디터 2
      '#post-view',          // 다른 버전
      'article',             // 일반 article
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // 이미지 개수 카운트
    const imageCount = $('img').length;

    // 텍스트 정리
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()
      .slice(0, 10000); // 최대 10000자로 제한

    return content.length > 100 ? { content, imageCount } : null;
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    return null;
  }
}

// 블로그 구조 분석
function analyzeStructure(content: string): LearnedBlog['structure'] {
  const lowerContent = content.toLowerCase();

  return {
    hasIntro: lowerContent.includes('안녕') || lowerContent.includes('소개') || content.slice(0, 200).length > 50,
    hasConclusion: lowerContent.includes('마무리') || lowerContent.includes('정리') || lowerContent.includes('결론'),
    sectionCount: (content.match(/[【\[■●▶]|^\d+\./gm) || []).length,
    imageCount: 0, // 크롤링 시 별도로 설정
    hasFAQ: lowerContent.includes('faq') || lowerContent.includes('자주 묻는') || lowerContent.includes('q&a') || lowerContent.includes('질문'),
    hasTable: lowerContent.includes('가격') && (lowerContent.includes('원') || lowerContent.includes('₩')),
  };
}

// 키워드 추출
function extractKeywords(content: string, mainKeyword: string): string[] {
  const words = content.split(/\s+/);
  const wordFreq: Record<string, number> = {};

  // 2글자 이상 단어만 카운트
  words.forEach(word => {
    const cleaned = word.replace(/[^가-힣a-zA-Z0-9]/g, '');
    if (cleaned.length >= 2 && cleaned.length <= 10) {
      wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
    }
  });

  // 빈도순 정렬 후 상위 10개 반환 (메인 키워드 제외)
  return Object.entries(wordFreq)
    .filter(([word]) => !mainKeyword.includes(word) && word !== mainKeyword)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// 제목 패턴 분석
function analyzeTitlePatterns(titles: string[]): string[] {
  const patterns: string[] = [];

  titles.forEach(title => {
    // 숫자 포함 패턴
    if (/\d+/.test(title)) {
      patterns.push('숫자 포함');
    }
    // 질문형
    if (title.includes('?') || title.includes('어떻게') || title.includes('왜')) {
      patterns.push('질문형');
    }
    // 리스트형
    if (/\d+가지|\d+개|TOP\d+|베스트/i.test(title)) {
      patterns.push('리스트형');
    }
    // 지역명 포함
    if (/강남|홍대|신촌|부산|대구|인천|서울/.test(title)) {
      patterns.push('지역명 포함');
    }
    // 가격 정보
    if (/가격|비용|요금|원/.test(title)) {
      patterns.push('가격 정보');
    }
    // 후기/리뷰
    if (/후기|리뷰|솔직|실제/.test(title)) {
      patterns.push('후기형');
    }
  });

  // 중복 제거 후 빈도순 반환
  const patternCount: Record<string, number> = {};
  patterns.forEach(p => {
    patternCount[p] = (patternCount[p] || 0) + 1;
  });

  return Object.entries(patternCount)
    .sort((a, b) => b[1] - a[1])
    .map(([pattern]) => pattern);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, count = 5 } = body;

    // 인증 체크 (사이트 네이버 API 키 보호)
    const authResult = await authenticateRequest(request, { userId: body.userId });
    if ('error' in authResult) return authResult.error;

    if (!keyword) {
      return NextResponse.json({ error: '키워드를 입력해주세요' }, { status: 400 });
    }

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      return NextResponse.json({ error: '네이버 API 키가 설정되지 않았습니다' }, { status: 500 });
    }

    // 1. 네이버 블로그 검색 (상위 노출 순)
    const searchResponse = await fetch(
      `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=${Math.min(count, 10)}&start=1&sort=sim`,
      {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        },
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      return NextResponse.json({ error: `네이버 API 오류: ${errorText}` }, { status: searchResponse.status });
    }

    const searchData = await searchResponse.json();
    const blogItems: BlogItem[] = searchData.items || [];

    // 2. 각 블로그 크롤링 및 분석
    const learnedBlogs: LearnedBlog[] = [];

    for (const item of blogItems.slice(0, count)) {
      // 네이버 블로그만 크롤링 (티스토리 등은 제외)
      if (!item.link.includes('blog.naver.com')) {
        continue;
      }

      const crawlResult = await crawlBlogContent(item.link);

      if (crawlResult) {
        const structure = analyzeStructure(crawlResult.content);
        structure.imageCount = crawlResult.imageCount;

        learnedBlogs.push({
          title: item.title.replace(/<[^>]*>/g, ''),
          url: item.link,
          content: crawlResult.content.slice(0, 3000), // 프롬프트용으로 3000자 제한
          structure,
          keywords: extractKeywords(crawlResult.content, keyword),
          wordCount: crawlResult.content.length,
          bloggername: item.bloggername,
        });
      }

      // Rate limiting - 각 요청 사이 500ms 대기
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 3. 전체 분석 결과 생성
    const analysis = {
      avgWordCount: learnedBlogs.length > 0
        ? Math.round(learnedBlogs.reduce((sum, b) => sum + b.wordCount, 0) / learnedBlogs.length)
        : 0,
      avgSections: learnedBlogs.length > 0
        ? Math.round(learnedBlogs.reduce((sum, b) => sum + b.structure.sectionCount, 0) / learnedBlogs.length)
        : 0,
      avgImages: learnedBlogs.length > 0
        ? Math.round(learnedBlogs.reduce((sum, b) => sum + b.structure.imageCount, 0) / learnedBlogs.length)
        : 0,
      commonStructures: [
        ...(learnedBlogs.filter(b => b.structure.hasIntro).length > learnedBlogs.length / 2 ? ['인트로 섹션'] : []),
        ...(learnedBlogs.filter(b => b.structure.hasFAQ).length > 0 ? ['FAQ 섹션'] : []),
        ...(learnedBlogs.filter(b => b.structure.hasTable).length > 0 ? ['가격표'] : []),
        ...(learnedBlogs.filter(b => b.structure.hasConclusion).length > learnedBlogs.length / 2 ? ['마무리 섹션'] : []),
      ],
      titlePatterns: analyzeTitlePatterns(learnedBlogs.map(b => b.title)),
    };

    const result: LearningResult = {
      keyword,
      totalBlogs: blogItems.length,
      successfulBlogs: learnedBlogs.length,
      blogs: learnedBlogs,
      analysis,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Learn top blogs error:', error);
    return NextResponse.json({ error: '상위 블로그 학습 중 오류가 발생했습니다' }, { status: 500 });
  }
}

// 학습 결과를 프롬프트용 컨텍스트로 변환
export function generateLearningContext(result: LearningResult): string {
  if (result.successfulBlogs === 0) {
    return '';
  }

  let context = `【상위노출 블로그 ${result.successfulBlogs}개 분석 결과】

📊 평균 통계:
- 평균 글자수: ${result.analysis.avgWordCount.toLocaleString()}자
- 평균 섹션 수: ${result.analysis.avgSections}개
- 평균 이미지 수: ${result.analysis.avgImages}개

🏷️ 제목 패턴: ${result.analysis.titlePatterns.join(', ') || '일반형'}

📝 공통 구조: ${result.analysis.commonStructures.join(', ') || '자유 형식'}

`;

  // 상위 3개 블로그의 구조 요약
  context += '【상위 블로그 구조 참고】\n';
  result.blogs.slice(0, 3).forEach((blog, idx) => {
    context += `
${idx + 1}. "${blog.title}"
   - 글자수: ${blog.wordCount.toLocaleString()}자
   - 섹션: ${blog.structure.sectionCount}개
   - FAQ: ${blog.structure.hasFAQ ? '있음' : '없음'}
   - 주요 키워드: ${blog.keywords.slice(0, 5).join(', ')}
`;
  });

  context += `
위 분석 결과를 참고하여 비슷한 구조와 분량으로 작성하되, 표절이 아닌 독창적인 콘텐츠를 만들어주세요.
특히 제목은 "${result.analysis.titlePatterns[0] || '정보형'}" 스타일로 작성하면 좋습니다.
`;

  return context;
}
