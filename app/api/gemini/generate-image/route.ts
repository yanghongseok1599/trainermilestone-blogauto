import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateRequest } from '@/lib/api-auth';
import { checkAndIncrementImageUsage } from '@/lib/server-usage';

// Imagen 모델 목록
const IMAGEN_MODELS = [
  'imagen-3.0-generate-002',
  'imagen-3.0-generate-001',
  'imagen-3.0-fast-generate-001',
];

// Gemini 이미지 생성 모델 목록
const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, useSiteApi, userId, prompt, model = 'gemini-2.5-flash-image' } = body;

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

      resolvedApiKey = process.env.GEMINI_API_KEY;
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

    const genAI = new GoogleGenerativeAI(resolvedApiKey);

    // Imagen 모델 사용
    if (IMAGEN_MODELS.includes(model)) {
      return await generateWithImagen(genAI, resolvedApiKey, prompt, model);
    }

    // Gemini 이미지 생성 모델 사용
    return await generateWithGemini(genAI, prompt, model);

  } catch (error) {
    console.error('Gemini/Imagen image generation error:', error);

    const errorMessage = error instanceof Error ? error.message : '이미지 생성 중 오류가 발생했습니다';

    // Handle specific error cases
    if (errorMessage.includes('API key') || errorMessage.includes('API_KEY')) {
      return NextResponse.json({ error: '유효하지 않은 API 키입니다' }, { status: 401 });
    }
    if (errorMessage.includes('quota') || errorMessage.includes('rate') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({ error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
    }
    if (errorMessage.includes('safety') || errorMessage.includes('blocked') || errorMessage.includes('SAFETY')) {
      return NextResponse.json({ error: '콘텐츠 정책으로 인해 이미지를 생성할 수 없습니다. 다른 프롬프트를 시도해주세요.' }, { status: 400 });
    }
    if (errorMessage.includes('not supported') || errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND')) {
      return NextResponse.json({
        error: '선택한 모델이 현재 지원되지 않습니다. 다른 모델을 선택해주세요.'
      }, { status: 400 });
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Gemini 이미지 생성
async function generateWithGemini(genAI: GoogleGenerativeAI, prompt: string, modelName: string) {
  // Gemini 2.5 Flash with image generation
  const model = genAI.getGenerativeModel({
    model: modelName,
  });

  // Request image generation
  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{
        text: `Generate a high-quality, professional photograph based on this description. Create a realistic image suitable for a blog post.\n\nDescription: ${prompt}`
      }]
    }],
    generationConfig: {
      responseModalities: ['image', 'text'],
    } as any,
  });

  const response = result.response;
  const parts = response.candidates?.[0]?.content?.parts;

  if (!parts || parts.length === 0) {
    return NextResponse.json({ error: '이미지 생성에 실패했습니다' }, { status: 500 });
  }

  // Find inline data (image) in response
  for (const part of parts) {
    if ('inlineData' in part && part.inlineData) {
      const imageData = part.inlineData;
      const base64Image = imageData.data;
      const mimeType = imageData.mimeType || 'image/png';

      // Return base64 data URL
      const imageUrl = `data:${mimeType};base64,${base64Image}`;

      return NextResponse.json({
        imageUrl,
        revisedPrompt: prompt,
        model: modelName,
      });
    }
  }

  // If no image found in response
  return NextResponse.json({
    error: '이미지를 생성할 수 없습니다. Gemini 모델이 이미지 생성을 지원하지 않을 수 있습니다.',
  }, { status: 500 });
}

// Imagen 이미지 생성 (REST API 사용)
async function generateWithImagen(genAI: GoogleGenerativeAI, apiKey: string, prompt: string, modelName: string) {
  // Imagen API endpoint
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

  const requestBody = {
    instances: [{
      prompt: `Generate a high-quality, professional photograph based on this description. Create a realistic image suitable for a blog post.\n\nDescription: ${prompt}`
    }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '1:1',
      personGeneration: 'allow_adult',
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `Imagen API 오류 (${response.status})`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const predictions = data.predictions;

  if (!predictions || predictions.length === 0) {
    return NextResponse.json({ error: 'Imagen 이미지 생성에 실패했습니다' }, { status: 500 });
  }

  // Imagen returns base64 encoded image
  const imageBase64 = predictions[0].bytesBase64Encoded;
  if (!imageBase64) {
    return NextResponse.json({ error: '이미지 데이터를 찾을 수 없습니다' }, { status: 500 });
  }

  const imageUrl = `data:image/png;base64,${imageBase64}`;

  return NextResponse.json({
    imageUrl,
    revisedPrompt: prompt,
    model: modelName,
  });
}
