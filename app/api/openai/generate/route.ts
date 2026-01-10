import { NextRequest, NextResponse } from 'next/server';

// thinking 블록을 제거하는 함수 (OpenAI API 에러 방지)
function removeThinkingBlocks(messages: any[]): any[] {
  return messages.map((msg) => {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      // content가 배열인 경우 thinking 블록 제거
      const filteredContent = msg.content.filter(
        (block: any) => block.type !== 'thinking' && block.type !== 'redacted_thinking'
      );
      return { ...msg, content: filteredContent };
    }
    return msg;
  });
}

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
    const { apiKey, prompt, images, messages: previousMessages, ragContext } = await request.json();

    let messages: any[];

    // RAG 컨텍스트가 있는 경우 시스템 메시지로 추가
    const systemMessage = ragContext
      ? {
          role: 'system',
          content: `당신은 SEO 최적화된 피트니스/헬스 블로그 글을 작성하는 전문가입니다.

${ragContext}

위 참고 자료를 바탕으로 유사한 스타일과 구조로 글을 작성하되, 표절이 아닌 새롭고 독창적인 콘텐츠를 만들어주세요.`,
        }
      : null;

    // 이전 메시지가 있는 경우 (대화형 요청)
    if (previousMessages && Array.isArray(previousMessages) && previousMessages.length > 0) {
      // thinking 블록 제거
      messages = removeThinkingBlocks(previousMessages);

      // 시스템 메시지가 있으면 맨 앞에 추가
      if (systemMessage && !messages.some((m) => m.role === 'system')) {
        messages.unshift(systemMessage);
      }

      // 새로운 사용자 메시지 추가
      const content: { type: string; text?: string; image_url?: { url: string } }[] = [{ type: 'text', text: prompt }];

      if (images && images.length > 0) {
        images.forEach((img: { mimeType: string; data: string }) => {
          content.push({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.data}` }
          });
        });
      }

      messages.push({ role: 'user', content });
    } else {
      // 단일 요청 (기존 방식)
      const content: { type: string; text?: string; image_url?: { url: string } }[] = [{ type: 'text', text: prompt }];

      if (images && images.length > 0) {
        images.forEach((img: { mimeType: string; data: string }) => {
          content.push({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.data}` }
          });
        });
      }

      // 시스템 메시지가 있으면 맨 앞에 추가
      messages = systemMessage
        ? [systemMessage, { role: 'user', content }]
        : [{ role: 'user', content }];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 8000,
        temperature: 0.8
      })
    });

    const data = await response.json();

    if (data.error) {
      // thinking 블록 관련 에러인 경우 더 명확한 메시지 제공
      if (data.error.message && (data.error.message.includes('thinking') || data.error.message.includes('redacted_thinking'))) {
        return NextResponse.json({ 
          error: '이전 메시지에 thinking 블록이 포함되어 있어 수정할 수 없습니다. 새로운 대화를 시작해주세요.' 
        }, { status: 400 });
      }
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
