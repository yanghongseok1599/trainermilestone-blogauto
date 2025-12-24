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
    const { apiKey, prompt, images } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 필요합니다' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: '프롬프트가 필요합니다' }, { status: 400 });
    }

    const contents: { parts: unknown[] }[] = [{
      parts: [{ text: prompt }]
    }];

    // Add images if present
    if (images && images.length > 0) {
      images.forEach((img: { mimeType: string; data: string }) => {
        contents[0].parts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.data
          }
        });
      });
    }

    // Free tier: v1beta only, use flash models with better quota
    const apiVersions = ['v1beta'];
    const models = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-2.0-flash-lite'
    ];
    let lastError = '';

    for (const apiVersion of apiVersions) {
      for (const model of models) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents,
                generationConfig: {
                  temperature: 0.8,
                  maxOutputTokens: 8192
                }
              })
            }
          );

          const data = await response.json();

          if (data.error) {
            lastError = data.error.message || JSON.stringify(data.error);
            // Don't log quota errors repeatedly
            if (!lastError.includes('quota')) {
              console.error(`Gemini ${apiVersion}/${model} error:`, lastError);
            }
            continue; // Try next model/version
          }

          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (rawText) {
            console.log(`Success with ${apiVersion}/${model}`);
            // 마크다운 및 금지 패턴 후처리 제거
            const cleanedText = cleanMarkdownAndForbiddenPatterns(rawText);
            return NextResponse.json({ content: cleanedText });
          }
        } catch (modelError) {
          console.error(`Gemini ${apiVersion}/${model} fetch error:`, modelError);
          continue;
        }
      }
    }

    return NextResponse.json({ error: `생성 실패: ${lastError}` }, { status: 400 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gemini API error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
