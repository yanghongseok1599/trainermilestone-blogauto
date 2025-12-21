import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, image, category, businessInfo, context } = await request.json();

    // 업체 정보 컨텍스트 생성
    const businessContext = businessInfo ? `
업체 정보:
- 업체명: ${businessInfo.businessName || '미입력'}
- 메인키워드: ${businessInfo.mainKeyword || '미입력'}
- 타겟고객: ${businessInfo.targetAudience || '미입력'}
- 핵심차별점: ${businessInfo.uniquePoint || '미입력'}

위 업체 정보를 참고하여 이 업체의 블로그에 맞는 분석을 해주세요.` : '';

    const userContext = context ? `\n\n추가 참고 정보:\n${context}` : '';

    const prompt = `이 이미지를 분석하여 ${category} 블로그 포스팅에 활용할 정보를 추출해주세요.
${businessContext}${userContext}

다음 형식으로 응답해주세요:
1. 이미지 유형: (시설사진/운동사진/인물사진/전후비교/자격증 취득/전문성 인증 등)
2. 주요 객체: (보이는 주요 사물, 기구, 인물, 자격증, 수료증 등)
3. 분위기/톤: (밝음/어두움, 전문적/친근함, 신뢰감/권위 등)
4. 추천 활용 위치: (첫문단/시설소개/프로그램소개/후기섹션/트레이너 소개/강점 강조 등)
5. 매칭 텍스트 제안: (이 사진과 함께 쓰면 좋을 문장 2-3개)
6. 문맥 일치도 체크포인트: (이 사진으로 증명할 수 있는 주장)

중요: 마크다운 문법(#, **, -, * 등)과 이모지는 절대 사용하지 마세요. 순수 텍스트로만 응답하세요.`;

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
                contents: [{
                  parts: [
                    { text: prompt },
                    { inline_data: { mime_type: image.mimeType, data: image.data } }
                  ]
                }]
              })
            }
          );

          const data = await response.json();

          if (data.error) {
            lastError = data.error.message || JSON.stringify(data.error);
            if (!lastError.includes('quota')) {
              console.error(`Gemini analyze ${apiVersion}/${model} error:`, lastError);
            }
            continue;
          }

          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            console.log(`Analyze success with ${apiVersion}/${model}`);
            return NextResponse.json({ analysis: text });
          }
        } catch (modelError) {
          console.error(`Gemini analyze ${apiVersion}/${model} fetch error:`, modelError);
          continue;
        }
      }
    }

    return NextResponse.json({ error: lastError }, { status: 400 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
