import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { authenticateRequest } from '@/lib/api-auth';
import { checkAndIncrementImageUsage } from '@/lib/server-usage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, useSiteApi, userId, prompt, model = 'gpt-image-1', size = '1024x1024', quality = 'standard' } = body;

    // 사이트 API 또는 사용자 API 키 결정
    let resolvedApiKey = apiKey;
    if (useSiteApi) {
      // 사이트 API 사용 시 인증 + 사용량 체크
      const authResult = await authenticateRequest(request, body);
      if ('error' in authResult) return authResult.error;

      const usageResult = await checkAndIncrementImageUsage(authResult.userId, model);
      if (!usageResult.allowed) {
        return NextResponse.json({ error: usageResult.reason }, { status: 429 });
      }

      resolvedApiKey = process.env.OPENAI_API_KEY;
      if (!resolvedApiKey) {
        return NextResponse.json({ error: '서버 API 키가 설정되지 않았습니다' }, { status: 500 });
      }
    }

    if (!resolvedApiKey) {
      return NextResponse.json({ error: 'API 키가 필요합니다' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: '프롬프트가 필요합니다' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: resolvedApiKey });

    // 모델별 설정
    const validModels = ['gpt-image-1', 'dall-e-3', 'dall-e-2'];
    const selectedModel = validModels.includes(model) ? model : 'gpt-image-1';

    // gpt-image-1과 dall-e-3/dall-e-2는 다른 파라미터를 사용
    const generateParams: any = {
      model: selectedModel,
      prompt: prompt,
      n: 1,
    };

    // DALL-E 2/3는 size와 quality 파라미터 지원
    if (selectedModel === 'dall-e-3') {
      generateParams.size = size as '1024x1024' | '1792x1024' | '1024x1792';
      generateParams.quality = quality as 'standard' | 'hd';
    } else if (selectedModel === 'dall-e-2') {
      // DALL-E 2는 다른 사이즈 옵션
      const validDalle2Sizes = ['256x256', '512x512', '1024x1024'];
      generateParams.size = validDalle2Sizes.includes(size) ? size : '1024x1024';
    }
    // gpt-image-1은 기본 파라미터로만 동작

    const response = await openai.images.generate(generateParams);

    const imageData = response.data?.[0];
    const imageUrl = imageData?.url || (imageData as any)?.b64_json;
    const revisedPrompt = imageData?.revised_prompt;

    // b64_json인 경우 data URL로 변환
    let finalImageUrl = imageUrl;
    if ((imageData as any)?.b64_json) {
      finalImageUrl = `data:image/png;base64,${(imageData as any).b64_json}`;
    }

    if (!finalImageUrl) {
      return NextResponse.json({ error: '이미지 생성에 실패했습니다' }, { status: 500 });
    }

    return NextResponse.json({
      imageUrl: finalImageUrl,
      revisedPrompt,
      model: selectedModel,
    });

  } catch (error) {
    console.error('Image generation error:', error);

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json({ error: '유효하지 않은 API 키입니다' }, { status: 401 });
      }
      if (error.status === 429) {
        return NextResponse.json({ error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
      }
      if (error.status === 400) {
        return NextResponse.json({ error: '프롬프트가 콘텐츠 정책을 위반했습니다. 다른 프롬프트를 시도해주세요.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }

    return NextResponse.json(
      { error: '이미지 생성 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
