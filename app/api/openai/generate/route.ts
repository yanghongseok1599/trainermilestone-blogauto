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

    const content: { type: string; text?: string; image_url?: { url: string } }[] = [{ type: 'text', text: prompt }];

    if (images && images.length > 0) {
      images.forEach((img: { mimeType: string; data: string }) => {
        content.push({
          type: 'image_url',
          image_url: { url: `data:${img.mimeType};base64,${img.data}` }
        });
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content }],
        max_tokens: 8000,
        temperature: 0.8
      })
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const rawText = data.choices?.[0]?.message?.content || '';
    // 마크다운 및 금지 패턴 후처리 제거
    const cleanedText = cleanMarkdownAndForbiddenPatterns(rawText);
    return NextResponse.json({ content: cleanedText });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
