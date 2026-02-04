import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { checkAndIncrementTokenUsageServer } from '@/lib/server-usage';

// 마크다운 및 금지 패턴 자동 제거 함수
function cleanMarkdownAndForbiddenPatterns(text: string): string {
  let cleaned = text;

  // ** 볼드 마크다운 제거 (내용 유지)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');

  // __ 언더스코어 마크다운 제거
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');

  // # 헤딩 마크다운 제거 (줄 시작 부분)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // 남은 * 단일 마크다운 제거
  cleaned = cleaned.replace(/\*([^*\n]+)\*/g, '$1');

  // 영어 괄호 레이블 제거
  cleaned = cleaned.replace(/\s*\(Fact\)/gi, '');
  cleaned = cleaned.replace(/\s*\(fact\)/gi, '');
  cleaned = cleaned.replace(/\s*\(F\)/g, '');
  cleaned = cleaned.replace(/\s*\(Interpretation\)/gi, '');
  cleaned = cleaned.replace(/\s*\(interpretation\)/gi, '');
  cleaned = cleaned.replace(/\s*\(I\)/g, '');
  cleaned = cleaned.replace(/\s*\(Real\)/gi, '');
  cleaned = cleaned.replace(/\s*\(real\)/gi, '');
  cleaned = cleaned.replace(/\s*\(R\)/g, '');
  cleaned = cleaned.replace(/\s*\(Experience\)/gi, '');
  cleaned = cleaned.replace(/\s*\(experience\)/gi, '');
  cleaned = cleaned.replace(/\s*\(E\)/g, '');
  cleaned = cleaned.replace(/\s*\(R&E\)/gi, '');
  cleaned = cleaned.replace(/\s*\(F\+I\)/gi, '');
  cleaned = cleaned.replace(/\s*\(Real & Experience\)/gi, '');
  cleaned = cleaned.replace(/\s*\(Fact\+Interpretation\)/gi, '');

  // 이모지 제거
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{2600}-\u{26FF}]/gu, '');
  cleaned = cleaned.replace(/[\u{2700}-\u{27BF}]/gu, '');

  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, images, ragContext, liteMode, optimizedMode, apiKey: clientApiKey } = await request.json();

    const useSiteApi = !clientApiKey;
    const siteApiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
    ].filter((k): k is string => !!k?.trim()).map(k => k.trim());
    const apiKeys = clientApiKey ? [clientApiKey.trim()] : siteApiKeys;
    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: '프롬프트가 필요합니다' }, { status: 400 });
    }

    // 사이트 API 사용 시 인증 + 토큰 한도 사전 체크
    let authenticatedUserId: string | null = null;
    if (useSiteApi) {
      const authResult = await authenticateRequest(request, { userId: undefined });
      if ('error' in authResult) return authResult.error;
      authenticatedUserId = authResult.userId;

      // 예상 토큰(프롬프트 길이 기반) 사전 체크 - 실제 사용량은 응답 후 기록
      const estimatedInputTokens = Math.ceil(prompt.length / 2);
      const preCheck = await checkAndIncrementTokenUsageServer(authenticatedUserId, 0);
      if (!preCheck.allowed) {
        return NextResponse.json({ error: preCheck.reason }, { status: 429 });
      }
    }

    // 토큰 절약 모드 결정 (liteMode > optimizedMode > 일반)
    const isTokenSavingMode = liteMode || optimizedMode;

    // RAG 컨텍스트가 있는 경우 프롬프트에 추가 (토큰 절약 모드에서는 스킵)
    let enhancedPrompt = prompt;
    if (ragContext && !isTokenSavingMode) {
      enhancedPrompt = `당신은 SEO 최적화된 피트니스/헬스 블로그 글을 작성하는 전문가입니다.

${ragContext}

위 참고 자료를 바탕으로 유사한 스타일과 구조로 글을 작성하되, 표절이 아닌 새롭고 독창적인 콘텐츠를 만들어주세요.

---

${prompt}`;
    }

    const contents: { parts: unknown[] }[] = [{
      parts: [{ text: enhancedPrompt }]
    }];

    // Add images if present (토큰 절약 모드에서는 이미지도 스킵)
    if (images && images.length > 0 && !isTokenSavingMode) {
      images.forEach((img: { mimeType: string; data: string }) => {
        contents[0].parts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.data
          }
        });
      });
    }

    // 출력 토큰 설정 (라이트: 4096, 최적화: 6144, 일반: 8192)
    const maxOutputTokens = liteMode ? 4096 : optimizedMode ? 6144 : 8192;

    const model = 'gemini-2.5-flash';
    let lastError = '';
    let isQuotaError = false;

    console.log(`Generating with liteMode=${liteMode}, optimizedMode=${optimizedMode}, maxOutputTokens=${maxOutputTokens}`);

    for (let i = 0; i < apiKeys.length; i++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKeys[i]}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: liteMode ? 0.7 : 0.8,
                maxOutputTokens
              }
            })
          }
        );

        if (response.status === 429) {
          const errBody = await response.text();
          isQuotaError = true;
          lastError = `API 요청 한도 초과 (${errBody.slice(0, 200)})`;
          console.warn(`Gemini key ${i + 1}/${apiKeys.length} rate limited:`, errBody.slice(0, 300));
          continue;
        }

        if (!response.ok) {
          const errBody = await response.text();
          console.error(`Gemini key ${i + 1} HTTP ${response.status}:`, errBody);
          lastError = `HTTP ${response.status}: ${errBody.slice(0, 200)}`;
          continue;
        }

        const data = await response.json();

        if (data.error) {
          lastError = data.error.message || JSON.stringify(data.error);
          if (lastError.toLowerCase().includes('quota') || lastError.toLowerCase().includes('rate')) {
            isQuotaError = true;
            continue;
          }
          console.error(`Gemini error:`, lastError);
          break;
        }

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (rawText) {
          console.log(`Success with key ${i + 1}/${apiKeys.length}`);

          if (useSiteApi && authenticatedUserId) {
            const estimatedTokens = Math.ceil((prompt.length + rawText.length) / 2);
            await checkAndIncrementTokenUsageServer(authenticatedUserId, estimatedTokens);
          }

          const cleanedText = cleanMarkdownAndForbiddenPatterns(rawText);
          return NextResponse.json({ content: cleanedText });
        }
        break;
      } catch (fetchError) {
        console.error(`Gemini fetch error (key ${i + 1}):`, fetchError);
        lastError = fetchError instanceof Error ? fetchError.message : 'Fetch error';
        continue;
      }
    }

    if (isQuotaError) {
      return NextResponse.json({
        error: 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.'
      }, { status: 429 });
    }

    return NextResponse.json({ error: `생성 실패: ${lastError}` }, { status: 400 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gemini API error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
