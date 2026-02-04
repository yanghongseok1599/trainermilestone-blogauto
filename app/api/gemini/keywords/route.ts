import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { checkAndIncrementTokenUsageServer } from '@/lib/server-usage';

export async function POST(request: NextRequest) {
  try {
    const { mainKeyword, category, businessName, imageContext, imageAnalysis, apiKey: clientApiKey } = await request.json();

    const useSiteApi = !clientApiKey;
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다' }, { status: 400 });
    }

    // 사이트 API 사용 시 인증
    if (useSiteApi) {
      const authResult = await authenticateRequest(request, { userId: undefined });
      if ('error' in authResult) return authResult.error;
    }

    if (!mainKeyword) {
      return NextResponse.json({ error: '메인 키워드가 필요합니다' }, { status: 400 });
    }

    // 이미지 분석 컨텍스트가 있으면 프롬프트에 추가
    const contextSection = imageContext ? `\n\n【글 작성 의도/기획】\n${imageContext}` : '';
    const analysisSection = imageAnalysis ? `\n\n【업로드된 이미지 분석 결과】\n${imageAnalysis.slice(0, 800)}` : '';
    const hasExtraContext = !!(imageContext || imageAnalysis);

    const prompt = `당신은 네이버 블로그 SEO 전문가입니다. 아래 정보를 바탕으로 키워드와 블로그 제목을 생성해주세요.

메인 키워드: ${mainKeyword}
업종: ${category || '피트니스'}
업체명: ${businessName || ''}${contextSection}${analysisSection}

다음 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요:
{
  "subKeywords": ["보조키워드1", "보조키워드2", "보조키워드3"],
  "tailKeywords": ["롱테일키워드1", "롱테일키워드2", "롱테일키워드3"],
  "titles": ["제목1", "제목2", "제목3", "제목4", "제목5"]
}

규칙:
1. 보조 키워드(subKeywords): 메인 키워드와 관련된 핵심 검색어 3개
2. 테일 키워드(tailKeywords): 구체적인 롱테일 검색어 3개
3. 추천 제목(titles): 네이버 블로그 상위노출에 유리한 매력적인 제목 5개
   - 제목에 메인 키워드를 자연스럽게 포함
   - 궁금증 유발, 숫자 활용, 솔직 후기 톤 등 다양하게
   - 네이버 블로그에서 실제로 클릭하고 싶은 제목으로
   - 30자 이내로 작성
${hasExtraContext ? `4. 매우 중요: "글 작성 의도/기획"이나 "이미지 분석 결과"가 있으면 반드시 그 내용을 중심으로 키워드와 제목을 생성하세요.
   - 이미지에서 발견된 텍스트, 브랜드, 인물, 상품 등을 키워드와 제목에 적극 반영하세요.
   - 업체 정보는 보조적으로 활용하고, 이미지와 기획 의도가 핵심입니다.` : ''}`;

    const model = 'gemini-2.5-flash';
    const MAX_RETRIES = 3;
    let lastError = '';

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, attempt * 3000));
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (response.status === 429) {
          lastError = 'API 요청 한도 초과';
          continue;
        }

        const data = await response.json();

        if (data.error) {
          lastError = data.error.message || JSON.stringify(data.error);
          if (lastError.includes('quota') || lastError.includes('rate')) continue;
          break;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = '응답이 비어있습니다';
          break;
        }

        // JSON 파싱
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          lastError = 'JSON 파싱 실패';
          break;
        }

        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          subKeywords: result.subKeywords || [],
          tailKeywords: result.tailKeywords || [],
          titles: result.titles || [],
        });
      } catch (e) {
        lastError = e instanceof Error ? e.message : '알 수 없는 오류';
        break;
      }
    }

    return NextResponse.json({ error: `키워드 생성 실패: ${lastError}` }, { status: 500 });
  } catch (error) {
    console.error('Keyword generation error:', error);
    return NextResponse.json({ error: '키워드 생성 중 오류가 발생했습니다' }, { status: 500 });
  }
}
