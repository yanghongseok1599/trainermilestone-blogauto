import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request, { userId: undefined });
    if ('error' in authResult) return authResult.error;

    const { userId, samples } = await request.json();

    if (!samples || samples.length === 0) {
      return NextResponse.json({ error: '분석할 글이 없습니다' }, { status: 400 });
    }

    // 사이트 Gemini API 키 사용
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다' }, { status: 500 });
    }

    // 글 내용 결합 (최대 5개, 각 2000자)
    const combinedText = samples
      .slice(0, 5)
      .map((s: { title: string; content: string }, i: number) =>
        `[글 ${i + 1}] ${s.title}\n${s.content.slice(0, 2000)}`
      )
      .join('\n\n---\n\n');

    const analysisPrompt = `아래는 한 사람이 직접 쓴 블로그 글 ${samples.length}개입니다.
이 사람의 고유한 글쓰기 스타일을 분석해서, AI가 이 사람처럼 글을 쓸 수 있도록 문체 프로필을 만들어주세요.

분석 항목:
1. 말투 특징 (경어/반말 비율, 특유의 어미, 종결어)
2. 문장 스타일 (길이, 리듬감, 구어체/문어체 비율)
3. 자주 쓰는 표현이나 습관적 단어
4. 도입부 패턴 (질문형, 일화형, 직설형 등)
5. 스토리텔링 구조 (감정→정보, 정보→감정, 시간순 등)
6. 감정 표현 방식 (직접적/은유적)
7. 독자에게 말을 거는 방식

400자 이내로 핵심 특징만 간결하게 정리해주세요.
"~하세요" 같은 지시형이 아니라 "~한다", "~이다" 같은 서술형으로 작성해주세요.

---

${combinedText}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Gemini API error:', data.error);
      return NextResponse.json({ error: '문체 분석 중 오류가 발생했습니다' }, { status: 500 });
    }

    const styleSummary = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!styleSummary) {
      return NextResponse.json({ error: '분석 결과를 받지 못했습니다' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      styleSummary: styleSummary.trim(),
      sampleCount: samples.length,
    });
  } catch (error) {
    console.error('Writing style analysis error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
