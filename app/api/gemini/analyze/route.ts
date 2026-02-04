import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { checkAndIncrementUsageServer } from '@/lib/server-usage';

// JSON 파싱 헬퍼: 모델이 ```json 블록으로 감쌀 경우 처리
function extractJson(text: string): string {
  // ```json ... ``` 블록 추출
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // 첫 번째 { 부터 마지막 } 까지
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) return text.slice(start, end + 1);
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const { image, category, businessInfo, context, apiKey: clientApiKey } = await request.json();

    const useSiteApi = !clientApiKey;

    // 다중 API 키 지원: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3...
    const siteApiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
    ].filter((k): k is string => !!k?.trim());

    const apiKeys = clientApiKey ? [clientApiKey] : siteApiKeys;
    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다' }, { status: 400 });
    }

    // 사이트 API 사용 시 인증 + 이미지 분석 사용량 체크
    if (useSiteApi) {
      const authResult = await authenticateRequest(request, { userId: undefined });
      if ('error' in authResult) return authResult.error;

      const usageCheck = await checkAndIncrementUsageServer(authResult.userId, 'imageAnalysis');
      if (!usageCheck.allowed) {
        return NextResponse.json({ error: usageCheck.reason }, { status: 429 });
      }
    }

    // 업체 정보 컨텍스트 생성
    const businessContext = businessInfo ? `
업체 정보:
- 업체명: ${businessInfo.businessName || '미입력'}
- 메인키워드: ${businessInfo.mainKeyword || '미입력'}
- 타겟고객: ${businessInfo.targetAudience || '미입력'}
- 핵심차별점: ${businessInfo.uniquePoint || '미입력'}

위 업체 정보를 참고하여 이 업체의 블로그에 맞는 분석을 해주세요.` : '';

    const userContext = context ? `\n\n추가 참고 정보:\n${context}` : '';

    const prompt = `이 사진을 보고 아래 JSON 스키마에 맞춰 결과를 출력하세요.
반드시 JSON만 출력하세요. JSON 외의 텍스트, 설명, 마크다운은 절대 포함하지 마세요.
사진에서 직접 보이는 것만 작성하고, 보이지 않는 항목은 null로 두세요.
${businessContext}${userContext}

출력 JSON 스키마:
{
  "placeType": "헬스장|필라테스|PT샵|요가|복싱|사무실|야외|기타" 또는 null,
  "equipment": [{"name": "기구명", "count": 숫자 또는 null}],
  "spaceSize": "좁음|보통|넓음" 또는 null,
  "people": {"exists": true/false, "description": "성별, 연령대, 동작" 또는 null},
  "textFound": [{"raw": "사진에 보이는 텍스트 그대로", "type": "price|sign|certificate|other"}],
  "numbersFound": ["사진에 보이는 숫자/가격 그대로"],
  "certificates": [{"issuer": "발급기관", "name": "자격명", "person": "취득자명"}],
  "brandLogo": ["브랜드명"],
  "mood": {"lighting": "밝음|자연광|어두움|형광등" 또는 null, "cleanliness": "깨끗|보통|지저분" 또는 null, "impression": "한 문장 요약" 또는 null},
  "recommendedSection": "시설소개|프로그램|트레이너소개|가격안내|찾아오는길|회원후기" 또는 null,
  "claimSupport": "이 사진으로 뒷받침할 수 있는 주장 한 문장" 또는 null
}

규칙:
1. 보이지 않는 항목은 null, 빈 배열 []로 처리 (절대 "확인불가" 텍스트 사용 금지)
2. equipment.count는 정확히 셀 수 있을 때만 숫자, 아니면 null
3. textFound.raw는 사진에 보이는 글자를 변형 없이 그대로 옮겨 적기
4. JSON만 출력. 앞뒤 설명 텍스트 금지`;

    const model = 'gemini-2.5-flash';
    let lastError = '';

    // 각 API 키를 한 번씩만 시도 (429 시 다음 키로 전환, 서버에서 재시도 안 함)
    for (let i = 0; i < apiKeys.length; i++) {
      const currentKey = apiKeys[i];
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: image.mimeType, data: image.data } }
                ]
              }],
              generationConfig: {
                temperature: 0.2,
              }
            })
          }
        );

        // 429 → 다음 API 키 시도
        if (response.status === 429) {
          console.warn(`Gemini key ${i + 1}/${apiKeys.length} rate limited (429)`);
          lastError = 'API 요청 한도 초과';
          continue;
        }

        const data = await response.json();

        if (data.error) {
          lastError = data.error.message || JSON.stringify(data.error);
          if (lastError.includes('quota') || lastError.includes('rate')) {
            console.warn(`Gemini key ${i + 1} quota error, trying next key`);
            continue;
          }
          console.error(`Gemini analyze error:`, lastError);
          return NextResponse.json({ error: lastError }, { status: 400 });
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text) {
          console.log(`Analyze success with key ${i + 1}/${apiKeys.length}`);
          try {
            const jsonStr = extractJson(text);
            const analysisJson = JSON.parse(jsonStr);
            return NextResponse.json({ analysis: text, analysisJson });
          } catch {
            return NextResponse.json({ analysis: text });
          }
        }

        lastError = '빈 응답';
        break;
      } catch (fetchError) {
        console.error(`Gemini analyze fetch error (key ${i + 1}):`, fetchError);
        lastError = fetchError instanceof Error ? fetchError.message : 'Fetch error';
        continue;
      }
    }

    // 모든 키 실패 → 429 반환 (클라이언트가 긴 딜레이로 재시도)
    return NextResponse.json(
      { error: lastError || '분석 실패', retryable: true },
      { status: 429 }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
