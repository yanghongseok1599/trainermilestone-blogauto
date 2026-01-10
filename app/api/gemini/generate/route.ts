import { NextRequest, NextResponse } from 'next/server';

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
    const { apiKey, prompt, images, ragContext, liteMode } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 필요합니다' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: '프롬프트가 필요합니다' }, { status: 400 });
    }

    // RAG 컨텍스트가 있는 경우 프롬프트에 추가 (라이트 모드에서는 스킵)
    let enhancedPrompt = prompt;
    if (ragContext && !liteMode) {
      enhancedPrompt = `당신은 SEO 최적화된 피트니스/헬스 블로그 글을 작성하는 전문가입니다.

${ragContext}

위 참고 자료를 바탕으로 유사한 스타일과 구조로 글을 작성하되, 표절이 아닌 새롭고 독창적인 콘텐츠를 만들어주세요.

---

${prompt}`;
    }

    const contents: { parts: unknown[] }[] = [{
      parts: [{ text: enhancedPrompt }]
    }];

    // Add images if present (라이트 모드에서는 이미지도 스킵하여 토큰 절약)
    if (images && images.length > 0 && !liteMode) {
      images.forEach((img: { mimeType: string; data: string }) => {
        contents[0].parts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.data
          }
        });
      });
    }

    // 출력 토큰 설정 (라이트 모드: 4096, 일반 모드: 8192)
    const maxOutputTokens = liteMode ? 4096 : 8192;

    // Free tier models - 할당량이 넉넉한 순서로 배열 (라이트 모드에서는 flash만 사용)
    const models = liteMode
      ? ['gemini-1.5-flash', 'gemini-2.0-flash-exp']
      : ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-pro', 'gemini-2.0-flash-exp'];

    let lastError = '';
    let isQuotaError = false;

    console.log(`Generating with liteMode=${liteMode}, maxOutputTokens=${maxOutputTokens}`);

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: liteMode ? 0.7 : 0.8, // 라이트 모드에서는 더 일관된 출력
                maxOutputTokens
              }
            })
          }
        );

        const data = await response.json();

        if (data.error) {
          lastError = data.error.message || JSON.stringify(data.error);

          // 할당량 초과 에러 감지
          if (lastError.toLowerCase().includes('quota') || lastError.toLowerCase().includes('rate limit')) {
            isQuotaError = true;
          }

          console.error(`Gemini ${model} error:`, lastError);
          continue; // Try next model
        }

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (rawText) {
          console.log(`Success with ${model}`);
          // 마크다운 및 금지 패턴 후처리 제거
          const cleanedText = cleanMarkdownAndForbiddenPatterns(rawText);
          return NextResponse.json({ content: cleanedText });
        }
      } catch (modelError) {
        console.error(`Gemini ${model} fetch error:`, modelError);
        continue;
      }
    }

    // 할당량 초과 시 사용자 친화적 메시지
    if (isQuotaError) {
      return NextResponse.json({
        error: 'API 무료 할당량이 초과되었습니다. 잠시 후 다시 시도하거나, 새로운 API 키를 발급받아 사용해주세요. (Google AI Studio에서 무료 발급 가능)'
      }, { status: 429 });
    }

    return NextResponse.json({ error: `생성 실패: ${lastError}` }, { status: 400 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gemini API error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
