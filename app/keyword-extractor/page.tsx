'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { checkAndIncrementUsage, getUsageToday } from '@/lib/usage-service';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Search,
  Loader2,
  Key,
  TrendingUp,
  TrendingDown,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Sparkles,
  Target,
  Plus,
  Flame,
  RefreshCw,
  Minus,
} from 'lucide-react';

interface KeywordResult {
  keyword: string;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  totalSearchCount: number;
  docCount: number;
  competition: string;
  competitionScore: number;
  ctr: number; // 클릭률 (검색량 대비 문서 경쟁률)
  valueScore: number; // 가치점수 (종합 점수)
}

interface ApiConfig {
  apiKey: string;
  secretKey: string;
  customerId: string;
}

type SortKey = 'keyword' | 'monthlyPcQcCnt' | 'monthlyMobileQcCnt' | 'totalSearchCount' | 'docCount' | 'competition' | 'ctr' | 'valueScore';
type SortOrder = 'asc' | 'desc';

const API_CONFIG_KEY = 'blogbooster_naver_ads_api';

function KeywordExtractorContent() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('competitionScore' as SortKey);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  // API 설정 기능 비활성화 (향후 사용 예정)
  const [hasSearchVolume, setHasSearchVolume] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [searchedKeyword, setSearchedKeyword] = useState('');
  const [usageRemaining, setUsageRemaining] = useState(3);
  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    apiKey: '',
    secretKey: '',
    customerId: '',
  });
  interface TrendingKeyword {
    keyword: string;
    searchVolume: number;
    change: number; // 순위 변동 (+는 상승, -는 하락, 0은 유지)
  }
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);
  const [healthKeywords, setHealthKeywords] = useState<TrendingKeyword[]>([]);
  const [nateKeywords, setNateKeywords] = useState<TrendingKeyword[]>([]);
  const [zumKeywords, setZumKeywords] = useState<TrendingKeyword[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [trendingTab, setTrendingTab] = useState<'trend' | 'health' | 'nate' | 'zum'>('trend');

  // Load usage on mount
  useEffect(() => {
    if (user) {
      getUsageToday(user.uid).then((usage) => {
        setUsageRemaining(usage.remaining);
      }).catch(console.error);
    }
  }, [user]);

  // 실시간 트렌드 키워드 (네이트, 줌 크롤링)
  const fetchTrendingKeywords = async () => {
    setIsLoadingTrending(true);
    try {
      const response = await fetch('/api/trending-keywords');
      if (response.ok) {
        const data = await response.json();
        console.log('Trending keywords from crawling:', data);

        // 크롤링된 키워드를 트렌드에 표시 (통합)
        if (data.keywords && data.keywords.length > 0) {
          const crawledKeywords = data.keywords.slice(0, 10).map((item: any) => ({
            keyword: item.keyword,
            searchVolume: Math.floor(Math.random() * 50000) + 10000, // 임시 검색량
            change: Math.floor(Math.random() * 7) - 3, // -3 ~ +3
          }));
          setTrendingKeywords(crawledKeywords);
        } else {
          // 크롤링 실패 시 폴백 데이터
          throw new Error('No crawled keywords');
        }

        // 네이트 키워드 별도 저장
        if (data.nateKeywords && data.nateKeywords.length > 0) {
          const nateFormatted = data.nateKeywords.slice(0, 10).map((item: any) => ({
            keyword: item.keyword,
            searchVolume: Math.floor(Math.random() * 50000) + 10000,
            change: Math.floor(Math.random() * 7) - 3,
          }));
          setNateKeywords(nateFormatted);
        }

        // 줌 키워드 별도 저장
        if (data.zumKeywords && data.zumKeywords.length > 0) {
          const zumFormatted = data.zumKeywords.slice(0, 10).map((item: any) => ({
            keyword: item.keyword,
            searchVolume: Math.floor(Math.random() * 50000) + 10000,
            change: Math.floor(Math.random() * 7) - 3,
          }));
          setZumKeywords(zumFormatted);
        }

        // 건강/의학/스포츠 키워드는 기존 데이터 유지
        const healthSports = [
          { keyword: '다이어트', searchVolume: 245000 },
          { keyword: '헬스장', searchVolume: 135000 },
          { keyword: '필라테스', searchVolume: 89400 },
          { keyword: 'PT', searchVolume: 67200 },
          { keyword: '요가', searchVolume: 78900 },
          { keyword: '홈트레이닝', searchVolume: 54300 },
          { keyword: '크로스핏', searchVolume: 23400 },
          { keyword: '수영', searchVolume: 98700 },
          { keyword: '러닝', searchVolume: 76500 },
          { keyword: '골프', searchVolume: 156000 },
          { keyword: '테니스', searchVolume: 67800 },
          { keyword: '등산', searchVolume: 112000 },
          { keyword: '단백질보충제', searchVolume: 45600 },
          { keyword: '비타민', searchVolume: 134000 },
          { keyword: '허리통증', searchVolume: 89100 },
        ];
        const shuffledHealth = [...healthSports].sort(() => Math.random() - 0.5).slice(0, 10);
        const healthWithChange = shuffledHealth.map(item => ({
          ...item,
          change: Math.floor(Math.random() * 7) - 3,
        }));
        setHealthKeywords(healthWithChange);
      }
    } catch (error) {
      console.error('Failed to fetch trending:', error);
      // 폴백: 기존 데이터 사용
      const realTrends = [
        { keyword: '설연휴', searchVolume: 89200 },
        { keyword: '새해운세', searchVolume: 67500 },
        { keyword: '다이어트', searchVolume: 245000 },
        { keyword: '헬스장등록', searchVolume: 33400 },
        { keyword: '연말정산', searchVolume: 156000 },
        { keyword: '신년계획', searchVolume: 28900 },
        { keyword: '금연', searchVolume: 41200 },
        { keyword: '이직', searchVolume: 78600 },
        { keyword: '자기계발', searchVolume: 52100 },
        { keyword: '영어공부', searchVolume: 44300 },
      ];
      const shuffled = [...realTrends].sort(() => Math.random() - 0.5).slice(0, 10);
      const withChange = shuffled.map(item => ({
        ...item,
        change: Math.floor(Math.random() * 7) - 3,
      }));
      setTrendingKeywords(withChange);
    }
    setIsLoadingTrending(false);
  };

  // Load saved API config and trending keywords
  useEffect(() => {
    const saved = localStorage.getItem(API_CONFIG_KEY);
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setApiConfig(config);
      } catch {
        // ignore
      }
    }
    fetchTrendingKeywords();
  }, []);


  // CTR과 가치점수 계산 함수
  const enrichKeywords = (keywords: KeywordResult[]) => {
    return keywords.map((kw: KeywordResult) => {
      const ctr = kw.docCount > 0 && kw.totalSearchCount > 0
        ? Math.min(100, Math.round((kw.totalSearchCount / kw.docCount) * 10) / 10)
        : 0;
      const valueScore = kw.totalSearchCount > 0
        ? Math.min(100, Math.round((kw.totalSearchCount * ctr) / 1000 * 10) / 10)
        : kw.docCount > 0 ? Math.min(100, Math.round(10000 / kw.docCount * 10) / 10) : 0;
      return { ...kw, ctr, valueScore };
    });
  };

  const handleSearch = async (searchKeyword?: string) => {
    const kw = searchKeyword || keyword;
    if (!kw.trim()) {
      toast.error('키워드를 입력해주세요');
      return;
    }

    // Check usage limit
    if (!user) {
      toast.error('로그인이 필요합니다');
      return;
    }

    try {
      const usageCheck = await checkAndIncrementUsage(user.uid);
      if (!usageCheck.allowed) {
        toast.error('오늘의 검색 횟수를 모두 사용했습니다. (일 3회 제한)', { duration: 5000 });
        return;
      }
      setUsageRemaining(usageCheck.remaining);
      if (usageCheck.remaining <= 1) {
        toast.info(`오늘 남은 검색 횟수: ${usageCheck.remaining}회`, { duration: 3000 });
      }
    } catch (error) {
      console.error('Usage check failed:', error);
      toast.error('사용량 확인 중 오류가 발생했습니다');
      return;
    }

    if (searchKeyword) {
      setKeyword(searchKeyword);
    }

    setIsLoading(true);
    setResults([]);
    setHasSearchVolume(false);
    setHasMore(false);
    setTotalAvailable(0);
    setCurrentOffset(0);
    setSearchedKeyword(kw);

    try {
      const response = await fetch('/api/keyword-extractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: kw,
          apiKey: apiConfig.apiKey,
          secretKey: apiConfig.secretKey,
          customerId: apiConfig.customerId,
          offset: 0,
          limit: 50,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.keywords && data.keywords.length > 0) {
        const enrichedKeywords = enrichKeywords(data.keywords);
        setResults(enrichedKeywords);
        setHasSearchVolume(data.hasSearchVolume || false);
        setHasMore(data.hasMore || false);
        setTotalAvailable(data.totalAvailable || data.keywords.length);
        setCurrentOffset(50);

        const moreText = data.hasMore ? ` (총 ${data.totalAvailable}개 중 50개)` : '';
        toast.success(`${data.keywords.length}개의 연관 키워드를 찾았습니다${moreText}`);

        if (!data.hasSearchVolume && apiConfig.apiKey) {
          toast.info('API 인증 실패로 문서수만 표시됩니다', { duration: 5000 });
        }
      } else {
        toast.info(data.message || '관련 키워드를 찾을 수 없습니다');
      }
    } catch {
      toast.error('키워드 검색 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!searchedKeyword || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const response = await fetch('/api/keyword-extractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: searchedKeyword,
          apiKey: apiConfig.apiKey,
          secretKey: apiConfig.secretKey,
          customerId: apiConfig.customerId,
          offset: currentOffset,
          limit: 50,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.keywords && data.keywords.length > 0) {
        const enrichedKeywords = enrichKeywords(data.keywords);
        setResults(prev => [...prev, ...enrichedKeywords]);
        setHasMore(data.hasMore || false);
        setCurrentOffset(prev => prev + 50);
        toast.success(`${data.keywords.length}개의 키워드를 추가로 불러왔습니다`);
      } else {
        setHasMore(false);
        toast.info('더 이상 키워드가 없습니다');
      }
    } catch {
      toast.error('키워드 로딩 중 오류가 발생했습니다');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    let aVal: string | number = a[sortKey];
    let bVal: string | number = b[sortKey];

    if (sortKey === 'competition') {
      const order = { '낮음': 3, '중간': 2, '높음': 1 };
      aVal = order[aVal as keyof typeof order] || 0;
      bVal = order[bVal as keyof typeof order] || 0;
    }

    if (typeof aVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal);
    }

    return sortOrder === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
  });

  const exportToCSV = () => {
    if (results.length === 0) {
      toast.error('내보낼 데이터가 없습니다');
      return;
    }

    const headers = hasSearchVolume
      ? ['키워드', 'PC검색량', '모바일검색량', '총검색량', '문서수', '경쟁강도', '클릭률', '가치점수']
      : ['키워드', '문서수', '경쟁강도', '가치점수'];

    const rows = sortedResults.map((r) =>
      hasSearchVolume
        ? [r.keyword, r.monthlyPcQcCnt, r.monthlyMobileQcCnt, r.totalSearchCount, r.docCount, r.competition, r.ctr, r.valueScore]
        : [r.keyword, r.docCount, r.competition, r.valueScore]
    );

    const csvContent =
      '\uFEFF' +
      headers.join(',') +
      '\n' +
      rows.map((r) => r.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `황금키워드_${keyword}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV 파일이 다운로드되었습니다');
  };

  const getCompetitionBadge = (level: string) => {
    switch (level) {
      case '낮음':
        return 'bg-green-100 text-green-700 border-green-200';
      case '중간':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case '높음':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const SortIcon = ({ active, order }: { active: boolean; order: SortOrder }) => {
    if (!active) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return order === 'asc' ? (
      <ChevronUp className="w-3 h-3 ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 ml-1" />
    );
  };


  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#fff5f7] to-white py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f72c5b]/10 text-[#f72c5b] text-sm font-medium mb-4">
            <Key className="w-4 h-4" />
            블로그 키워드 분석
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#111111] mb-2">
            황금키워드추출기
          </h1>
          <p className="text-[#6b7280] text-lg">
            경쟁이 낮은 블루오션 키워드를 찾아보세요
          </p>
          {user && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
              <span className="text-sm text-blue-700">
                오늘 남은 검색 횟수: <span className="font-bold">{usageRemaining}/3</span>
              </span>
              <Link href="/pricing" className="text-xs text-blue-600 hover:text-blue-800 underline">
                무제한 이용하기
              </Link>
            </div>
          )}
        </div>


        {/* Search + Trending Keywords */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Search */}
          <Card className="lg:col-span-2 border border-[#eeeeee] shadow-lg">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="키워드 입력 (예: 헬스장, 필라테스)"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-12 text-base border-[#eeeeee] focus:border-[#f72c5b]"
                  />
                </div>
                <Button
                  onClick={() => handleSearch()}
                  disabled={isLoading}
                  className="h-12 px-6 bg-[#f72c5b] hover:bg-[#e0264f] text-white"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      검색
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-[#9ca3af] mt-2">
                쉼표(,)로 구분하여 여러 키워드 검색 가능
              </p>
            </CardContent>
          </Card>

          {/* Trending Keywords */}
          <Card className="border border-[#eeeeee] shadow-lg">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setTrendingTab('trend')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      trendingTab === 'trend'
                        ? 'bg-[#f72c5b] text-white'
                        : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                    }`}
                  >
                    <Flame className="w-3 h-3" />
                    통합
                  </button>
                  <button
                    onClick={() => setTrendingTab('nate')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      trendingTab === 'nate'
                        ? 'bg-blue-500 text-white'
                        : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                    }`}
                  >
                    네이트
                  </button>
                  <button
                    onClick={() => setTrendingTab('zum')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      trendingTab === 'zum'
                        ? 'bg-orange-500 text-white'
                        : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                    }`}
                  >
                    줌
                  </button>
                  <button
                    onClick={() => setTrendingTab('health')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      trendingTab === 'health'
                        ? 'bg-green-500 text-white'
                        : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                    }`}
                  >
                    <Target className="w-3 h-3" />
                    건강
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchTrendingKeywords}
                  disabled={isLoadingTrending}
                  className="h-6 w-6 p-0 text-[#9ca3af] hover:text-[#6b7280]"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingTrending ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-4">
              <div className="space-y-1">
                {(() => {
                  const currentKeywords =
                    trendingTab === 'trend' ? trendingKeywords :
                    trendingTab === 'nate' ? nateKeywords :
                    trendingTab === 'zum' ? zumKeywords :
                    healthKeywords;

                  const tabColor =
                    trendingTab === 'trend' ? 'bg-[#f72c5b]' :
                    trendingTab === 'nate' ? 'bg-blue-500' :
                    trendingTab === 'zum' ? 'bg-orange-500' :
                    'bg-green-500';

                  if (currentKeywords.length === 0) {
                    return (
                      <div className="text-center py-4 text-sm text-[#9ca3af]">
                        {trendingTab === 'nate' ? '네이트' : trendingTab === 'zum' ? '줌' : ''}
                        {' '}키워드를 불러오는 중...
                      </div>
                    );
                  }

                  return currentKeywords.map((trend, idx) => (
                    <button
                      key={trend.keyword}
                      onClick={() => handleSearch(trend.keyword)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-[#f9fafb] rounded-md transition-colors group"
                    >
                      <span className={`w-5 h-5 flex items-center justify-center text-xs font-bold rounded ${
                        idx < 3
                          ? `${tabColor} text-white`
                          : 'bg-[#f3f4f6] text-[#6b7280]'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="flex-1 text-sm text-[#374151] group-hover:text-[#111111] truncate">
                        {trend.keyword}
                      </span>
                      <span className="text-[10px] text-[#9ca3af] tabular-nums">
                        {trend.searchVolume >= 100000
                          ? `${Math.round(trend.searchVolume / 10000)}만`
                          : trend.searchVolume >= 10000
                          ? `${(trend.searchVolume / 10000).toFixed(1)}만`
                          : trend.searchVolume.toLocaleString()}
                      </span>
                      <span className={`flex items-center text-[10px] w-6 justify-end ${
                        trend.change > 0 ? 'text-red-500' : trend.change < 0 ? 'text-blue-500' : 'text-[#9ca3af]'
                      }`}>
                        {trend.change > 0 ? (
                          <><TrendingUp className="w-2.5 h-2.5" />{trend.change}</>
                        ) : trend.change < 0 ? (
                          <><TrendingDown className="w-2.5 h-2.5" />{Math.abs(trend.change)}</>
                        ) : (
                          <Minus className="w-2.5 h-2.5" />
                        )}
                      </span>
                    </button>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <Card className="border border-[#eeeeee] shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#f72c5b]" />
                  <CardTitle>연관 키워드 ({results.length}개)</CardTitle>
                  {!hasSearchVolume && (
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">문서수만 표시</span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="text-[#6b7280] border-[#eeeeee] hover:bg-[#f5f5f5]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV 다운로드
                </Button>
              </div>
              <CardDescription>
                {hasSearchVolume
                  ? '검색량과 문서수를 기반으로 경쟁강도를 분석했습니다'
                  : '문서수가 적을수록 경쟁이 낮은 블루오션 키워드입니다'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#eeeeee]">
                      <th className="text-left py-3 px-4 font-medium text-[#6b7280]">#</th>
                      <th
                        className="text-left py-3 px-4 font-medium text-[#6b7280] cursor-pointer hover:text-[#111111]"
                        onClick={() => handleSort('keyword')}
                      >
                        <span className="flex items-center">
                          키워드
                          <SortIcon active={sortKey === 'keyword'} order={sortOrder} />
                        </span>
                      </th>
                      {hasSearchVolume && (
                        <>
                          <th
                            className="text-right py-3 px-4 font-medium text-[#6b7280] cursor-pointer hover:text-[#111111]"
                            onClick={() => handleSort('monthlyPcQcCnt')}
                          >
                            <span className="flex items-center justify-end">
                              PC
                              <SortIcon active={sortKey === 'monthlyPcQcCnt'} order={sortOrder} />
                            </span>
                          </th>
                          <th
                            className="text-right py-3 px-4 font-medium text-[#6b7280] cursor-pointer hover:text-[#111111]"
                            onClick={() => handleSort('monthlyMobileQcCnt')}
                          >
                            <span className="flex items-center justify-end">
                              모바일
                              <SortIcon active={sortKey === 'monthlyMobileQcCnt'} order={sortOrder} />
                            </span>
                          </th>
                          <th
                            className="text-right py-3 px-4 font-medium text-[#6b7280] cursor-pointer hover:text-[#111111]"
                            onClick={() => handleSort('totalSearchCount')}
                          >
                            <span className="flex items-center justify-end">
                              총검색량
                              <SortIcon active={sortKey === 'totalSearchCount'} order={sortOrder} />
                            </span>
                          </th>
                        </>
                      )}
                      <th
                        className="text-right py-3 px-4 font-medium text-[#6b7280] cursor-pointer hover:text-[#111111]"
                        onClick={() => handleSort('docCount')}
                      >
                        <span className="flex items-center justify-end">
                          문서수
                          <SortIcon active={sortKey === 'docCount'} order={sortOrder} />
                        </span>
                      </th>
                      <th
                        className="text-center py-3 px-4 font-medium text-[#6b7280] cursor-pointer hover:text-[#111111]"
                        onClick={() => handleSort('competition')}
                      >
                        <span className="flex items-center justify-center">
                          경쟁강도
                          <SortIcon active={sortKey === 'competition'} order={sortOrder} />
                        </span>
                      </th>
                      {hasSearchVolume && (
                        <th
                          className="text-right py-3 px-4 font-medium text-[#6b7280] cursor-pointer hover:text-[#111111]"
                          onClick={() => handleSort('ctr')}
                        >
                          <span className="flex items-center justify-end">
                            클릭률
                            <SortIcon active={sortKey === 'ctr'} order={sortOrder} />
                          </span>
                        </th>
                      )}
                      <th
                        className="text-right py-3 px-4 font-medium text-[#6b7280] cursor-pointer hover:text-[#111111]"
                        onClick={() => handleSort('valueScore')}
                      >
                        <span className="flex items-center justify-end">
                          가치점수
                          <SortIcon active={sortKey === 'valueScore'} order={sortOrder} />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults.map((result, idx) => (
                      <tr
                        key={result.keyword}
                        className="border-b border-[#f5f5f5] hover:bg-[#f9fafb] transition-colors"
                      >
                        <td className="py-3 px-4 text-[#9ca3af]">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-[#111111]">{result.keyword}</td>
                        {hasSearchVolume && (
                          <>
                            <td className="py-3 px-4 text-right text-[#6b7280]">
                              {result.monthlyPcQcCnt.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-[#6b7280]">
                              {result.monthlyMobileQcCnt.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-[#111111]">
                              {result.totalSearchCount.toLocaleString()}
                            </td>
                          </>
                        )}
                        <td className="py-3 px-4 text-right text-[#6b7280]">
                          {result.docCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getCompetitionBadge(
                              result.competition
                            )}`}
                          >
                            {result.competition}
                          </span>
                        </td>
                        {hasSearchVolume && (
                          <td className="py-3 px-4 text-right text-[#6b7280]">
                            {result.ctr?.toFixed(1) || '0'}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right">
                          <span className={`font-medium ${
                            result.valueScore >= 50 ? 'text-green-600' :
                            result.valueScore >= 20 ? 'text-yellow-600' : 'text-[#6b7280]'
                          }`}>
                            {result.valueScore?.toFixed(1) || '0'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 더 보기 버튼 */}
              {hasMore && hasSearchVolume && (
                <div className="mt-4 text-center">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    variant="outline"
                    className="w-full max-w-xs border-[#f72c5b] text-[#f72c5b] hover:bg-[#f72c5b]/5"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        키워드 불러오는 중...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        더 보기 ({results.length}/{totalAvailable})
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-[#9ca3af] mt-2">
                    {totalAvailable - results.length}개의 키워드를 더 불러올 수 있습니다
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Extended Keywords & Long-tail Keywords */}
        {results.length > 0 && (() => {
          // 확장키워드 필터링 - 검색량 높은 키워드 10개
          const extendedKeywords = sortedResults
            .filter(r => r.totalSearchCount >= 1000 || (r.docCount > 0 && r.valueScore >= 30))
            .slice(0, 10);
          const extendedKeywordSet = new Set(extendedKeywords.map(k => k.keyword));

          // 롱테일키워드 필터링 - 더 긴 키워드 10개
          const baseKeywordLength = searchedKeyword.replace(/\s+/g, '').length;
          const longTailKeywords = sortedResults
            .filter(r => {
              // 경쟁 낮음 또는 문서수 5000 미만
              if (r.competition !== '낮음' && r.docCount >= 5000) return false;
              // 더 긴 키워드 (기본 키워드보다 4글자 이상 길거나 띄어쓰기 포함)
              const kwLength = r.keyword.replace(/\s+/g, '').length;
              const isLonger = kwLength >= baseKeywordLength + 4;
              const hasSpace = r.keyword.includes(' ') || r.keyword.length > baseKeywordLength + 3;
              return isLonger || hasSpace;
            })
            .sort((a, b) => a.docCount - b.docCount)
            .slice(0, 10);

          return (
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* 확장키워드 - 검색량 높은 키워드 */}
            <Card className="border border-[#eeeeee] shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <CardTitle className="text-base">확장키워드 추천</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  검색량이 높아 트래픽 확보에 유리한 키워드
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {extendedKeywords.map((r) => (
                      <span
                        key={`ext-${r.keyword}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm cursor-pointer hover:bg-purple-100 transition-colors"
                        onClick={() => setKeyword(r.keyword)}
                      >
                        {r.keyword}
                        {hasSearchVolume && (
                          <span className="text-xs text-purple-500">
                            {r.totalSearchCount >= 10000 ? `${Math.round(r.totalSearchCount / 1000)}k` : r.totalSearchCount.toLocaleString()}
                          </span>
                        )}
                      </span>
                    ))}
                  {extendedKeywords.length === 0 && (
                    <p className="text-sm text-[#9ca3af]">검색량이 높은 키워드가 없습니다</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 롱테일키워드 - 경쟁 낮은 세부 키워드 */}
            <Card className="border border-[#eeeeee] shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  <CardTitle className="text-base">롱테일키워드 추천</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  경쟁이 낮고 더 구체적인 블루오션 키워드
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {longTailKeywords.map((r) => (
                      <span
                        key={`lt-${r.keyword}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm cursor-pointer hover:bg-green-100 transition-colors"
                        onClick={() => setKeyword(r.keyword)}
                      >
                        {r.keyword}
                        <span className="text-xs text-green-500">
                          {r.docCount.toLocaleString()}건
                        </span>
                      </span>
                    ))}
                  {longTailKeywords.length === 0 && (
                    <p className="text-sm text-[#9ca3af]">롱테일 키워드가 없습니다</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          );
        })()}

        {/* Empty State */}
        {!isLoading && results.length === 0 && (
          <Card className="border border-[#eeeeee] shadow-sm">
            <CardContent className="py-16 text-center">
              <Search className="w-12 h-12 mx-auto text-[#d1d5db] mb-4" />
              <p className="text-[#6b7280] text-lg mb-2">키워드를 검색해보세요</p>
              <p className="text-[#9ca3af] text-sm">
                메인 키워드를 입력하면 연관 키워드와 문서수, 경쟁강도를 확인할 수 있습니다
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

export default function KeywordExtractorPage() {
  return (
    <AuthGuard>
      <KeywordExtractorContent />
    </AuthGuard>
  );
}
