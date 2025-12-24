import { NextRequest, NextResponse } from 'next/server';

// 세그멘테이션 API - 인물 윤곽선 추출
// 현재는 클라이언트 사이드 Canvas 처리를 사용
// 추후 remove.bg API 또는 Replicate SAM 모델 연동 가능

export async function POST(request: NextRequest) {
  try {
    const { image, outlineColor, outlineThickness, apiKey, provider } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: '이미지가 필요합니다' },
        { status: 400 }
      );
    }

    // API 키가 제공된 경우 외부 AI 서비스 사용
    if (apiKey && provider === 'removebg') {
      // remove.bg API 호출
      const processedImage = await processWithRemoveBg(image, apiKey, outlineColor, outlineThickness);
      return NextResponse.json({ processedImage });
    }

    if (apiKey && provider === 'replicate') {
      // Replicate SAM 모델 호출
      const processedImage = await processWithReplicate(image, apiKey, outlineColor, outlineThickness);
      return NextResponse.json({ processedImage });
    }

    // API 키가 없는 경우, 서버에서 처리하지 않고 클라이언트에서 처리하도록 안내
    // 클라이언트 사이드 Canvas 처리가 더 빠르고 무료
    return NextResponse.json({
      error: 'API 키가 필요합니다',
      message: '아웃라인 처리는 클라이언트에서 수행됩니다',
      useClientSide: true
    }, { status: 200 });

  } catch (error) {
    console.error('Segmentation error:', error);
    return NextResponse.json(
      { error: '세그멘테이션 처리 중 오류가 발생했습니다', useClientSide: true },
      { status: 500 }
    );
  }
}

// remove.bg API를 사용한 배경 제거 및 아웃라인 생성
async function processWithRemoveBg(
  imageBase64: string,
  apiKey: string,
  outlineColor: string,
  outlineThickness: number
): Promise<string> {
  // Base64에서 이미지 데이터 추출
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const formData = new FormData();

  // Base64를 Blob으로 변환
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  formData.append('image_file', blob, 'image.png');
  formData.append('size', 'auto');
  formData.append('format', 'png');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`remove.bg API 오류: ${response.status}`);
  }

  const resultBuffer = await response.arrayBuffer();
  const resultBase64 = Buffer.from(resultBuffer).toString('base64');

  // 배경이 제거된 이미지에 아웃라인 추가 (서버 사이드에서는 sharp 등 사용 가능)
  // 현재는 클라이언트에서 처리하도록 원본 배경 제거 이미지 반환
  return `data:image/png;base64,${resultBase64}`;
}

// Replicate SAM 모델을 사용한 세그멘테이션
async function processWithReplicate(
  imageBase64: string,
  apiKey: string,
  outlineColor: string,
  outlineThickness: number
): Promise<string> {
  // Replicate API 호출
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // SAM (Segment Anything Model) 버전
      version: 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
      input: {
        image: imageBase64,
        // 전체 이미지 세그멘테이션
        multimask_output: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Replicate API 오류: ${response.status}`);
  }

  const prediction = await response.json();

  // 폴링하여 결과 대기
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const pollResponse = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      {
        headers: {
          'Authorization': `Token ${apiKey}`,
        },
      }
    );
    result = await pollResponse.json();
  }

  if (result.status === 'failed') {
    throw new Error('세그멘테이션 실패');
  }

  // 결과 마스크를 사용하여 아웃라인 생성
  // Replicate 결과는 URL로 반환되므로 추가 처리 필요
  return result.output;
}
